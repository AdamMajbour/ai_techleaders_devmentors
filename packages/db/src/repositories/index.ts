// Repository layer for database access.
// Repositories receive an EntityManager instead of reaching for the global one:
// MikroORM forbids using the global EM for context-specific work, so callers pass
// a fork (`orm.em.fork()`) per request / script / test.
import { LockMode, type EntityManager, type RequiredEntityData } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import {
  User,
  Article,
  ApprovalRequest,
  Invitation,
  LoginToken,
  MentorProfile,
  Booking,
  Payment,
  Message,
  Note,
  LedgerEntry,
  VaultAnswer,
  VaultAnswerCitation,
  VaultAnswerReview,
  AvailabilitySlot,
  TermsVersion,
  TermsReview,
  TermsAcceptance,
} from '../entities';
import {
  ExclusionConstraintViolationError,
  StatusTransitionConflictError,
  PendingApprovalConflictError,
  isExclusionConstraintViolation,
  isUniqueConstraintViolation,
} from '../errors';
import { transitionStatus } from './transition';
export { transitionStatus };
export type { TransitionActor, TransitionStatusInput } from './transition';
export { MikroOrmUnitOfWork } from './unit-of-work';
export { claimLease, releaseLease, type ClaimLeaseInput, type ReleaseLeaseInput, type LeasePredicate } from './lease';
export { PendingApprovalConflictError };

export class TermsRepository {
  constructor(private readonly em: EntityManager) {}

  async current(kind: 'seeker' | 'mentor'): Promise<TermsVersion | null> {
    return this.em.findOne(TermsVersion, { kind, status: 'published' });
  }

  async byId(id: string): Promise<TermsVersion | null> {
    return this.em.findOne(TermsVersion, { id });
  }

  async createDraft(data: Pick<TermsVersion, 'kind' | 'version' | 'body' | 'sha256' | 'createdBy'>): Promise<TermsVersion> {
    const row = this.em.create(TermsVersion, { ...data, status: 'draft', publishedAt: null });
    this.em.persist(row);
    await this.em.flush();
    return row;
  }

  async publish(id: string, at: Date): Promise<TermsVersion | null> {
    const row = await this.em.findOne(TermsVersion, { id, status: 'draft' });
    if (!row) return null;
    const current = await this.current(row.kind as 'seeker' | 'mentor');
    if (current) {
      current.status = 'archived';
      await this.em.flush();
    }
    row.status = 'published';
    row.publishedAt = at;
    await this.em.flush();
    return row;
  }

  async recordReview(data: Pick<TermsReview, 'termsVersionId' | 'sha256' | 'reviewer' | 'scopes' | 'outcome' | 'reviewedAt' | 'note' | 'recordedBy'>): Promise<TermsReview> {
    const row = this.em.create(TermsReview, data);
    this.em.persist(row);
    await this.em.flush();
    return row;
  }

  async hasPassingReview(version: TermsVersion): Promise<boolean> {
    return (await this.em.count(TermsReview, {
      termsVersionId: version.id, sha256: version.sha256, outcome: 'pass',
    })) > 0;
  }

  async accept(data: Pick<TermsAcceptance, 'userId' | 'termsVersionId' | 'sha256' | 'kind' | 'acceptedAt' | 'subjectType' | 'subjectId'>): Promise<void> {
    const existing = await this.em.findOne(TermsAcceptance, {
      userId: data.userId, termsVersionId: data.termsVersionId,
      subjectType: data.subjectType, subjectId: data.subjectId,
    });
    if (existing) return;
    const row = this.em.create(TermsAcceptance, data);
    this.em.persist(row);
    await this.em.flush();
  }

  async hasAccepted(userId: string, version: TermsVersion): Promise<boolean> {
    return (await this.em.count(TermsAcceptance, {
      userId, termsVersionId: version.id, sha256: version.sha256, kind: version.kind,
      subjectType: null, subjectId: null,
    })) > 0;
  }

  async acceptances(userId: string, kind: 'seeker' | 'mentor'): Promise<TermsAcceptance[]> {
    return this.em.find(TermsAcceptance, { userId, kind }, { orderBy: { acceptedAt: 'desc' }, limit: 25 });
  }
}

export interface RetentionResult {
  messages: number;
  bookingQuestions: number;
  notes: number;
  vaultQuestions: number;
  vaultAnswers: number;
  citations: number;
  skippedHolds: number;
}

export type RetentionContentType = 'message' | 'booking_question' | 'note' | 'vault_question' | 'vault_answer' | 'citation';

export interface RetentionLegalHoldRecord {
  id: string;
  contentType: RetentionContentType;
  contentId: string;
  reason: string;
  createdBy: string;
  createdAt: Date;
  releasedAt: Date | null;
  releaseReason: string | null;
}

export interface RetentionSweepRunRecord {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt: Date | null;
  limitCount: number;
  processedCount: number;
  skippedHoldCount: number;
  errorCode: string | null;
}

export class RetentionRepository {
  constructor(private readonly em: EntityManager) {}

  async erasePilotContent(limit = 100): Promise<RetentionResult> {
    const connection = this.em.getConnection();
    const context = this.em.getTransactionContext();
    const batchSize = Math.max(1, Math.min(1000, Math.floor(limit)));
    const erase = async (table: string, column: string, contentType: RetentionContentType, replacement: string | null): Promise<number> => {
      const rows = await connection.execute<Array<{ id: string }>>(
        `with batch as (select target."id" from "${table}" target where target."${column}" is not null and target."${column}" <> '' and not exists (select 1 from "retention_legal_holds" hold left join "retention_legal_hold_releases" released_hold on released_hold."hold_id" = hold."id" where hold."content_type" = ? and hold."content_id" = target."id" and released_hold."id" is null) limit ?) update "${table}" target set "${column}" = ? from batch where target."id" = batch."id" returning target."id"`,
        [contentType, batchSize, replacement], 'all', context,
      );
      return Array.isArray(rows) ? rows.length : 0;
    };
    const citations = await connection.execute<Array<{ id: string }>>(
      'with batch as (select target."id" from "vault_answer_citations" target where not exists (select 1 from "retention_legal_holds" hold left join "retention_legal_hold_releases" released_hold on released_hold."hold_id" = hold."id" where hold."content_type" = ? and hold."content_id" = target."id" and released_hold."id" is null) limit ?) delete from "vault_answer_citations" target using batch where target."id" = batch."id" returning target."id"', ['citation', batchSize], 'all', context,
    );
    const holds = await connection.execute<{ count: number | string }>('select count(*)::integer as count from "retention_legal_holds" hold left join "retention_legal_hold_releases" released_hold on released_hold."hold_id" = hold."id" where released_hold."id" is null', [], 'get', context);
    return {
      messages: await erase('messages', 'body', 'message', ''),
      bookingQuestions: await erase('bookings', 'question', 'booking_question', ''),
      notes: await erase('notes', 'body', 'note', ''),
      vaultQuestions: await erase('vault_answers', 'question', 'vault_question', ''),
      vaultAnswers: await erase('vault_answers', 'answer_text', 'vault_answer', null),
      citations: Array.isArray(citations) ? citations.length : 0,
      skippedHolds: Number(holds?.count ?? 0),
    };
  }

  async addLegalHold(input: { contentType: RetentionContentType; contentId: string; reason: string; createdBy: string; at: Date }): Promise<RetentionLegalHoldRecord> {
    const tableByType: Record<RetentionContentType, string> = { message: 'messages', booking_question: 'bookings', note: 'notes', vault_question: 'vault_answers', vault_answer: 'vault_answers', citation: 'vault_answer_citations' };
    const table = tableByType[input.contentType];
    const target = await this.em.getConnection().execute<{ id: string }>(`select "id" from "${table}" where "id" = ?`, [input.contentId], 'get');
    if (!target) throw new StatusTransitionConflictError('The selected retention record does not exist.');
    const active = await this.em.getConnection().execute<{ id: string }>('select hold."id" from "retention_legal_holds" hold left join "retention_legal_hold_releases" released on released."hold_id" = hold."id" where hold."content_type" = ? and hold."content_id" = ? and released."id" is null', [input.contentType, input.contentId], 'get');
    if (active) throw new StatusTransitionConflictError('An active legal hold already exists for this record.');
    const id = randomUUID();
    await this.em.getConnection().execute('insert into "retention_legal_holds" ("id", "content_type", "content_id", "reason", "created_by", "created_at") values (?, ?, ?, ?, ?, ?)', [id, input.contentType, input.contentId, input.reason, input.createdBy, input.at]);
    return { id, contentType: input.contentType, contentId: input.contentId, reason: input.reason, createdBy: input.createdBy, createdAt: input.at, releasedAt: null, releaseReason: null };
  }

  async releaseLegalHold(input: { id: string; reason: string; releasedBy: string; at: Date }): Promise<boolean> {
    const existing = await this.em.getConnection().execute<{ id: string }>('select "id" from "retention_legal_holds" where "id" = ? and not exists (select 1 from "retention_legal_hold_releases" where "hold_id" = ?)', [input.id, input.id], 'get');
    if (!existing) return false;
    await this.em.getConnection().execute('insert into "retention_legal_hold_releases" ("id", "hold_id", "reason", "released_by", "released_at") values (?, ?, ?, ?, ?)', [randomUUID(), input.id, input.reason, input.releasedBy, input.at]);
    return true;
  }

  async listLegalHolds(): Promise<RetentionLegalHoldRecord[]> {
    const rows = await this.em.getConnection().execute<Array<Record<string, unknown>>>(`select hold."id", hold."content_type" as "contentType", hold."content_id" as "contentId", hold."reason", hold."created_by" as "createdBy", hold."created_at" as "createdAt", released_hold."released_at" as "releasedAt", released_hold."reason" as "releaseReason" from "retention_legal_holds" hold left join "retention_legal_hold_releases" released_hold on released_hold."hold_id" = hold."id" order by hold."created_at" desc`);
    return Array.isArray(rows) ? rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt as string), releasedAt: row.releasedAt ? new Date(row.releasedAt as string) : null })) as unknown as RetentionLegalHoldRecord[] : [];
  }

  async startSweepRun(input: { startedAt: Date; limitCount: number }): Promise<string> {
    const id = randomUUID();
    await this.em.getConnection().execute('insert into "retention_sweep_runs" ("id", "status", "started_at", "limit_count") values (?, \'running\', ?, ?)', [id, input.startedAt, input.limitCount]);
    return id;
  }

  async finishSweepRun(input: { id: string; status: Exclude<RetentionSweepRunRecord['status'], 'running'>; completedAt: Date; processedCount: number; skippedHoldCount: number; errorCode: string | null }): Promise<void> {
    await this.em.getConnection().execute('update "retention_sweep_runs" set "status" = ?, "completed_at" = ?, "processed_count" = ?, "skipped_hold_count" = ?, "error_code" = ? where "id" = ?', [input.status, input.completedAt, input.processedCount, input.skippedHoldCount, input.errorCode, input.id]);
  }

  async listSweepRuns(limit = 20): Promise<RetentionSweepRunRecord[]> {
    const rows = await this.em.getConnection().execute<Array<Record<string, unknown>>>('select "id", "status", "started_at" as "startedAt", "completed_at" as "completedAt", "limit_count" as "limitCount", "processed_count" as "processedCount", "skipped_hold_count" as "skippedHoldCount", "error_code" as "errorCode" from "retention_sweep_runs" order by "started_at" desc limit ?', [Math.max(1, Math.min(100, Math.floor(limit)))], 'all');
    return Array.isArray(rows) ? rows.map((row) => ({ ...row, startedAt: new Date(row.startedAt as string), completedAt: row.completedAt ? new Date(row.completedAt as string) : null, limitCount: Number(row.limitCount), processedCount: Number(row.processedCount), skippedHoldCount: Number(row.skippedHoldCount) })) as unknown as RetentionSweepRunRecord[] : [];
  }
}

export interface PilotMetricRow {
  category: 'session' | 'vault';
  livemode: boolean;
  currency: string;
  uniqueSeekers: number;
  paidCount: number;
  refundedCount: number;
  pendingCount: number;
  grossMinor: number;
  refundedMinor: number;
  releasedCount: number;
  failedCount: number;
  unsuccessfulCount: number;
  mentorCreditsMinor: number;
  paidOutMinor: number;
  medianLandingSeconds: number | null;
  missingAttribution: number;
}

export class PilotMetricsRepository {
  constructor(private readonly em: EntityManager) {}

  async read(input: { from: Date; to: Date }): Promise<PilotMetricRow[]> {
    const rows = await this.em.getConnection().execute<Array<Record<string, unknown>>>(
      `with subjects as (
        select 'session'::text as category, b.seeker_id, b.status as subject_status, p.status as payment_status,
          p.livemode, p.currency, p.amount_minor, p.created_at as occurred_at, b.landed_at,
          (extract(epoch from (p.created_at - b.landed_at)))::integer as landing_seconds
        from payments p join bookings b on b.id = p.booking_id
        where p.created_at >= ? and p.created_at < ?
        union all
        select 'vault', v.seeker_id, v.status, p.status, p.livemode, p.currency, p.amount_minor, p.created_at,
          null::timestamptz, null::integer
        from payments p join vault_answers v on v.id = p.vault_answer_id
        where p.created_at >= ? and p.created_at < ?
      )
      select category, livemode, currency,
        count(distinct seeker_id) filter (where payment_status in ('succeeded', 'refunded') and (category = 'session' or subject_status = 'released'))::integer as "uniqueSeekers",
        count(*) filter (where payment_status in ('succeeded', 'refunded'))::integer as "paidCount",
        count(*) filter (where payment_status = 'refunded')::integer as "refundedCount",
        count(*) filter (where payment_status in ('pending', 'refund_pending'))::integer as "pendingCount",
        coalesce(sum(amount_minor) filter (where payment_status in ('succeeded', 'refunded')), 0)::integer as "grossMinor",
        coalesce(sum(amount_minor) filter (where payment_status = 'refunded'), 0)::integer as "refundedMinor",
        count(*) filter (where category = 'vault' and subject_status = 'released')::integer as "releasedCount",
        count(*) filter (where category = 'vault' and subject_status in ('generation_failed', 'rejected', 'expired'))::integer as "failedCount",
        count(*) filter (where payment_status = 'failed' or subject_status in ('declined', 'expired', 'cancelled', 'generation_failed', 'rejected'))::integer as "unsuccessfulCount",
        case when category = 'vault' then (select coalesce(sum(ledger."amount_minor"), 0)::bigint from "ledger_entries" ledger where ledger."livemode" = subjects.livemode and ledger."currency" = subjects.currency and ledger."source_type" = 'vault_answer' and ledger."created_at" >= ? and ledger."created_at" < ?) else 0 end as "mentorCreditsMinor",
        case when category = 'vault' then (select coalesce(sum(payout."amount_minor"), 0)::bigint from "payout_transfers" payout join "ledger_entries" ledger on ledger."id" = payout."ledger_entry_id" where payout."status" = 'paid' and ledger."livemode" = subjects.livemode and ledger."currency" = subjects.currency and payout."updated_at" >= ? and payout."updated_at" < ?) else 0 end as "paidOutMinor",
        percentile_cont(0.5) within group (order by landing_seconds) filter (where category = 'session' and landing_seconds >= 0) as "medianLandingSeconds",
        count(*) filter (where category = 'session' and landed_at is null)::integer as "missingAttribution"
      from subjects group by category, livemode, currency order by category, livemode, currency`,
      [input.from, input.to, input.from, input.to, input.from, input.to, input.from, input.to], 'all', this.em.getTransactionContext(),
    );
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      ...row,
      uniqueSeekers: Number(row.uniqueSeekers), paidCount: Number(row.paidCount), refundedCount: Number(row.refundedCount),
      pendingCount: Number(row.pendingCount), grossMinor: Number(row.grossMinor), refundedMinor: Number(row.refundedMinor),
      releasedCount: Number(row.releasedCount), failedCount: Number(row.failedCount), unsuccessfulCount: Number(row.unsuccessfulCount),
      mentorCreditsMinor: Number(row.mentorCreditsMinor), paidOutMinor: Number(row.paidOutMinor),
      medianLandingSeconds: row.medianLandingSeconds === null ? null : Number(row.medianLandingSeconds),
      missingAttribution: Number(row.missingAttribution),
    }) as unknown as PilotMetricRow);
  }
}

export interface StripeConnectAccountRecord {
  userId: string;
  stripeAccountId: string;
  country: 'PL';
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  transfersEnabled: boolean;
  checkedAt: Date | null;
}

export interface EligiblePayoutCredit {
  ledgerEntryId: string;
  mentorId: string;
  amountMinor: number;
  currency: string;
}

export interface PayoutTransferRecord {
  id: string;
  ledgerEntryId: string;
  mentorId: string;
  stripeTransferId: string | null;
  amountMinor: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  failureCode: string | null;
  attempts: number;
  idempotencyKey: string;
  initiatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ConnectPayoutRepository {
  constructor(private readonly em: EntityManager) {}

  async connectAccount(userId: string): Promise<StripeConnectAccountRecord | null> {
    const row = await this.em.getConnection().execute<Record<string, unknown>>('select "user_id" as "userId", "stripe_account_id" as "stripeAccountId", "country", "details_submitted" as "detailsSubmitted", "payouts_enabled" as "payoutsEnabled", "transfers_enabled" as "transfersEnabled", "checked_at" as "checkedAt" from "stripe_connect_accounts" where "user_id" = ?', [userId], 'get');
    return row ? { ...row, country: 'PL', checkedAt: row.checkedAt ? new Date(row.checkedAt as string) : null } as unknown as StripeConnectAccountRecord : null;
  }

  async saveConnectAccount(userId: string, stripeAccountId: string, at: Date): Promise<void> {
    await this.em.getConnection().execute('insert into "stripe_connect_accounts" ("user_id", "stripe_account_id", "country", "created_at", "updated_at") values (?, ?, \'PL\', ?, ?) on conflict ("user_id") do nothing', [userId, stripeAccountId, at, at]);
  }

  async updateConnectStatus(input: { userId: string; detailsSubmitted: boolean; payoutsEnabled: boolean; transfersEnabled: boolean; checkedAt: Date }): Promise<void> {
    await this.em.getConnection().execute('update "stripe_connect_accounts" set "details_submitted" = ?, "payouts_enabled" = ?, "transfers_enabled" = ?, "checked_at" = ?, "updated_at" = ? where "user_id" = ?', [input.detailsSubmitted, input.payoutsEnabled, input.transfersEnabled, input.checkedAt, input.checkedAt, input.userId]);
  }

  async eligibleCredits(limit: number): Promise<EligiblePayoutCredit[]> {
    const rows = await this.em.getConnection().execute<Array<Record<string, unknown>>>(`select ledger."id" as "ledgerEntryId", ledger."account_id" as "mentorId", ledger."amount_minor" as "amountMinor", ledger."currency" from "ledger_entries" ledger join "stripe_connect_accounts" account on account."user_id" = ledger."account_id" left join "payout_transfers" payout on payout."ledger_entry_id" = ledger."id" where ledger."livemode" = false and ledger."source_type" = 'vault_answer' and account."details_submitted" = true and account."payouts_enabled" = true and account."transfers_enabled" = true and (payout."id" is null or payout."status" = 'failed' or (payout."status" = 'pending' and payout."stripe_transfer_id" is null)) order by ledger."created_at" asc limit ?`, [Math.max(1, Math.min(100, Math.floor(limit)))], 'all');
    return Array.isArray(rows) ? rows.map((row) => ({ ...row, amountMinor: Number(row.amountMinor) }) as unknown as EligiblePayoutCredit) : [];
  }

  async createPayoutAllocation(input: { credit: EligiblePayoutCredit; initiatedBy: string; at: Date }): Promise<PayoutTransferRecord> {
    const id = randomUUID();
    const idempotencyKey = `devmentor-pilot-credit-${input.credit.ledgerEntryId}`;
    await this.em.getConnection().execute(`insert into "payout_transfers" ("id", "ledger_entry_id", "mentor_id", "amount_minor", "currency", "status", "idempotency_key", "initiated_by", "created_at", "updated_at") values (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?) on conflict ("ledger_entry_id") do nothing`, [id, input.credit.ledgerEntryId, input.credit.mentorId, input.credit.amountMinor, input.credit.currency, idempotencyKey, input.initiatedBy, input.at, input.at]);
    const row = await this.em.getConnection().execute<Record<string, unknown>>('select "id", "ledger_entry_id" as "ledgerEntryId", "mentor_id" as "mentorId", "stripe_transfer_id" as "stripeTransferId", "amount_minor" as "amountMinor", "currency", "status", "failure_code" as "failureCode", "attempts", "idempotency_key" as "idempotencyKey", "initiated_by" as "initiatedBy", "created_at" as "createdAt", "updated_at" as "updatedAt" from "payout_transfers" where "ledger_entry_id" = ?', [input.credit.ledgerEntryId], 'get');
    if (!row) throw new Error('The payout allocation could not be saved.');
    return { ...row, amountMinor: Number(row.amountMinor), attempts: Number(row.attempts), createdAt: new Date(row.createdAt as string), updatedAt: new Date(row.updatedAt as string) } as unknown as PayoutTransferRecord;
  }

  async markPayoutAttempt(input: { id: string; attemptedBy: string; status: 'paid' | 'failed'; stripeTransferId?: string; failureCode?: string; at: Date }): Promise<void> {
    const record = async (em: EntityManager) => {
      const transfer = await em.getConnection().execute<{ id: string }>('select "id" from "payout_transfers" where "id" = ? for update', [input.id], 'get');
      if (!transfer) throw new StatusTransitionConflictError('The payout allocation was not found.');
      await em.getConnection().execute('update "payout_transfers" set "status" = ?, "stripe_transfer_id" = coalesce(?, "stripe_transfer_id"), "failure_code" = ?, "attempts" = "attempts" + 1, "updated_at" = ? where "id" = ?', [input.status, input.stripeTransferId ?? null, input.failureCode ?? null, input.at, input.id]);
      await em.getConnection().execute('insert into "payout_transfer_attempts" ("id", "payout_transfer_id", "attempted_by", "attempted_at", "status", "stripe_transfer_id", "error_code") values (?, ?, ?, ?, ?, ?, ?)', [randomUUID(), input.id, input.attemptedBy, input.at, input.status, input.stripeTransferId ?? null, input.failureCode ?? null]);
    };
    if (this.em.isInTransaction()) await record(this.em);
    else await this.em.transactional(record);
  }

  async payoutsForMentor(mentorId: string): Promise<PayoutTransferRecord[]> {
    const rows = await this.em.getConnection().execute<Array<Record<string, unknown>>>('select "id", "ledger_entry_id" as "ledgerEntryId", "mentor_id" as "mentorId", "stripe_transfer_id" as "stripeTransferId", "amount_minor" as "amountMinor", "currency", "status", "failure_code" as "failureCode", "attempts", "idempotency_key" as "idempotencyKey", "initiated_by" as "initiatedBy", "created_at" as "createdAt", "updated_at" as "updatedAt" from "payout_transfers" where "mentor_id" = ? order by "created_at" desc', [mentorId], 'all');
    return Array.isArray(rows) ? rows.map((row) => ({ ...row, amountMinor: Number(row.amountMinor), attempts: Number(row.attempts), createdAt: new Date(row.createdAt as string), updatedAt: new Date(row.updatedAt as string) })) as unknown as PayoutTransferRecord[] : [];
  }

  async creditSummary(mentorId: string): Promise<{ earnedMinor: number; paidMinor: number }> {
    const row = await this.em.getConnection().execute<{ earnedMinor: number | string; paidMinor: number | string }>(`select coalesce(sum(ledger."amount_minor"), 0)::bigint as "earnedMinor", coalesce(sum(ledger."amount_minor") filter (where payout."status" = 'paid'), 0)::bigint as "paidMinor" from "ledger_entries" ledger left join "payout_transfers" payout on payout."ledger_entry_id" = ledger."id" where ledger."account_id" = ? and ledger."livemode" = false and ledger."source_type" = 'vault_answer'`, [mentorId], 'get');
    return { earnedMinor: Number(row?.earnedMinor ?? 0), paidMinor: Number(row?.paidMinor ?? 0) };
  }

  async allPayouts(limit = 200): Promise<PayoutTransferRecord[]> {
    const rows = await this.em.getConnection().execute<Array<Record<string, unknown>>>('select "id", "ledger_entry_id" as "ledgerEntryId", "mentor_id" as "mentorId", "stripe_transfer_id" as "stripeTransferId", "amount_minor" as "amountMinor", "currency", "status", "failure_code" as "failureCode", "attempts", "idempotency_key" as "idempotencyKey", "initiated_by" as "initiatedBy", "created_at" as "createdAt", "updated_at" as "updatedAt" from "payout_transfers" order by "created_at" desc limit ?', [Math.max(1, Math.min(500, Math.floor(limit)))], 'all');
    return Array.isArray(rows) ? rows.map((row) => ({ ...row, amountMinor: Number(row.amountMinor), attempts: Number(row.attempts), createdAt: new Date(row.createdAt as string), updatedAt: new Date(row.updatedAt as string) })) as unknown as PayoutTransferRecord[] : [];
  }
}

/** `passwordHash` is hidden from serialization, which makes the type system require it; here it is optional. */
export type NewUser = Omit<RequiredEntityData<User>, 'passwordHash'> & { passwordHash?: string | null };

export class UserRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<User | null> {
    return this.em.findOne(User, { id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.em.findOne(User, { email });
  }

  async findByIds(ids: readonly string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.em.find(User, { id: { $in: [...ids] } });
  }

  async findPage(options: { limit: number; offset: number }): Promise<{ items: User[]; total: number }> {
    const [items, total] = await this.em.findAndCount(User, {}, {
      orderBy: { createdAt: 'desc', id: 'asc' },
      limit: options.limit,
      offset: options.offset,
    });
    return { items, total };
  }

  async create(data: NewUser): Promise<User> {
    const user = this.em.create(User, data as RequiredEntityData<User>);
    this.em.persist(user);
    await this.em.flush();
    return user;
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'passwordHash'>> & { passwordHash?: string | null }): Promise<User | null> {
    const user = await this.em.findOne(User, { id });
    if (!user) return null;
    Object.assign(user, data);
    await this.em.flush();
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const user = await this.em.findOne(User, { id });
    if (!user) return false;
    this.em.remove(user);
    await this.em.flush();
    return true;
  }
}

export type NewMentorProfile = Pick<
  MentorProfile,
  'userId' | 'slug' | 'headline' | 'bio' | 'technologies' | 'publicWorkUrl' | 'isListed' | 'lastActiveAt'
> & { githubUrl?: string | null };

export type MentorProfileUpdate = Partial<
  Pick<MentorProfile, 'slug' | 'headline' | 'bio' | 'technologies' | 'publicWorkUrl' | 'githubUrl' | 'isListed' | 'lastActiveAt'>
>;

export class MentorProfileRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<MentorProfile | null> {
    return this.em.findOne(MentorProfile, { id });
  }

  async findByUserId(userId: string): Promise<MentorProfile | null> {
    return this.em.findOne(MentorProfile, { userId });
  }

  async findBySlug(slug: string): Promise<MentorProfile | null> {
    return this.em.findOne(MentorProfile, { slug });
  }

  async findListed(): Promise<MentorProfile[]> {
    return this.em.find(MentorProfile, { isListed: true }, { orderBy: { slug: 'asc' } });
  }

  async create(data: NewMentorProfile): Promise<MentorProfile> {
    const profile = this.em.create(MentorProfile, { ...data, githubUrl: data.githubUrl ?? null });
    this.em.persist(profile);
    await this.em.flush();
    return profile;
  }

  async update(id: string, data: MentorProfileUpdate): Promise<MentorProfile | null> {
    const profile = await this.findById(id);
    if (!profile) return null;
    Object.assign(profile, data);
    await this.em.flush();
    return profile;
  }
}

export type NewBooking = Pick<
  Booking,
  | 'seekerId'
  | 'mentorId'
  | 'question'
  | 'durationMinutes'
  | 'priceMinor'
  | 'currency'
  | 'status'
  | 'source'
  | 'landedAt'
  | 'startsAt'
  | 'endsAt'
> & Partial<Pick<Booking, 'availabilitySlotId'>>;

export type NewPayment = Omit<Pick<
  Payment,
  | 'bookingId'
  | 'provider'
  | 'livemode'
  | 'providerSessionId'
  | 'providerPaymentId'
  | 'amountMinor'
  | 'currency'
  | 'status'
>, 'bookingId'> & { bookingId: string };

export type NewVaultPayment = Omit<NewPayment, 'bookingId'> & { vaultAnswerId: string };

export class BookingRepository {
  constructor(private readonly em: EntityManager) {}

  clearCache(): void {
    this.em.clear();
  }

  async findById(id: string): Promise<Booking | null> {
    return this.em.findOne(Booking, { id });
  }

  async findForParticipant(
    userId: string,
    role?: 'seeker' | 'mentor',
  ): Promise<Booking[]> {
    const where = role === 'seeker'
      ? { seekerId: userId }
      : role === 'mentor'
        ? { mentorId: userId }
        : { $or: [{ seekerId: userId }, { mentorId: userId }] };
    return this.em.find(Booking, where, { orderBy: { createdAt: 'desc', id: 'asc' } });
  }

  async findForSettlement(options: {
    before: Date;
    bookingId?: string;
    participantId?: string;
    role?: 'seeker' | 'mentor';
  }): Promise<Booking[]> {
    const predicates = [
      `((b."status" = 'paid' and exists (
        select 1 from "status_transitions" paid
        where paid."entity_type" = 'Booking' and paid."entity_id" = b."id"
          and paid."to_status" = 'paid' and paid."created_at" <= ?
      )) or (b."status" in ('declined', 'expired') and exists (
        select 1 from "status_transitions" closed
        where closed."entity_type" = 'Booking' and closed."entity_id" = b."id"
          and closed."from_status" = 'paid' and closed."to_status" = b."status"
      )))`,
    ];
    const values: unknown[] = [options.before];

    if (options.bookingId) {
      predicates.push('b."id" = ?');
      values.push(options.bookingId);
    }
    if (options.participantId) {
      const field = options.role === 'seeker'
        ? 'seeker_id'
        : options.role === 'mentor'
          ? 'mentor_id'
          : null;
      if (field) {
        predicates.push(`b."${field}" = ?`);
        values.push(options.participantId);
      } else {
        predicates.push('(b."seeker_id" = ? or b."mentor_id" = ?)');
        values.push(options.participantId, options.participantId);
      }
    }

    const rows = await this.em.getConnection().execute<Array<{ id: string }>>(
      `select b."id" from "bookings" b where ${predicates.join(' and ')} order by b."created_at", b."id"`,
      values,
      'all',
      this.em.getTransactionContext(),
    );
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return this.em.find(Booking, { id: { $in: rows.map((row) => row.id) } });
  }

  async transitionStatus(
    id: string,
    status: 'accepted' | 'declined',
    actorUserId: string,
    patch: Record<string, unknown> = {},
  ): Promise<boolean> {
    try {
      return await transitionStatus(this.em, {
        entityType: 'Booking',
        entityId: id,
        from: ['paid'],
        to: status,
        actor: { kind: 'user', userId: actorUserId },
        patch,
      });
    } catch (error) {
      if (isExclusionConstraintViolation(error)) {
        throw new ExclusionConstraintViolationError();
      }
      throw error;
    }
  }

  async expirePaid(id: string): Promise<boolean> {
    return transitionStatus(this.em, {
      entityType: 'Booking',
      entityId: id,
      from: ['paid'],
      to: 'expired',
      actor: { kind: 'system' },
      ifAlready: true,
    });
  }

  /** Persists the booking and its pending payment together before contacting the gateway. */
  async createWithPayment(
    bookingData: NewBooking,
    paymentData: Omit<NewPayment, 'bookingId'>,
  ): Promise<{ booking: Booking; payment: Payment }> {
    const work = async (transactionalEm: EntityManager) => {
      const booking = transactionalEm.create(Booking, bookingData);
      transactionalEm.persist(booking);
      await transactionalEm.flush();
      const payment = transactionalEm.create(Payment, { ...paymentData, bookingId: booking.id });
      transactionalEm.persist(payment);
      await transactionalEm.flush();
      return { booking, payment };
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  /** A failed checkout is terminal and remains invisible to mentor booking lists. */
  async failCheckout(bookingId: string): Promise<void> {
    await this.em.transactional(async (transactionalEm) => {
      const payment = await transactionalEm.findOne(Payment, { bookingId });
      if (!payment) throw new Error('Pending booking payment was not found.');
      await transitionStatus(transactionalEm, {
        entityType: 'Payment',
        entityId: payment.id,
        from: ['pending'],
        to: 'failed',
        actor: { kind: 'system' },
      });
      await transitionStatus(transactionalEm, {
        entityType: 'Booking',
        entityId: bookingId,
        from: ['pending_payment'],
        to: 'payment_failed',
        actor: { kind: 'system' },
      });
    });
  }
}

export class PaymentRepository {
  constructor(private readonly em: EntityManager) {}

  async findByBookingId(bookingId: string): Promise<Payment | null> {
    return this.em.findOne(Payment, { bookingId });
  }

  async findById(id: string): Promise<Payment | null> {
    return this.em.findOne(Payment, { id });
  }

  async findByVaultAnswerId(vaultAnswerId: string): Promise<Payment | null> {
    return this.em.findOne(Payment, { vaultAnswerId });
  }

  async findBySubject(subjectType: 'booking' | 'vault_answer', subjectId: string): Promise<Payment | null> {
    return subjectType === 'booking'
      ? this.findByBookingId(subjectId)
      : this.findByVaultAnswerId(subjectId);
  }

  transitionRefundStatus(
    id: string,
    from: readonly string[],
    to: string,
    actor: import('./transition').TransitionActor,
  ): Promise<boolean> {
    return transitionStatus(this.em, {
      entityType: 'Payment',
      entityId: id,
      from,
      to,
      actor,
    });
  }

  async setProviderSession(bookingId: string, providerSessionId: string): Promise<Payment | null> {
    const payment = await this.em.findOne(Payment, { bookingId });
    if (!payment) return null;
    payment.providerSessionId = providerSessionId;
    await this.em.flush();
    return payment;
  }

  async setProviderSessionForVaultAnswer(vaultAnswerId: string, providerSessionId: string): Promise<Payment | null> {
    const payment = await this.findByVaultAnswerId(vaultAnswerId);
    if (!payment) return null;
    payment.providerSessionId = providerSessionId;
    await this.em.flush();
    return payment;
  }

  async settleSubjectWebhookEvent(input: {
    subjectType: 'booking' | 'vault_answer';
    subjectId: string;
    providerSessionId: string;
    status: 'succeeded' | 'failed';
    amountMinor: number;
    currency: string;
    expectedAmountMinor: number;
    expectedCurrency: string;
    providerPaymentId?: string;
    livemode?: boolean;
  }): Promise<{ status: 'transitioned' | 'noop' | 'mismatch'; paymentId: string | null; paymentStatus?: string; fields?: string[] }> {
    const run = async (transactionalEm: EntityManager) => {
      const subjectField = input.subjectType === 'booking' ? 'bookingId' : 'vaultAnswerId';
      const payment = await transactionalEm.findOne(
        Payment,
        { [subjectField]: input.subjectId, providerSessionId: input.providerSessionId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!payment) return { status: 'mismatch' as const, paymentId: null, fields: [subjectField, 'providerSessionId'] };
      if (input.status === 'succeeded') {
        const fields: string[] = [];
        if (payment.amountMinor !== input.amountMinor || input.expectedAmountMinor !== input.amountMinor) fields.push('amountMinor');
        if (payment.currency !== input.currency || input.expectedCurrency.toUpperCase() !== input.currency.toUpperCase()) fields.push('currency');
        if (fields.length > 0) return { status: 'mismatch' as const, paymentId: payment.id, fields };
      }
      if (payment.status !== 'pending') {
        return { status: 'noop' as const, paymentId: payment.id, paymentStatus: payment.status };
      }
      const changed = await transitionStatus(transactionalEm, {
        entityType: 'Payment',
        entityId: payment.id,
        from: ['pending'],
        to: input.status,
        actor: { kind: 'webhook' },
        ...(input.status === 'succeeded'
          ? { patch: { providerPaymentId: input.providerPaymentId, livemode: input.livemode ?? false } }
          : input.providerPaymentId ? { patch: { providerPaymentId: input.providerPaymentId } } : {}),
      });
      return { status: changed ? 'transitioned' as const : 'noop' as const, paymentId: payment.id, paymentStatus: input.status };
    };
    return this.em.isInTransaction() ? run(this.em) : this.em.transactional(run);
  }

  async settleWebhookEvent(
    input: PaymentWebhookSettlementInput,
  ): Promise<PaymentWebhookSettlementResult> {
    return this.em.transactional(async (transactionalEm) => {
      const payment = await transactionalEm.findOne(
        Payment,
        { bookingId: input.bookingId, providerSessionId: input.providerSessionId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!payment) {
        return { status: 'mismatch', paymentId: null, fields: ['bookingId', 'providerSessionId'] };
      }

      const booking = await transactionalEm.findOne(
        Booking,
        { id: input.bookingId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!booking) {
        return { status: 'mismatch', paymentId: payment.id, fields: ['bookingId'] };
      }

      if (input.status === 'succeeded') {
        const fields: Array<'amountMinor' | 'currency'> = [];
        if (
          input.amountMinor !== payment.amountMinor ||
          input.amountMinor !== booking.priceMinor ||
          payment.amountMinor !== booking.priceMinor
        ) {
          fields.push('amountMinor');
        }
        if (
          input.currency !== payment.currency ||
          input.currency !== booking.currency ||
          payment.currency !== booking.currency
        ) {
          fields.push('currency');
        }
        if (fields.length > 0) {
          return { status: 'mismatch', paymentId: payment.id, fields };
        }
      }

      if (payment.status !== 'pending' || booking.status !== 'pending_payment') {
        return { status: 'noop' };
      }

      const paymentPatch =
        input.status === 'succeeded'
          ? { providerPaymentId: input.providerPaymentId, livemode: input.livemode }
          : input.providerPaymentId === undefined
            ? undefined
            : { providerPaymentId: input.providerPaymentId };
      const paymentChanged = await transitionStatus(transactionalEm, {
        entityType: 'Payment',
        entityId: payment.id,
        from: ['pending'],
        to: input.status,
        actor: { kind: 'webhook' },
        ...(paymentPatch ? { patch: paymentPatch } : {}),
      });
      const bookingChanged = await transitionStatus(transactionalEm, {
        entityType: 'Booking',
        entityId: booking.id,
        from: ['pending_payment'],
        to: input.status === 'succeeded' ? 'paid' : 'payment_failed',
        actor: { kind: 'webhook' },
      });
      if (!paymentChanged || !bookingChanged) {
        throw new Error('Locked pending payment and booking did not transition together.');
      }

      return { status: 'transitioned', paymentId: payment.id, bookingId: booking.id };
    });
  }
}

export type PaymentWebhookSettlementInput =
  | {
      bookingId: string;
      providerSessionId: string;
      status: 'succeeded';
      amountMinor: number;
      currency: string;
      providerPaymentId: string;
      livemode: boolean;
    }
  | {
      bookingId: string;
      providerSessionId: string;
      status: 'failed';
      providerPaymentId?: string;
    };

export type PaymentWebhookSettlementResult =
  | { status: 'transitioned'; paymentId: string; bookingId: string }
  | { status: 'noop' }
  | { status: 'mismatch'; paymentId: string | null; fields: string[] };

export type ArticlePage = { items: Article[]; total: number };

export class ArticleRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Article | null> {
    return this.em.findOne(Article, { id });
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    return this.em.find(Article, { authorId });
  }

  /** Newest first. `authorId` narrows the list; without it every article is returned. */
  async findPage(options: { authorId?: string; limit: number; offset: number }): Promise<ArticlePage> {
    const { authorId, limit, offset } = options;
    const [items, total] = await this.em.findAndCount(
      Article,
      authorId ? { authorId } : {},
      { orderBy: { createdAt: 'desc', id: 'asc' }, limit, offset },
    );
    return { items, total };
  }

  async create(data: RequiredEntityData<Article>): Promise<Article> {
    const article = this.em.create(Article, data);
    this.em.persist(article);
    await this.em.flush();
    return article;
  }

  async update(id: string, data: { title?: string; content?: string }): Promise<Article | null> {
    const article = await this.em.findOne(Article, { id });
    if (!article) return null;
    Object.assign(article, data);
    await this.em.flush();
    return article;
  }

  async delete(id: string): Promise<boolean> {
    const article = await this.em.findOne(Article, { id });
    if (!article) return false;
    this.em.remove(article);
    await this.em.flush();
    return true;
  }
}

export type NewApprovalRequest = Pick<ApprovalRequest, 'kind' | 'subjectType' | 'subjectId' | 'reason'>;
export type ApprovalDecisionStatus = 'approved' | 'rejected';

const PENDING_APPROVAL_INDEX = 'approval_requests_one_pending_per_subject';
const REFUND_APPROVAL_INDEX = 'approval_requests_one_refund_per_subject';

function isPendingApprovalUniqueViolation(error: unknown): boolean {
  return (
    isUniqueConstraintViolation(error) &&
    [PENDING_APPROVAL_INDEX, REFUND_APPROVAL_INDEX].includes(
      String((error as { constraint?: unknown }).constraint),
    )
  );
}

export class ApprovalRequestRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<ApprovalRequest | null> {
    return this.em.findOne(ApprovalRequest, { id });
  }

  async findPendingBySubject(
    kind: string,
    subjectType: string,
    subjectId: string,
  ): Promise<ApprovalRequest | null> {
    return this.em.findOne(ApprovalRequest, { kind, subjectType, subjectId, status: 'pending' });
  }

  async findBySubjectStatuses(
    kind: string,
    subjectType: string,
    subjectId: string,
    statuses: readonly string[],
  ): Promise<ApprovalRequest | null> {
    return this.em.findOne(ApprovalRequest, {
      kind,
      subjectType,
      subjectId,
      status: { $in: [...statuses] },
    }, { orderBy: { createdAt: 'desc' } });
  }

  async findOperatorRefundQueue(): Promise<OperatorRefundQueueRow[]> {
    return this.em.getConnection().execute<OperatorRefundQueueRow[]>(
      `select
         a.id as "approvalId",
         a.subject_id as "paymentId",
         p.booking_id as "bookingId",
         a.reason as "reason",
         a.status as "status",
         a.created_at as "createdAt",
         p.status as "paymentStatus",
         p.amount_minor as "amountMinor",
         p.currency as "currency",
         coalesce(seeker.name, 'Pilot member') as "seekerName",
         coalesce(mentor.name, case when p.vault_answer_id is not null then 'Vault answer' else 'Mentor' end) as "mentorName"
       from approval_requests a
       join payments p on p.id = a.subject_id
       left join bookings b on b.id = p.booking_id
       left join users seeker on seeker.id = b.seeker_id
       left join users mentor on mentor.id = b.mentor_id
       where a.kind = 'refund'
         and a.subject_type = 'payment'
         and (a.status = 'pending' or (a.status = 'approved' and p.status = 'refund_pending'))
       order by a.created_at asc`,
      [],
    );
  }

  async create(data: NewApprovalRequest): Promise<ApprovalRequest> {
    const approval = this.em.create(ApprovalRequest, {
      ...data,
      status: 'pending',
      decidedBy: null,
      decidedBySystem: false,
      decidedAt: null,
    });
    this.em.persist(approval);

    try {
      await this.em.flush();
    } catch (error) {
      if (isPendingApprovalUniqueViolation(error)) throw new PendingApprovalConflictError();
      throw error;
    }

    return approval;
  }

  transitionStatus(
    id: string,
    status: ApprovalDecisionStatus,
    decidedBy: string,
    decidedAt: Date,
  ): Promise<boolean> {
    return transitionStatus(this.em, {
      entityType: 'ApprovalRequest',
      entityId: id,
      from: ['pending'],
      to: status,
      actor: { kind: 'user', userId: decidedBy },
      patch: { decidedBy, decidedBySystem: false, decidedAt },
    });
  }

  transitionSystemStatus(
    id: string,
    status: ApprovalDecisionStatus,
    decidedAt: Date,
  ): Promise<boolean> {
    return transitionStatus(this.em, {
      entityType: 'ApprovalRequest',
      entityId: id,
      from: ['pending'],
      to: status,
      actor: { kind: 'system' },
      patch: { decidedBy: null, decidedBySystem: true, decidedAt },
    });
  }
}

export type NewMessage = Pick<Message, 'bookingId' | 'authorId' | 'body'>;

export interface MessageCursor {
  createdAt: Date;
  id: string;
}

export class MessageRepository {
  constructor(private readonly em: EntityManager) {}

  async create(data: NewMessage): Promise<Message> {
    const message = this.em.create(Message, data);
    this.em.persist(message);
    await this.em.flush();
    return message;
  }

  async findByBookingAfter(
    bookingId: string,
    cursor: MessageCursor | null,
    limit: number,
  ): Promise<Message[]> {
    return this.em.find(
      Message,
      {
        bookingId,
        ...(cursor
          ? {
              $or: [
                { createdAt: { $gt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { $gt: cursor.id } },
              ],
            }
          : {}),
      },
      { orderBy: { createdAt: 'asc', id: 'asc' }, limit },
    );
  }
}

export interface OperatorRefundQueueRow {
  approvalId: string;
  paymentId: string;
  bookingId: string | null;
  reason: string;
  status: string;
  createdAt: Date;
  paymentStatus: string;
  amountMinor: number;
  currency: string;
  seekerName: string;
  mentorName: string;
}

export type NewInvitation = Pick<
  Invitation,
  'email' | 'displayName' | 'role' | 'invitedBy' | 'acceptedByUserId' | 'acceptedAt' | 'revokedAt'
>;

export class InvitationRepository {
  constructor(private readonly em: EntityManager) {}

  async findAll(): Promise<Invitation[]> {
    return this.em.find(Invitation, {}, { orderBy: { email: 'asc' } });
  }

  async findByEmail(email: string): Promise<Invitation | null> {
    return this.em.findOne(Invitation, { email });
  }

  async findUnrevokedByEmail(email: string): Promise<Invitation | null> {
    return this.em.findOne(Invitation, { email, revokedAt: null });
  }

  async create(data: NewInvitation): Promise<Invitation> {
    const invitation = this.em.create(Invitation, data as RequiredEntityData<Invitation>);
    this.em.persist(invitation);
    await this.em.flush();
    return invitation;
  }

  async accept(email: string, userId: string, acceptedAt: Date): Promise<boolean> {
    const updated = await this.em.nativeUpdate(
      Invitation,
      { email, acceptedByUserId: null, acceptedAt: null, revokedAt: null },
      { acceptedByUserId: userId, acceptedAt, updatedAt: acceptedAt },
    );
    return updated === 1;
  }

  async revoke(email: string, revokedAt: Date): Promise<boolean> {
    const updated = await this.em.nativeUpdate(
      Invitation,
      { email, revokedAt: null },
      { revokedAt, updatedAt: revokedAt },
    );
    return updated === 1;
  }

  async isPilotMember(userId: string): Promise<boolean> {
    return (
      (await this.em.count(Invitation, {
        acceptedByUserId: userId,
        acceptedAt: { $ne: null },
        revokedAt: null,
      })) > 0
    );
  }

  async hasAcceptedRole(userId: string, role: string): Promise<boolean> {
    return (
      (await this.em.count(Invitation, {
        acceptedByUserId: userId,
        acceptedAt: { $ne: null },
        revokedAt: null,
        role,
      })) > 0
    );
  }
}

export type NewLoginToken = Pick<LoginToken, 'email' | 'tokenHash' | 'expiresAt' | 'consumedAt'> & { reusable?: boolean };

export class LoginTokenRepository {
  constructor(private readonly em: EntityManager) {}

  async create(data: NewLoginToken): Promise<void> {
    const token = this.em.create(LoginToken, { ...data, reusable: data.reusable ?? false } as RequiredEntityData<LoginToken>);
    this.em.persist(token);
    await this.em.flush();
  }

  /** One conditional statement wins even when multiple requests consume the same token concurrently. */
  async consume(tokenHash: string, now: Date): Promise<string | null> {
    const transactionContext = this.em.getTransactionContext();
    const row = await this.em.getConnection().execute<{ email: string }>(
      `update "login_tokens"
       set "consumed_at" = ?, "updated_at" = ?
       where "token_hash" = ? and "consumed_at" is null and "expires_at" > ?
       returning "email"`,
      [now, now, tokenHash, now],
      'get',
      transactionContext,
    );
    return row?.email ?? null;
  }

  async findReusable(tokenHash: string, now: Date): Promise<string | null> {
    const token = await this.em.findOne(LoginToken, { tokenHash, reusable: true, expiresAt: { $gt: now } });
    return token?.email ?? null;
  }
}

export type NewNote = Pick<
  Note,
  'mentorId' | 'title' | 'body' | 'status' | 'aiNoticeVersion' | 'aiConsentedAt' | 'publishedAt' | 'takenDownAt'
>;

export class NoteRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Note | null> {
    return this.em.findOne(Note, { id });
  }

  async findOwnedById(id: string, mentorId: string): Promise<Note | null> {
    return this.em.findOne(Note, { id, mentorId });
  }

  async findPage(mentorId: string, options: { limit: number; offset: number }): Promise<{ items: Note[]; total: number }> {
    const [items, total] = await this.em.findAndCount(Note, { mentorId }, {
      orderBy: { updatedAt: 'desc', id: 'asc' },
      limit: options.limit,
      offset: options.offset,
    });
    return { items, total };
  }

  async findVaultCorpus(excludedMentorId: string): Promise<Note[]> {
    return this.em.find(Note, {
      mentorId: { $ne: excludedMentorId },
      status: 'published',
      aiNoticeVersion: { $ne: null },
      aiConsentedAt: { $ne: null },
    }, { orderBy: { createdAt: 'desc', id: 'desc' } });
  }

  async create(data: NewNote): Promise<Note> {
    const note = this.em.create(Note, data as RequiredEntityData<Note>);
    this.em.persist(note);
    await this.em.flush();
    return note;
  }

  async updateDraft(id: string, mentorId: string, data: Pick<Note, 'title' | 'body'>, now: Date): Promise<boolean> {
    const changed = await this.em.nativeUpdate(
      Note,
      { id, mentorId, status: { $in: ['draft', 'taken_down'] } },
      { ...data, updatedAt: now },
    );
    if (changed !== 1) return false;
    const managed = await this.em.findOne(Note, { id, mentorId });
    if (managed) Object.assign(managed, data, { updatedAt: now });
    return true;
  }

  async publish(id: string, mentorId: string, noticeVersion: string, now: Date): Promise<boolean> {
    const changed = await this.em.nativeUpdate(
      Note,
      { id, mentorId, status: { $in: ['draft', 'taken_down'] } },
      {
        status: 'published',
        aiNoticeVersion: noticeVersion,
        aiConsentedAt: now,
        publishedAt: now,
        takenDownAt: null,
        updatedAt: now,
      },
    );
    if (changed !== 1) return false;
    const managed = await this.em.findOne(Note, { id, mentorId });
    if (managed) Object.assign(managed, {
      status: 'published', aiNoticeVersion: noticeVersion, aiConsentedAt: now,
      publishedAt: now, takenDownAt: null, updatedAt: now,
    });
    return true;
  }

  async takeDown(id: string, mentorId: string, now: Date): Promise<boolean> {
    const changed = await this.em.nativeUpdate(
      Note,
      { id, mentorId, status: 'published' },
      { status: 'taken_down', takenDownAt: now, updatedAt: now },
    );
    if (changed !== 1) return false;
    const managed = await this.em.findOne(Note, { id, mentorId });
    if (managed) Object.assign(managed, { status: 'taken_down', takenDownAt: now, updatedAt: now });
    return true;
  }

  async deleteDraft(id: string, mentorId: string): Promise<boolean> {
    const note = await this.em.findOne(Note, { id, mentorId, status: { $in: ['draft', 'taken_down'] } });
    if (!note) return false;
    this.em.remove(note);
    await this.em.flush();
    return true;
  }
}

export interface NewLedgerEntry {
  accountId: string;
  amountMinor: number;
  currency: string;
  livemode: boolean;
  sourceType: string;
  sourceId: string;
}

export class LedgerEntryRepository {
  constructor(private readonly em: EntityManager) {}

  async record(entries: readonly NewLedgerEntry[]): Promise<number> {
    let insertedCount = 0;
    for (const entry of entries) {
      const now = new Date();
      const rows = await this.em.getConnection().execute<Array<{ id: string }>>(
        `insert into "ledger_entries" ("id", "account_id", "amount_minor", "currency", "livemode", "source_type", "source_id", "created_at", "updated_at")
         values (?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict ("source_type", "source_id", "account_id") do nothing returning "id"`,
        [randomUUID(), entry.accountId, entry.amountMinor, entry.currency, entry.livemode, entry.sourceType, entry.sourceId, now, now],
        'all',
        this.em.getTransactionContext(),
      );
      if (Array.isArray(rows) && rows.length === 1) {
        insertedCount += 1;
        continue;
      }
      const existing = await this.em.getConnection().execute<NewLedgerEntry>(
        `select "account_id" as "accountId", "amount_minor" as "amountMinor", "currency", "livemode", "source_type" as "sourceType", "source_id" as "sourceId"
         from "ledger_entries" where "source_type" = ? and "source_id" = ? and "account_id" = ?`,
        [entry.sourceType, entry.sourceId, entry.accountId],
        'get',
        this.em.getTransactionContext(),
      );
      if (!existing || existing.amountMinor !== entry.amountMinor || existing.currency !== entry.currency || existing.livemode !== entry.livemode) {
        throw new StatusTransitionConflictError('A ledger replay conflicts with an existing credit.');
      }
    }
    return insertedCount;
  }

  async balanceOf(accountId: string, livemode: boolean): Promise<number> {
    const row = await this.em.getConnection().execute<{ balance: string | number }>(
      `select coalesce(sum("amount_minor"), 0) as "balance" from "ledger_entries" where "account_id" = ? and "livemode" = ?`,
      [accountId, livemode],
      'get',
      this.em.getTransactionContext(),
    );
    return Number(row?.balance ?? 0);
  }

  async findByAccount(accountId: string, livemode?: boolean): Promise<LedgerEntry[]> {
    return this.em.find(LedgerEntry, {
      accountId,
      ...(livemode === undefined ? {} : { livemode }),
    }, { orderBy: { createdAt: 'desc', id: 'asc' } });
  }
}

export type NewVaultAnswer = Pick<
  VaultAnswer,
  | 'seekerId' | 'question' | 'status' | 'priceMinor' | 'currency' | 'answerText' | 'failureReason'
  | 'modelId' | 'inputTokens' | 'outputTokens' | 'generationAttempts' | 'generationStartedAt'
  | 'previewRequired' | 'reviewExpiresAt'
>;

export type NewVaultAnswerCitation = Pick<
  VaultAnswerCitation,
  'answerId' | 'noteId' | 'mentorId' | 'mentorName' | 'noteTitle' | 'position'
>;

export type NewVaultAnswerReview = Pick<VaultAnswerReview, 'answerId' | 'reviewerId'>;

export class VaultAnswerRepository {
  constructor(private readonly em: EntityManager) {}

  async createWithPayment(
    answerData: NewVaultAnswer,
    paymentData: Omit<NewVaultPayment, 'vaultAnswerId'>,
  ): Promise<{ answer: VaultAnswer; payment: Payment }> {
    return this.em.transactional(async (transactionalEm) => {
      const answer = transactionalEm.create(VaultAnswer, answerData);
      transactionalEm.persist(answer);
      await transactionalEm.flush();
      const payment = transactionalEm.create(Payment, {
        ...paymentData,
        bookingId: null,
        vaultAnswerId: answer.id,
      });
      transactionalEm.persist(payment);
      await transactionalEm.flush();
      return { answer, payment };
    });
  }

  async findById(id: string): Promise<VaultAnswer | null> {
    return this.em.findOne(VaultAnswer, { id });
  }

  async failCheckout(id: string): Promise<void> {
    await this.em.transactional(async (transactionalEm) => {
      const payment = await transactionalEm.findOne(Payment, { vaultAnswerId: id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (payment?.status === 'pending') {
        await transitionStatus(transactionalEm, {
          entityType: 'Payment', entityId: payment.id, from: ['pending'], to: 'failed', actor: { kind: 'system' },
        });
      }
      await transitionStatus(transactionalEm, {
        entityType: 'VaultAnswer', entityId: id, from: ['pending_payment'], to: 'payment_failed',
        actor: { kind: 'system' }, ifAlready: true,
      });
    });
  }

  async findForSeeker(seekerId: string): Promise<VaultAnswer[]> {
    return this.em.find(VaultAnswer, { seekerId }, { orderBy: { createdAt: 'desc', id: 'asc' } });
  }

  async countOpenForSeeker(seekerId: string, now: Date, pendingPaymentMaxAgeMs: number): Promise<number> {
    return this.em.count(VaultAnswer, {
      seekerId,
      $or: [
        { status: { $in: ['paid', 'generating', 'pending_preview'] } },
        { status: 'pending_payment', createdAt: { $gte: new Date(now.getTime() - pendingPaymentMaxAgeMs) } },
      ],
    });
  }

  async findForGeneration(limit: number): Promise<VaultAnswer[]> {
    return this.em.find(VaultAnswer, { status: { $in: ['paid', 'generating'] } }, {
      orderBy: { createdAt: 'asc', id: 'asc' },
      limit,
    });
  }

  async createReviews(rows: readonly NewVaultAnswerReview[]): Promise<void> {
    for (const row of rows) this.em.persist(this.em.create(VaultAnswerReview, { ...row, decision: null, decidedAt: null, reason: null }));
    if (rows.length > 0) await this.em.flush();
  }

  async findReviewFor(answerId: string, reviewerId: string): Promise<VaultAnswerReview | null> {
    return this.em.findOne(VaultAnswerReview, { answerId, reviewerId });
  }

  async findReviews(answerId: string): Promise<VaultAnswerReview[]> {
    return this.em.find(VaultAnswerReview, { answerId }, { orderBy: { reviewerId: 'asc' } });
  }

  async findPreviewsForMentor(reviewerId: string): Promise<Array<{ answer: VaultAnswer; review: VaultAnswerReview }>> {
    const reviews = await this.em.find(VaultAnswerReview, { reviewerId }, { orderBy: { createdAt: 'asc', id: 'asc' } });
    if (reviews.length === 0) return [];
    const answers = await this.em.find(VaultAnswer, { id: { $in: reviews.map((review) => review.answerId) }, status: 'pending_preview' });
    const byId = new Map(answers.map((answer) => [answer.id, answer]));
    return reviews.flatMap((review) => {
      const answer = byId.get(review.answerId);
      return answer ? [{ answer, review }] : [];
    });
  }

  async decideReview(input: {
    answerId: string;
    reviewerId: string;
    decision: 'approved' | 'rejected';
    decidedAt: Date;
    reason?: string;
  }): Promise<{ changed: boolean; reviews: VaultAnswerReview[] }> {
    const work = async (transactionalEm: EntityManager) => {
      const answer = await transactionalEm.findOne(VaultAnswer, { id: input.answerId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!answer || answer.status !== 'pending_preview') throw new StatusTransitionConflictError('This answer is no longer awaiting preview.');
      if (answer.reviewExpiresAt && answer.reviewExpiresAt <= input.decidedAt) throw new StatusTransitionConflictError('The preview deadline has passed.');
      const review = await transactionalEm.findOne(VaultAnswerReview, { answerId: input.answerId, reviewerId: input.reviewerId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!review) throw new StatusTransitionConflictError('This mentor is not assigned to preview the answer.');
      if (review.decision !== null) throw new StatusTransitionConflictError('This mentor already reviewed the answer.');
      const citations = await transactionalEm.find(VaultAnswerCitation, { answerId: input.answerId });
      const noteIds = citations.map((citation) => citation.noteId);
      const publishedCount = noteIds.length > 0 ? await transactionalEm.count(Note, {
        id: { $in: noteIds }, status: 'published', aiNoticeVersion: { $ne: null }, aiConsentedAt: { $ne: null },
      }) : 0;
      const effectiveDecision = publishedCount === noteIds.length ? input.decision : 'rejected';
      review.decision = effectiveDecision;
      review.decidedAt = input.decidedAt;
      review.reason = effectiveDecision === 'rejected' ? input.reason ?? null : null;
      await transactionalEm.flush();
      return { changed: true, reviews: await transactionalEm.find(VaultAnswerReview, { answerId: input.answerId }) };
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  async decideReviewAndTransition(input: {
    answerId: string;
    reviewerId: string;
    decision: 'approved' | 'rejected';
    decidedAt: Date;
    reason?: string;
    terminal?: 'rejected' | 'released';
  }): Promise<{ changed: boolean; reviews: VaultAnswerReview[] }> {
    const work = async (transactionalEm: EntityManager) => {
      const answer = await transactionalEm.findOne(VaultAnswer, { id: input.answerId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!answer || answer.status !== 'pending_preview') throw new StatusTransitionConflictError('This answer is no longer awaiting preview.');
      const review = await transactionalEm.findOne(VaultAnswerReview, { answerId: input.answerId, reviewerId: input.reviewerId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!review) throw new StatusTransitionConflictError('This mentor is not assigned to preview the answer.');
      if (review.decision !== null) throw new StatusTransitionConflictError('This mentor already reviewed the answer.');
      review.decision = input.decision;
      review.decidedAt = input.decidedAt;
      review.reason = input.reason ?? null;
      await transactionalEm.flush();
      const reviews = await transactionalEm.find(VaultAnswerReview, { answerId: input.answerId });
      const rejected = reviews.some((item) => item.decision === 'rejected');
      const allApproved = reviews.length > 0 && reviews.every((item) => item.decision === 'approved');
      const terminal = input.terminal ?? (rejected ? 'rejected' : allApproved ? 'released' : undefined);
      if (terminal) {
        await transitionStatus(transactionalEm, {
          entityType: 'VaultAnswer', entityId: input.answerId, from: ['pending_preview'], to: terminal,
          actor: { kind: 'system' }, patch: { reviewExpiresAt: null },
        });
        answer.status = terminal;
        answer.reviewExpiresAt = null;
        if (terminal === 'rejected') {
          const payment = await transactionalEm.findOne(Payment, { vaultAnswerId: input.answerId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
          if (payment) {
            const existing = await transactionalEm.findOne(ApprovalRequest, {
              kind: 'refund', subjectType: 'payment', subjectId: payment.id, status: { $in: ['pending', 'approved'] },
            });
            if (!existing) {
              transactionalEm.persist(transactionalEm.create(ApprovalRequest, {
                kind: 'refund', subjectType: 'payment', subjectId: payment.id, reason: 'vault_rejected',
                status: 'pending', decidedBy: null, decidedBySystem: false, decidedAt: null,
              }));
              await transactionalEm.flush();
            }
          }
        }
      }
      return { changed: true, reviews };
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  async transitionWithPaymentRefund(id: string, from: readonly string[], to: 'rejected' | 'expired' | 'cancelled', now: Date): Promise<{ changed: boolean; paymentId: string | null }> {
    const work = async (transactionalEm: EntityManager) => {
      const changed = await transitionStatus(transactionalEm, {
        entityType: 'VaultAnswer', entityId: id, from, to, actor: { kind: 'system' }, patch: { reviewExpiresAt: null, updatedAt: now },
      });
      if (!changed) return { changed: false, paymentId: null };
      const answer = await transactionalEm.findOne(VaultAnswer, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (answer) { answer.status = to; answer.reviewExpiresAt = null; answer.updatedAt = now; }
      const payment = await transactionalEm.findOne(Payment, { vaultAnswerId: id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!payment) return { changed: true, paymentId: null };
      const existing = await transactionalEm.findOne(ApprovalRequest, {
        kind: 'refund', subjectType: 'payment', subjectId: payment.id,
        status: { $in: ['pending', 'approved'] },
      });
      if (existing) return { changed: true, paymentId: payment.id };
      const approval = transactionalEm.create(ApprovalRequest, {
        kind: 'refund', subjectType: 'payment', subjectId: payment.id,
        reason: to === 'rejected' ? 'vault_rejected' : to === 'expired' ? 'vault_expired' : 'vault_cancelled',
        status: 'pending', decidedBy: null, decidedBySystem: false, decidedAt: null,
      });
      transactionalEm.persist(approval);
      await transactionalEm.flush();
      return { changed: true, paymentId: payment.id };
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  async failGenerationWithRefund(id: string, failureReason: string, now: Date): Promise<{ changed: boolean; paymentId: string | null }> {
    const work = async (transactionalEm: EntityManager) => {
      const changed = await transitionStatus(transactionalEm, {
        entityType: 'VaultAnswer', entityId: id, from: ['generating'], to: 'generation_failed',
        actor: { kind: 'system' }, patch: { failureReason, answerText: null, updatedAt: now },
      });
      if (!changed) return { changed: false, paymentId: null };
      const answer = await transactionalEm.findOne(VaultAnswer, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (answer) { answer.status = 'generation_failed'; answer.failureReason = failureReason; answer.answerText = null; answer.updatedAt = now; }
      const payment = await transactionalEm.findOne(Payment, { vaultAnswerId: id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!payment) return { changed: true, paymentId: null };
      const existing = await transactionalEm.findOne(ApprovalRequest, {
        kind: 'refund', subjectType: 'payment', subjectId: payment.id, status: { $in: ['pending', 'approved'] },
      });
      if (!existing) {
        transactionalEm.persist(transactionalEm.create(ApprovalRequest, {
          kind: 'refund', subjectType: 'payment', subjectId: payment.id,
          reason: 'vault_generation_failed', status: 'pending', decidedBy: null, decidedBySystem: false, decidedAt: null,
        }));
        await transactionalEm.flush();
      }
      return { changed: true, paymentId: payment.id };
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  async releaseOrRefund(id: string, noteIds: readonly string[], now: Date): Promise<{ released: boolean; refundRequested: boolean }> {
    const work = async (transactionalEm: EntityManager) => {
      const answer = await transactionalEm.findOne(VaultAnswer, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!answer || !['generating', 'pending_preview'].includes(answer.status)) return { released: false, refundRequested: false };
      const available = noteIds.length > 0 ? await transactionalEm.count(Note, {
        id: { $in: [...noteIds] }, status: 'published', aiNoticeVersion: { $ne: null }, aiConsentedAt: { $ne: null },
      }) : 0;
      if (available !== noteIds.length) {
        const terminal = answer.status === 'generating' ? 'generation_failed' : 'rejected';
        await transitionStatus(transactionalEm, {
          entityType: 'VaultAnswer', entityId: id, from: [answer.status], to: terminal,
          actor: { kind: 'system' }, patch: { answerText: null, failureReason: terminal === 'generation_failed' ? 'unavailable' : answer.failureReason, reviewExpiresAt: null, updatedAt: now },
        });
        answer.status = terminal;
        answer.answerText = null;
        answer.failureReason = terminal === 'generation_failed' ? 'unavailable' : answer.failureReason;
        answer.reviewExpiresAt = null;
        answer.updatedAt = now;
        const payment = await transactionalEm.findOne(Payment, { vaultAnswerId: id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
        if (payment) {
          const existing = await transactionalEm.findOne(ApprovalRequest, {
            kind: 'refund', subjectType: 'payment', subjectId: payment.id, status: { $in: ['pending', 'approved'] },
          });
          if (!existing) {
            transactionalEm.persist(transactionalEm.create(ApprovalRequest, {
              kind: 'refund', subjectType: 'payment', subjectId: payment.id,
              reason: terminal === 'generation_failed' ? 'vault_generation_failed' : 'vault_rejected',
              status: 'pending', decidedBy: null, decidedBySystem: false, decidedAt: null,
            }));
            await transactionalEm.flush();
          }
        }
        return { released: false, refundRequested: true };
      }
      if (!(await transitionStatus(transactionalEm, {
        entityType: 'VaultAnswer', entityId: id, from: [answer.status], to: 'released',
        actor: { kind: 'system' }, patch: { reviewExpiresAt: null },
      }))) return { released: false, refundRequested: false };
      answer.status = 'released';
      answer.reviewExpiresAt = null;
      answer.updatedAt = now;
      return { released: true, refundRequested: false };
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  async decideAndReleaseWithCredits(input: {
    answerId: string;
    reviewerId: string;
    decidedAt: Date;
    credits: readonly NewLedgerEntry[];
  }): Promise<boolean> {
    const work = async (transactionalEm: EntityManager) => {
      const answer = await transactionalEm.findOne(VaultAnswer, { id: input.answerId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!answer || answer.status !== 'pending_preview' || (answer.reviewExpiresAt && answer.reviewExpiresAt <= input.decidedAt)) throw new StatusTransitionConflictError('This answer is no longer awaiting preview.');
      const review = await transactionalEm.findOne(VaultAnswerReview, { answerId: input.answerId, reviewerId: input.reviewerId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!review || review.decision !== null) throw new StatusTransitionConflictError('This mentor cannot decide this answer again.');
      if (answer.reviewExpiresAt && answer.reviewExpiresAt <= input.decidedAt) throw new StatusTransitionConflictError('The preview deadline has passed.');
      review.decision = 'approved';
      review.decidedAt = input.decidedAt;
      await transactionalEm.flush();
      const reviews = await transactionalEm.find(VaultAnswerReview, { answerId: input.answerId });
      if (!reviews.every((item) => item.decision === 'approved')) return false;
      const citations = await transactionalEm.find(VaultAnswerCitation, { answerId: input.answerId });
      const noteIds = citations.map((citation) => citation.noteId);
      const publishedCount = noteIds.length > 0 ? await transactionalEm.count(Note, {
        id: { $in: noteIds }, status: 'published', aiNoticeVersion: { $ne: null }, aiConsentedAt: { $ne: null },
      }) : 0;
      if (publishedCount !== noteIds.length) {
        const rejectedReview = await transactionalEm.findOne(VaultAnswerReview, { answerId: input.answerId, reviewerId: input.reviewerId });
        if (rejectedReview) {
          rejectedReview.decision = 'rejected';
          rejectedReview.decidedAt = input.decidedAt;
          rejectedReview.reason = null;
          await transactionalEm.flush();
        }
        await transitionStatus(transactionalEm, { entityType: 'VaultAnswer', entityId: input.answerId, from: ['pending_preview'], to: 'rejected', actor: { kind: 'system' }, patch: { answerText: null, reviewExpiresAt: null, updatedAt: input.decidedAt } });
        answer.status = 'rejected';
        answer.answerText = null;
        answer.reviewExpiresAt = null;
        answer.updatedAt = input.decidedAt;
        const payment = await transactionalEm.findOne(Payment, { vaultAnswerId: input.answerId });
        if (payment) {
          const existing = await transactionalEm.findOne(ApprovalRequest, { kind: 'refund', subjectType: 'payment', subjectId: payment.id, status: { $in: ['pending', 'approved'] } });
          if (!existing) transactionalEm.persist(transactionalEm.create(ApprovalRequest, { kind: 'refund', subjectType: 'payment', subjectId: payment.id, reason: 'vault_rejected', status: 'pending', decidedBy: null, decidedBySystem: false, decidedAt: null }));
        }
        return false;
      }
      await transitionStatus(transactionalEm, { entityType: 'VaultAnswer', entityId: input.answerId, from: ['pending_preview'], to: 'released', actor: { kind: 'system' }, patch: { reviewExpiresAt: null, updatedAt: input.decidedAt } });
      answer.status = 'released';
      answer.reviewExpiresAt = null;
      answer.updatedAt = input.decidedAt;
      for (const entry of input.credits) {
        await transactionalEm.getConnection().execute(
          `insert into "ledger_entries" ("id", "account_id", "amount_minor", "currency", "livemode", "source_type", "source_id", "created_at", "updated_at") values (?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict ("source_type", "source_id", "account_id") do nothing`,
          [randomUUID(), entry.accountId, entry.amountMinor, entry.currency, entry.livemode, entry.sourceType, entry.sourceId, input.decidedAt, input.decidedAt],
          'run',
          transactionalEm.getTransactionContext(),
        );
      }
      return true;
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  async updateAnswer(id: string, patch: Partial<Pick<VaultAnswer, 'answerText' | 'failureReason' | 'modelId' | 'inputTokens' | 'outputTokens' | 'generationStartedAt' | 'reviewExpiresAt'>>): Promise<boolean> {
    const answer = await this.findById(id);
    if (!answer) return false;
    const updatedAt = new Date();
    const changed = await this.em.nativeUpdate(VaultAnswer, { id }, { ...patch, updatedAt });
    if (changed === 1) Object.assign(answer, patch, { updatedAt });
    return changed === 1;
  }

  async findExpiredPreviews(before: Date, limit: number): Promise<VaultAnswer[]> {
    return this.em.find(VaultAnswer, { status: 'pending_preview', reviewExpiresAt: { $lte: before } }, { orderBy: { reviewExpiresAt: 'asc', id: 'asc' }, limit });
  }

  async findOperatorAnswers(limit: number): Promise<Array<{ answer: VaultAnswer; rejectionReasons: string[] }>> {
    const answers = await this.em.find(VaultAnswer, {}, { orderBy: { createdAt: 'desc', id: 'asc' }, limit });
    if (answers.length === 0) return [];
    const reviews = await this.em.find(VaultAnswerReview, { answerId: { $in: answers.map((answer) => answer.id) }, decision: 'rejected' });
    const reasons = new Map<string, string[]>();
    for (const review of reviews) if (review.reason) reasons.set(review.answerId, [...(reasons.get(review.answerId) ?? []), review.reason]);
    return answers.map((answer) => ({ answer, rejectionReasons: reasons.get(answer.id) ?? [] }));
  }

  async claimGeneration(id: string, now: Date, leaseMs: number): Promise<boolean> {
    const work = async (transactionalEm: EntityManager) => {
      const answer = await transactionalEm.findOne(VaultAnswer, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!answer || !['paid', 'generating'].includes(answer.status)) return false;
      if (answer.generationStartedAt && answer.generationStartedAt.getTime() >= now.getTime() - leaseMs) return false;
      if (answer.generationAttempts >= 3) return false;
      if (answer.status === 'paid') {
        await transitionStatus(transactionalEm, {
          entityType: 'VaultAnswer', entityId: id, from: ['paid'], to: 'generating', actor: { kind: 'system' },
          patch: { generationStartedAt: now, generationAttempts: answer.generationAttempts + 1, updatedAt: now },
        });
        answer.status = 'generating';
        answer.generationStartedAt = now;
        answer.generationAttempts += 1;
        answer.updatedAt = now;
      } else {
        const changed = await transactionalEm.nativeUpdate(VaultAnswer, {
          id,
          status: 'generating',
          generationAttempts: answer.generationAttempts,
          ...(answer.generationStartedAt ? { generationStartedAt: { $lt: new Date(now.getTime() - leaseMs) } } : { generationStartedAt: null }),
        }, { generationStartedAt: now, generationAttempts: answer.generationAttempts + 1, updatedAt: now });
        if (changed !== 1) return false;
        answer.generationStartedAt = now;
        answer.generationAttempts += 1;
        answer.updatedAt = now;
      }
      return true;
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  async scheduleGenerationRetry(id: string, now: Date, retryAfterMs: number): Promise<boolean> {
    return (await this.em.nativeUpdate(
      VaultAnswer,
      { id, status: 'generating' },
      { status: 'generating', generationStartedAt: new Date(now.getTime() + retryAfterMs - 180_000), updatedAt: now },
    )) === 1;
  }

  async transition(
    id: string,
    from: readonly string[],
    to: string,
    actor: import('./transition').TransitionActor,
    patch: Record<string, unknown> = {},
    ifAlready = false,
  ): Promise<boolean> {
    return transitionStatus(this.em, {
      entityType: 'VaultAnswer', entityId: id, from, to, actor, patch, ifAlready,
    });
  }

  async createCitations(rows: readonly NewVaultAnswerCitation[]): Promise<void> {
    if (rows.length === 0) return;
    for (const row of rows) this.em.persist(this.em.create(VaultAnswerCitation, row));
    await this.em.flush();
  }

  async persistGenerated(input: {
    answerId: string;
    answerText: string;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    citations: readonly NewVaultAnswerCitation[];
    reviewerIds: readonly string[];
    reviewExpiresAt: Date | null;
    now: Date;
    directRelease: boolean;
  }): Promise<boolean> {
    const work = async (transactionalEm: EntityManager) => {
      const answer = await transactionalEm.findOne(VaultAnswer, { id: input.answerId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!answer || answer.status !== 'generating') return false;
      for (const citation of input.citations) transactionalEm.persist(transactionalEm.create(VaultAnswerCitation, citation));
      if (!input.directRelease) {
        for (const reviewerId of input.reviewerIds) {
          transactionalEm.persist(transactionalEm.create(VaultAnswerReview, {
            answerId: input.answerId, reviewerId, decision: null, decidedAt: null, reason: null,
          }));
        }
      }
      await transactionalEm.flush();
      const patch = {
        answerText: input.answerText, modelId: input.modelId, inputTokens: input.inputTokens,
        outputTokens: input.outputTokens, failureReason: null, reviewExpiresAt: input.reviewExpiresAt,
        generationStartedAt: input.now, updatedAt: input.now,
      };
      if (input.directRelease) {
        await transactionalEm.nativeUpdate(VaultAnswer, { id: input.answerId, status: 'generating' }, patch);
        Object.assign(answer, patch);
      } else {
        await transitionStatus(transactionalEm, {
          entityType: 'VaultAnswer', entityId: input.answerId, from: ['generating'], to: 'pending_preview',
          actor: { kind: 'system' }, patch,
        });
        answer.status = 'pending_preview';
        Object.assign(answer, patch);
      }
      return true;
    };
    return this.em.isInTransaction() ? work(this.em) : this.em.transactional(work);
  }

  async findCitations(answerId: string): Promise<VaultAnswerCitation[]> {
    return this.em.find(VaultAnswerCitation, { answerId }, { orderBy: { position: 'asc' } });
  }
}

export type NewAvailabilitySlot = Pick<AvailabilitySlot, 'mentorId' | 'startsAt' | 'endsAt'>;

export class AvailabilitySlotRepository {
  constructor(private readonly em: EntityManager) {}

  async create(data: NewAvailabilitySlot): Promise<AvailabilitySlot> {
    const acceptedOverlap = await this.em.findOne(Booking, {
      mentorId: data.mentorId,
      status: 'accepted',
      startsAt: { $lt: data.endsAt },
      endsAt: { $gt: data.startsAt },
    });
    if (acceptedOverlap) throw new StatusTransitionConflictError('The slot overlaps an accepted session.');
    const slot = this.em.create(AvailabilitySlot, { ...data, status: 'open', bookingId: null });
    this.em.persist(slot);
    await this.em.flush();
    return slot;
  }

  async findById(id: string): Promise<AvailabilitySlot | null> {
    return this.em.findOne(AvailabilitySlot, { id });
  }

  async findOpenForMentor(mentorId: string, from: Date, to: Date): Promise<AvailabilitySlot[]> {
    return this.em.find(AvailabilitySlot, {
      mentorId,
      status: 'open',
      startsAt: { $gte: from, $lte: to },
    }, { orderBy: { startsAt: 'asc' } });
  }

  async cancelOpen(id: string, mentorId: string): Promise<boolean> {
    return (await this.em.nativeUpdate(
      AvailabilitySlot,
      { id, mentorId, status: 'open' },
      { status: 'cancelled', updatedAt: new Date() },
    )) === 1;
  }

  async reserveWithBooking(
    slotId: string,
    mentorId: string,
    now: Date,
    bookingData: NewBooking,
    paymentData: Omit<NewPayment, 'bookingId'>,
  ): Promise<{ booking: Booking; payment: Payment }> {
    return this.em.transactional(async (transactionalEm) => {
      const slot = await transactionalEm.findOne(
        AvailabilitySlot,
        { id: slotId, mentorId, status: 'open' },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!slot) throw new StatusTransitionConflictError('That time is no longer available.');
      const minimumBookingStart = now.getTime() + 2 * 60 * 60 * 1000;
      if (slot.startsAt.getTime() < minimumBookingStart) {
        throw new StatusTransitionConflictError('Bookings close two hours before the session starts.');
      }
      if (![25, 50].includes(bookingData.durationMinutes)) {
        throw new StatusTransitionConflictError('The selected session length is not available.');
      }
      const availableMinutes = (slot.endsAt.getTime() - slot.startsAt.getTime()) / (60 * 1000);
      if (availableMinutes < bookingData.durationMinutes) {
        throw new StatusTransitionConflictError('The selected session length is not available at that time.');
      }
      const sessionEndsAt = new Date(slot.startsAt.getTime() + bookingData.durationMinutes * 60 * 1000);
      const acceptedOverlap = await transactionalEm.findOne(Booking, {
        mentorId,
        status: 'accepted',
        startsAt: { $lt: sessionEndsAt },
        endsAt: { $gt: slot.startsAt },
      });
      if (acceptedOverlap) throw new StatusTransitionConflictError('That time is no longer available.');
      const booking = transactionalEm.create(Booking, {
        ...bookingData,
        startsAt: slot.startsAt,
        endsAt: sessionEndsAt,
        availabilitySlotId: slot.id,
      });
      transactionalEm.persist(booking);
      await transactionalEm.flush();
      slot.status = 'reserved';
      slot.bookingId = booking.id;
      const payment = transactionalEm.create(Payment, { ...paymentData, bookingId: booking.id });
      transactionalEm.persist(payment);
      await transactionalEm.flush();
      return { booking, payment };
    });
  }
}
export { SessionNoteRepository } from './session-note.repository';

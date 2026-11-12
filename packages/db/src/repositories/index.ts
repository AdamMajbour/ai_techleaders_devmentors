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
      if (slot.startsAt.getTime() <= now.getTime()) {
        throw new StatusTransitionConflictError('That time is no longer available.');
      }
      const acceptedOverlap = await transactionalEm.findOne(Booking, {
        mentorId,
        status: 'accepted',
        startsAt: { $lt: slot.endsAt },
        endsAt: { $gt: slot.startsAt },
      });
      if (acceptedOverlap) throw new StatusTransitionConflictError('That time is no longer available.');
      const booking = transactionalEm.create(Booking, {
        ...bookingData,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
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

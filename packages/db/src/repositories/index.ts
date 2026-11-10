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
>;

export type MentorProfileUpdate = Partial<
  Pick<MentorProfile, 'slug' | 'headline' | 'bio' | 'technologies' | 'publicWorkUrl' | 'isListed' | 'lastActiveAt'>
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
    const profile = this.em.create(MentorProfile, data);
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

export type NewPayment = Pick<
  Payment,
  | 'bookingId'
  | 'provider'
  | 'livemode'
  | 'providerSessionId'
  | 'providerPaymentId'
  | 'amountMinor'
  | 'currency'
  | 'status'
>;

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
    return this.em.transactional(async (transactionalEm) => {
      const booking = transactionalEm.create(Booking, bookingData);
      transactionalEm.persist(booking);
      await transactionalEm.flush();
      const payment = transactionalEm.create(Payment, { ...paymentData, bookingId: booking.id });
      transactionalEm.persist(payment);
      await transactionalEm.flush();
      return { booking, payment };
    });
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
         seeker.name as "seekerName",
         mentor.name as "mentorName"
       from approval_requests a
       join payments p on p.id = a.subject_id
       join bookings b on b.id = p.booking_id
       join users seeker on seeker.id = b.seeker_id
       join users mentor on mentor.id = b.mentor_id
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
  bookingId: string;
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

  async create(data: NewNote): Promise<Note> {
    const note = this.em.create(Note, data as RequiredEntityData<Note>);
    this.em.persist(note);
    await this.em.flush();
    return note;
  }

  async updateDraft(id: string, mentorId: string, data: Pick<Note, 'title' | 'body'>, now: Date): Promise<boolean> {
    return (await this.em.nativeUpdate(
      Note,
      { id, mentorId, status: { $in: ['draft', 'taken_down'] } },
      { ...data, updatedAt: now },
    )) === 1;
  }

  async publish(id: string, mentorId: string, noticeVersion: string, now: Date): Promise<boolean> {
    return (await this.em.nativeUpdate(
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
    )) === 1;
  }

  async takeDown(id: string, mentorId: string, now: Date): Promise<boolean> {
    return (await this.em.nativeUpdate(
      Note,
      { id, mentorId, status: 'published' },
      { status: 'taken_down', takenDownAt: now, updatedAt: now },
    )) === 1;
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

// Repository layer for database access.
// Repositories receive an EntityManager instead of reaching for the global one:
// MikroORM forbids using the global EM for context-specific work, so callers pass
// a fork (`orm.em.fork()`) per request / script / test.
import type { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import {
  User,
  Article,
  ApprovalRequest,
  Invitation,
  LoginToken,
  MentorProfile,
  Booking,
  Payment,
} from '../entities';
import { PendingApprovalConflictError, isUniqueConstraintViolation } from '../errors';
import { transitionStatus } from './transition';
export { transitionStatus };
export type { TransitionActor, TransitionStatusInput } from './transition';
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

  async create(data: NewUser): Promise<User> {
    const user = this.em.create(User, data as RequiredEntityData<User>);
    this.em.persist(user);
    await this.em.flush();
    return user;
  }

  async update(id: string, data: Partial<Omit<User, 'id'>>): Promise<User | null> {
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
>;

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

  async setProviderSession(bookingId: string, providerSessionId: string): Promise<Payment | null> {
    const payment = await this.em.findOne(Payment, { bookingId });
    if (!payment) return null;
    payment.providerSessionId = providerSessionId;
    await this.em.flush();
    return payment;
  }
}

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

function isPendingApprovalUniqueViolation(error: unknown): boolean {
  return (
    isUniqueConstraintViolation(error) &&
    (error as { constraint?: unknown }).constraint === PENDING_APPROVAL_INDEX
  );
}

export class ApprovalRequestRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<ApprovalRequest | null> {
    return this.em.findOne(ApprovalRequest, { id });
  }

  async create(data: NewApprovalRequest): Promise<ApprovalRequest> {
    const approval = this.em.create(ApprovalRequest, {
      ...data,
      status: 'pending',
      decidedBy: null,
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
      patch: { decidedBy, decidedAt },
    });
  }
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

export type NewLoginToken = Pick<LoginToken, 'email' | 'tokenHash' | 'expiresAt' | 'consumedAt'>;

export class LoginTokenRepository {
  constructor(private readonly em: EntityManager) {}

  async create(data: NewLoginToken): Promise<void> {
    const token = this.em.create(LoginToken, data as RequiredEntityData<LoginToken>);
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
}

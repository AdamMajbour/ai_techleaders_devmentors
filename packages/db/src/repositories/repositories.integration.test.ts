import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { MikroORM } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { closeORM, initializeORM } from '../config';
import {
  ApprovalRequest,
  Booking,
  Invitation,
  LoginToken,
  MentorProfile,
  Payment,
  StatusTransition,
} from '../entities';
import {
  ExclusionConstraintViolationError,
  isExclusionConstraintViolation,
  isUniqueConstraintViolation,
  PendingApprovalConflictError,
} from '../errors';
import {
  ArticleRepository,
  ApprovalRequestRepository,
  BookingRepository,
  InvitationRepository,
  LoginTokenRepository,
  MentorProfileRepository,
  PaymentRepository,
  UserRepository,
  transitionStatus,
} from './index';

let orm: MikroORM<PostgreSqlDriver>;

// Jest cannot load migration files through MikroORM's dynamic import, so the real
// migration classes are registered explicitly (same files the CLI runs).
async function loadMigrations() {
  const dir = path.resolve(__dirname, '../migrations');
  const files = fs.readdirSync(dir).filter((file) => /^Migration.*\.ts$/.test(file)).sort();
  return Promise.all(
    files.map(async (file) => {
      const migration = await import(path.join(dir, file));
      return { name: file.replace(/\.ts$/, ''), class: Object.values(migration)[0] as never };
    }),
  );
}

async function publicTables(): Promise<string[]> {
  const rows: { tablename: string }[] = await orm.em
    .getConnection()
    .execute("select tablename from pg_tables where schemaname = 'public' order by tablename");
  return rows.map((row) => row.tablename);
}

beforeAll(async () => {
  expect(process.env.DATABASE_NAME).toBe('devmentor_test');
  orm = await initializeORM({
    debug: false,
    logger: () => undefined,
    migrations: { migrationsList: await loadMigrations() },
  });
  // Start from an empty database and build the schema with the real migrations.
  await orm.schema.dropSchema({ dropMigrationsTable: true });
  await orm.migrator.up();
  // Articles provide an existing mapped target table for exercising the generic transition runner.
  await orm.em.getConnection().execute('alter table "articles" add column "status" varchar(255)');
});

afterAll(async () => {
  await closeORM();
});

describe('migrations', () => {
  it('create the application tables', async () => {
    expect(await publicTables()).toEqual([
      'approval_requests',
      'articles',
      'bookings',
      'invitations',
      'login_tokens',
      'mentor_profiles',
      'mikro_orm_migrations',
      'payments',
      'status_transitions',
      'users',
    ]);
  });

  it('removes the approval table and its partial index on migration down', async () => {
    await orm.migrator.down('Migration20261105214000_pending_refund_approval_uniqueness');
    await orm.migrator.down('Migration20261105212000_refund_approval_uniqueness');
    await orm.migrator.down('Migration20261105183000_approval_requests');
    expect(await publicTables()).not.toContain('approval_requests');

    const index = (await orm.em.getConnection().execute(
      `select to_regclass('public.approval_requests_one_pending_per_subject') as name`,
      [],
      'get',
    )) as unknown as { name: string | null } | undefined;
    expect(index?.name).toBeNull();

    await orm.migrator.up();
    expect(await publicTables()).toContain('approval_requests');
  });

  it('replaces the full refund uniqueness index with pending-only uniqueness reversibly', async () => {
    await orm.migrator.down('Migration20261105214000_pending_refund_approval_uniqueness');
    let rows = await orm.em.getConnection().execute(
      `select indexdef from pg_indexes where indexname = 'approval_requests_one_refund_per_subject'`,
      [],
      'get',
    ) as unknown as { indexdef: string } | undefined;
    expect(rows?.indexdef).toContain('WHERE');
    expect(rows?.indexdef).not.toContain(`status = 'pending'`);

    await orm.migrator.up();
    rows = await orm.em.getConnection().execute(
      `select indexdef from pg_indexes where indexname = 'approval_requests_one_refund_per_subject'`,
      [],
      'get',
    ) as unknown as { indexdef: string } | undefined;
    expect(rows?.indexdef).toContain(`status = 'pending'`);
  });

  it('reverses and reapplies the invitation and login-token migration', async () => {
    await orm.migrator.down('Migration20261105190000_pilot_invitations_login_tokens');
    expect(await publicTables()).not.toContain('invitations');
    expect(await publicTables()).not.toContain('login_tokens');

    await orm.migrator.up();
    expect(await publicTables()).toContain('invitations');
    expect(await publicTables()).toContain('login_tokens');
  });

  it('reverses and reapplies the mentor-profile migration', async () => {
    await orm.migrator.down('Migration20261105192000_mentor_profiles');
    expect(await publicTables()).not.toContain('mentor_profiles');

    await orm.migrator.up();
    expect(await publicTables()).toContain('mentor_profiles');
  });

  it('reverses and reapplies the booking/payment migration and its indexes', async () => {
    await orm.migrator.down('Migration20261105200000_bookings_payments');
    expect(await publicTables()).not.toContain('bookings');
    expect(await publicTables()).not.toContain('payments');

    await orm.migrator.up();
    expect(await publicTables()).toContain('bookings');
    expect(await publicTables()).toContain('payments');
    const indexes = (await orm.em.getConnection().execute(
      `select indexname from pg_indexes where schemaname = 'public' and tablename = 'bookings'`,
    )) as { indexname: string }[];
    expect(indexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining(['bookings_mentor_status_index', 'bookings_seeker_id_index']),
    );
  });

  it('reverses only the overlap constraint and leaves btree_gist installed', async () => {
    await orm.migrator.down('Migration20261105210000_booking_overlap');
    const constraint = await orm.em.getConnection().execute(
      `select conname from pg_constraint where conname = 'bookings_accepted_mentor_time_excl'`,
    );
    const extension = await orm.em.getConnection().execute(
      `select extname from pg_extension where extname = 'btree_gist'`,
    );
    expect(constraint).toHaveLength(0);
    expect(extension).toHaveLength(1);

    await orm.migrator.up();
    const restored = await orm.em.getConnection().execute(
      `select conname from pg_constraint where conname = 'bookings_accepted_mentor_time_excl'`,
    );
    expect(restored).toHaveLength(1);
  });
});

describe('booking and payment constraints', () => {
  async function insertBooking(input: {
    seekerId: string;
    mentorId: string;
    question?: string;
    durationMinutes?: number;
    priceMinor?: number;
    currency?: string;
    status?: string;
    source?: string;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }): Promise<string> {
    const id = randomUUID();
    const now = new Date();
    await orm.em.getConnection().execute(
      `insert into "bookings" (
        "id", "seeker_id", "mentor_id", "question", "duration_minutes", "price_minor",
        "currency", "status", "source", "landed_at", "starts_at", "ends_at", "created_at", "updated_at"
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.seekerId,
        input.mentorId,
        input.question ?? 'A booking question',
        input.durationMinutes ?? 25,
        input.priceMinor ?? 2500,
        input.currency ?? 'EUR',
        input.status ?? 'pending_payment',
        input.source ?? 'link',
        now,
        input.startsAt ?? null,
        input.endsAt ?? null,
        now,
        now,
      ],
      'run',
    );
    return id;
  }

  async function insertPayment(
    bookingId: string,
    providerSessionId: string | null,
    input: { amountMinor?: number; status?: string } = {},
  ): Promise<string> {
    const id = randomUUID();
    const now = new Date();
    await orm.em.getConnection().execute(
      `insert into "payments" (
        "id", "booking_id", "provider", "livemode", "provider_session_id", "provider_payment_id",
        "amount_minor", "currency", "status", "created_at", "updated_at"
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        bookingId,
        'mock',
        false,
        providerSessionId,
        null,
        input.amountMinor ?? 2500,
        'EUR',
        input.status ?? 'pending',
        now,
        now,
      ],
      'run',
    );
    return id;
  }

  it('settles only paid bookings past the window and makes expiry transitions idempotent', async () => {
    const seeker = await new UserRepository(orm.em.fork()).create({
      email: `${randomUUID()}@example.com`,
      name: 'Seeker',
    });
    const mentor = await new UserRepository(orm.em.fork()).create({
      email: `${randomUUID()}@example.com`,
      name: 'Mentor',
    });
    await new MentorProfileRepository(orm.em.fork()).create({
      userId: mentor.id,
      slug: `mentor-${randomUUID()}`,
      headline: 'Mentor',
      bio: 'Bio',
      technologies: 'typescript',
      publicWorkUrl: 'https://example.com',
      isListed: true,
      lastActiveAt: null,
    });
    const id = await insertBooking({ seekerId: seeker.id, mentorId: mentor.id });
    await transitionStatus(orm.em.fork(), {
      entityType: 'Booking',
      entityId: id,
      from: ['pending_payment'],
      to: 'paid',
      actor: { kind: 'webhook' },
    });

    const repository = new BookingRepository(orm.em.fork());
    const paidJustNow = new Date();
    expect(await repository.findForSettlement({ before: new Date(paidJustNow.getTime() - 1) }))
      .toEqual([]);
    expect(await repository.findForSettlement({ before: new Date(paidJustNow.getTime() + 1) }))
      .toHaveLength(1);
    const transitions = await Promise.all([
      new BookingRepository(orm.em.fork()).expirePaid(id),
      new BookingRepository(orm.em.fork()).expirePaid(id),
    ]);
    expect(transitions.filter(Boolean)).toHaveLength(1);
    expect(transitions.filter((value) => !value)).toHaveLength(1);
    await expect(repository.expirePaid(id)).resolves.toBe(false);
    expect(await orm.em.count(Booking, { id, status: 'expired' })).toBe(1);
  });

  it('enforces participant foreign keys, booking checks, and payment uniqueness', async () => {
    const seeker = await new UserRepository(orm.em.fork()).create({
      email: 'booking-seeker@example.com',
      name: 'Booking Seeker',
    });

    const mentorUser = await new UserRepository(orm.em.fork()).create({
      email: 'booking-mentor@example.com',
      name: 'Booking Mentor',
    });
    await new MentorProfileRepository(orm.em.fork()).create({
      userId: mentorUser.id,
      slug: 'booking-mentor',
      headline: 'Mentor',
      bio: 'Mentor bio',
      technologies: 'typescript',
      publicWorkUrl: 'https://example.com',
      isListed: true,
      lastActiveAt: null,
    });
    const bookingId = await insertBooking({ seekerId: seeker.id, mentorId: mentorUser.id });

    expect(await orm.em.count(Booking, { id: bookingId })).toBe(1);
    await expect(
      insertBooking({ seekerId: seeker.id, mentorId: mentorUser.id, question: 'q'.repeat(4001) }),
    ).rejects.toThrow();
    await expect(
      insertBooking({ seekerId: seeker.id, mentorId: mentorUser.id, durationMinutes: 50 }),
    ).rejects.toThrow();
    await expect(
      insertBooking({ seekerId: seeker.id, mentorId: mentorUser.id, source: 'unknown' }),
    ).rejects.toThrow();
    await expect(
      insertBooking({ seekerId: seeker.id, mentorId: mentorUser.id, status: 'completed' }),
    ).rejects.toThrow();
    await expect(
      insertBooking({ seekerId: seeker.id, mentorId: mentorUser.id, priceMinor: 0 }),
    ).rejects.toThrow();
    await expect(
      insertBooking({
        seekerId: seeker.id,
        mentorId: mentorUser.id,
        startsAt: new Date('2026-11-06T10:00:00.000Z'),
      }),
    ).rejects.toThrow();
    await expect(
      insertBooking({ seekerId: seeker.id, mentorId: randomUUID() }),
    ).rejects.toThrow();

    const paymentId = await insertPayment(bookingId, 'session-one');
    expect(await orm.em.count(Payment, { id: paymentId })).toBe(1);
    await expect(insertPayment(bookingId, 'session-two')).rejects.toThrow();

    const anotherBooking = await insertBooking({ seekerId: seeker.id, mentorId: mentorUser.id });
    await expect(insertPayment(anotherBooking, 'session-one')).rejects.toThrow();
    await expect(insertPayment(randomUUID(), 'orphan-session')).rejects.toThrow();
    await expect(insertPayment(anotherBooking, 'invalid-status', { status: 'captured' })).rejects.toThrow();
    await expect(insertPayment(anotherBooking, 'invalid-amount', { amountMinor: 0 })).rejects.toThrow();
  });

  describe('accepted booking overlap exclusion', () => {
    async function fixtures() {
      const users = new UserRepository(orm.em.fork());
      const seeker1 = await users.create({ email: `${randomUUID()}@example.com`, name: 'Seeker 1' });
      const seeker2 = await users.create({ email: `${randomUUID()}@example.com`, name: 'Seeker 2' });
      const mentor = await users.create({ email: `${randomUUID()}@example.com`, name: 'Mentor' });
      await new MentorProfileRepository(orm.em.fork()).create({
        userId: mentor.id,
        slug: `mentor-${randomUUID()}`,
        headline: 'Mentor',
        bio: 'Bio',
        technologies: 'typescript',
        publicWorkUrl: 'https://example.com',
        isListed: true,
        lastActiveAt: null,
      });
      return {
        mentorId: mentor.id,
        first: await insertBooking({ seekerId: seeker1.id, mentorId: mentor.id, status: 'paid' }),
        second: await insertBooking({ seekerId: seeker2.id, mentorId: mentor.id, status: 'paid' }),
      };
    }

    const startsAt = new Date('2026-11-06T12:00:00.000Z');
    const endsAt = new Date(startsAt.getTime() + 25 * 60 * 1000);
    const accept = (bookingId: string, mentorId: string) =>
      new BookingRepository(orm.em.fork()).transitionStatus(bookingId, 'accepted', mentorId, {
        startsAt,
        endsAt,
      });

    it('rejects a sequential overlapping acceptance with the db-layer conflict error', async () => {
      const { mentorId, first, second } = await fixtures();
      await accept(first, mentorId);

      await expect(accept(second, mentorId)).rejects.toBeInstanceOf(ExclusionConstraintViolationError);
      expect(await orm.em.count(Booking, { id: second, status: 'paid' })).toBe(1);
    });

    it('allows only one concurrent overlapping acceptance', async () => {
      const { mentorId, first, second } = await fixtures();
      const attempts = await Promise.all([
        accept(first, mentorId).then(() => 'accepted', (error: unknown) => error),
        accept(second, mentorId).then(() => 'accepted', (error: unknown) => error),
      ]);

      expect(attempts.filter((result) => result === 'accepted')).toHaveLength(1);
      const conflict = attempts.find((result) => result !== 'accepted');
      expect(conflict).toBeInstanceOf(ExclusionConstraintViolationError);
      expect(await orm.em.count(Booking, { mentorId, status: 'accepted' })).toBe(1);
    });

    it('recognizes SQLSTATE 23P01 through a wrapped PostgreSQL error cause', () => {
      expect(isExclusionConstraintViolation({ cause: { code: '23P01' } })).toBe(true);
      expect(isExclusionConstraintViolation({ code: '23505' })).toBe(false);
      expect(isExclusionConstraintViolation(new Error('not a database error'))).toBe(false);
    });
  });
});

describe('PaymentRepository webhook settlement', () => {
  async function createPendingPair(options: {
    bookingPrice?: number;
    bookingCurrency?: string;
    paymentAmount?: number;
    paymentCurrency?: string;
  } = {}) {
    const seeker = await new UserRepository(orm.em.fork()).create({
      email: `webhook-seeker-${randomUUID()}@example.com`,
      name: 'Webhook Seeker',
    });
    const mentor = await new UserRepository(orm.em.fork()).create({
      email: `webhook-mentor-${randomUUID()}@example.com`,
      name: 'Webhook Mentor',
    });
    const bookingId = randomUUID();
    const paymentId = randomUUID();
    const providerSessionId = `session-${randomUUID()}`;
    const now = new Date();
    await orm.em.getConnection().execute(
      `insert into "bookings" (
        "id", "seeker_id", "mentor_id", "question", "duration_minutes", "price_minor",
        "currency", "status", "source", "landed_at", "starts_at", "ends_at", "created_at", "updated_at"
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        seeker.id,
        mentor.id,
        'Question',
        25,
        options.bookingPrice ?? 2500,
        options.bookingCurrency ?? 'EUR',
        'pending_payment',
        'link',
        now,
        null,
        null,
        now,
        now,
      ],
      'run',
    );
    await orm.em.getConnection().execute(
      `insert into "payments" (
        "id", "booking_id", "provider", "livemode", "provider_session_id", "provider_payment_id",
        "amount_minor", "currency", "status", "created_at", "updated_at"
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        bookingId,
        'mock',
        false,
        providerSessionId,
        null,
        options.paymentAmount ?? 2500,
        options.paymentCurrency ?? 'EUR',
        'pending',
        now,
        now,
      ],
      'run',
    );
    return { bookingId, paymentId, providerSessionId };
  }

  it('commits both status transitions once and treats a replay as a no-op', async () => {
    const pair = await createPendingPair();
    const repository = new PaymentRepository(orm.em.fork());
    const event = {
      ...pair,
      status: 'succeeded' as const,
      amountMinor: 2500,
      currency: 'EUR',
      providerPaymentId: 'provider-payment-1',
      livemode: true,
    };

    await expect(repository.settleWebhookEvent(event)).resolves.toEqual({
      status: 'transitioned',
      paymentId: pair.paymentId,
      bookingId: pair.bookingId,
    });
    await expect(repository.settleWebhookEvent(event)).resolves.toEqual({ status: 'noop' });

    const rows = (await orm.em.getConnection().execute(
      `select b.status as "bookingStatus", p.status as "paymentStatus", p.provider_payment_id as "providerPaymentId",
        p.livemode as "livemode"
       from "bookings" b join "payments" p on p.booking_id = b.id where b.id = ?`,
      [pair.bookingId],
      'get',
    )) as { bookingStatus: string; paymentStatus: string; providerPaymentId: string; livemode: boolean };
    expect(rows).toEqual({
      bookingStatus: 'paid',
      paymentStatus: 'succeeded',
      providerPaymentId: 'provider-payment-1',
      livemode: true,
    });
    expect(await orm.em.count(StatusTransition, { entityId: pair.bookingId })).toBe(1);
    expect(await orm.em.count(StatusTransition, { entityId: pair.paymentId })).toBe(1);
  });

  it('does not transition on amount, currency, session, or booking mismatches', async () => {
    const pair = await createPendingPair();
    const persistedAmountMismatch = await createPendingPair({ paymentAmount: 2400 });
    const persistedCurrencyMismatch = await createPendingPair({ paymentCurrency: 'USD' });
    const repository = new PaymentRepository(orm.em.fork());
    const baseEvent = {
      ...pair,
      status: 'succeeded' as const,
      amountMinor: 2500,
      currency: 'EUR',
      providerPaymentId: 'provider-payment-2',
      livemode: false,
    };

    await expect(repository.settleWebhookEvent({ ...baseEvent, amountMinor: 2501 })).resolves.toMatchObject({
      status: 'mismatch',
      fields: ['amountMinor'],
    });
    await expect(repository.settleWebhookEvent({ ...baseEvent, currency: 'USD' })).resolves.toMatchObject({
      status: 'mismatch',
      fields: ['currency'],
    });
    await expect(repository.settleWebhookEvent({ ...baseEvent, providerSessionId: 'another-session' })).resolves.toMatchObject({
      status: 'mismatch',
    });
    await expect(repository.settleWebhookEvent({ ...baseEvent, bookingId: randomUUID() })).resolves.toMatchObject({
      status: 'mismatch',
    });
    await expect(repository.settleWebhookEvent({
      ...persistedAmountMismatch,
      status: 'succeeded',
      amountMinor: 2500,
      currency: 'EUR',
      providerPaymentId: 'provider-payment-3',
      livemode: false,
    })).resolves.toMatchObject({ status: 'mismatch', fields: ['amountMinor'] });
    await expect(repository.settleWebhookEvent({
      ...persistedCurrencyMismatch,
      status: 'succeeded',
      amountMinor: 2500,
      currency: 'EUR',
      providerPaymentId: 'provider-payment-4',
      livemode: false,
    })).resolves.toMatchObject({ status: 'mismatch', fields: ['currency'] });

    expect(await orm.em.count(StatusTransition, { entityId: pair.bookingId })).toBe(0);
    expect(await orm.em.count(StatusTransition, { entityId: pair.paymentId })).toBe(0);
    expect(await orm.em.count(StatusTransition, { entityId: persistedAmountMismatch.bookingId })).toBe(0);
    expect(await orm.em.count(StatusTransition, { entityId: persistedAmountMismatch.paymentId })).toBe(0);
    expect(await orm.em.count(StatusTransition, { entityId: persistedCurrencyMismatch.bookingId })).toBe(0);
    expect(await orm.em.count(StatusTransition, { entityId: persistedCurrencyMismatch.paymentId })).toBe(0);
  });

  it('keeps failure terminal when a later completion arrives', async () => {
    const pair = await createPendingPair();
    const repository = new PaymentRepository(orm.em.fork());

    await expect(
      repository.settleWebhookEvent({ ...pair, status: 'failed', providerPaymentId: 'failed-payment-1' }),
    ).resolves.toEqual({
      status: 'transitioned',
      paymentId: pair.paymentId,
      bookingId: pair.bookingId,
    });
    await expect(
      repository.settleWebhookEvent({
        ...pair,
        status: 'succeeded',
        amountMinor: 2500,
        currency: 'EUR',
        providerPaymentId: 'late-payment',
        livemode: false,
      }),
    ).resolves.toEqual({ status: 'noop' });

    const statuses = (await orm.em.getConnection().execute(
      `select b.status as "bookingStatus", p.status as "paymentStatus"
       from "bookings" b join "payments" p on p.booking_id = b.id where b.id = ?`,
      [pair.bookingId],
      'get',
    )) as { bookingStatus: string; paymentStatus: string };
    expect(statuses).toEqual({ bookingStatus: 'payment_failed', paymentStatus: 'failed' });
    expect(await orm.em.count(StatusTransition, { entityId: pair.bookingId })).toBe(1);
    expect(await orm.em.count(StatusTransition, { entityId: pair.paymentId })).toBe(1);
  });
});

describe('InvitationRepository', () => {
  it('enforces lowercase unique e-mails and only accepted, unrevoked invitations are members', async () => {
    const user = await new UserRepository(orm.em.fork()).create({
      email: 'pilot-member@example.com',
      name: 'Pilot Member',
    });
    const invitations = new InvitationRepository(orm.em.fork());
    const unaccepted = await invitations.create({
      email: 'not-accepted@example.com',
      displayName: 'Not Accepted',
      role: 'seeker',
      invitedBy: null,
      acceptedByUserId: null,
      acceptedAt: null,
      revokedAt: null,
    });
    expect(await invitations.isPilotMember(user.id)).toBe(false);
    expect(await invitations.accept(unaccepted.email, user.id, new Date())).toBe(true);
    expect(await invitations.isPilotMember(user.id)).toBe(true);
    expect(await invitations.hasAcceptedRole(user.id, 'seeker')).toBe(true);
    expect(await invitations.hasAcceptedRole(user.id, 'mentor')).toBe(false);
    expect(await invitations.revoke(unaccepted.email, new Date())).toBe(true);
    expect(await invitations.isPilotMember(user.id)).toBe(false);
    expect(await invitations.hasAcceptedRole(user.id, 'seeker')).toBe(false);

    const revoked = await invitations.create({
      email: 'revoked@example.com',
      displayName: 'Revoked',
      role: 'mentor',
      invitedBy: null,
      acceptedByUserId: null,
      acceptedAt: null,
      revokedAt: null,
    });

    describe('MentorProfileRepository', () => {
      it('enforces unique user and slug values, returns listed profiles, and resolves unlisted profiles by slug', async () => {
        const user = await new UserRepository(orm.em.fork()).create({
          email: 'mentor-profile@example.com',
          name: 'Mentor',
        });
        const repository = new MentorProfileRepository(orm.em.fork());
        const saved = await repository.create({
          userId: user.id,
          slug: 'mentor-one',
          headline: 'Backend mentor',
          bio: 'Bio',
          technologies: 'node-js typescript',
          publicWorkUrl: 'https://example.com',
          isListed: true,
          lastActiveAt: null,
        });
        const otherUser = await new UserRepository(orm.em.fork()).create({
          email: 'other-mentor-profile@example.com',
          name: 'Other Mentor',
        });

        await expect(
          new MentorProfileRepository(orm.em.fork()).create({
            userId: user.id,
            slug: 'different-slug',
            headline: 'Duplicate owner',
            bio: 'Bio',
            technologies: 'typescript',
            publicWorkUrl: 'https://example.com',
            isListed: true,
            lastActiveAt: null,
          }),
        ).rejects.toThrow();
        await expect(
          new MentorProfileRepository(orm.em.fork()).create({
            userId: otherUser.id,
            slug: 'mentor-one',
            headline: 'Duplicate slug',
            bio: 'Bio',
            technologies: 'typescript',
            publicWorkUrl: 'https://example.com',
            isListed: false,
            lastActiveAt: null,
          }),
        ).rejects.toThrow();

        await repository.create({
          userId: otherUser.id,
          slug: 'mentor-two',
          headline: 'Unlisted mentor',
          bio: 'Bio',
          technologies: 'python',
          publicWorkUrl: 'https://example.com',
          isListed: false,
          lastActiveAt: null,
        });
        expect((await new MentorProfileRepository(orm.em.fork()).findListed()).map(({ id }) => id)).toEqual([saved.id]);
        expect((await new MentorProfileRepository(orm.em.fork()).findBySlug('mentor-two'))).toMatchObject({
          isListed: false,
        });
        expect(await orm.em.fork().findOne(MentorProfile, { id: saved.id })).toMatchObject({
          technologies: 'node-js typescript',
        });
      });

      it('allows only accepted, unrevoked mentor-role invitations to qualify for mentor profiles', async () => {
        const users = new UserRepository(orm.em.fork());
        const uninvited = await users.create({ email: 'uninvited@example.com', name: 'Uninvited' });
        const seeker = await users.create({ email: 'seeker-profile@example.com', name: 'Seeker' });
        const revokedMentor = await users.create({ email: 'revoked-mentor@example.com', name: 'Revoked Mentor' });
        const mentor = await users.create({ email: 'accepted-mentor@example.com', name: 'Accepted Mentor' });
        const invitations = new InvitationRepository(orm.em.fork());
        const acceptedAt = new Date();
        const createInvitation = (email: string, role: string, acceptedByUserId: string | null, revokedAt: Date | null) =>
          invitations.create({
            email,
            displayName: email,
            role,
            invitedBy: null,
            acceptedByUserId,
            acceptedAt: acceptedByUserId ? acceptedAt : null,
            revokedAt,
          });

        await createInvitation('seeker-profile-invite@example.com', 'seeker', seeker.id, null);
        await createInvitation('revoked-mentor-invite@example.com', 'mentor', revokedMentor.id, acceptedAt);
        await createInvitation('accepted-mentor-invite@example.com', 'mentor', mentor.id, null);

        expect(await invitations.hasAcceptedRole(uninvited.id, 'mentor')).toBe(false);
        expect(await invitations.hasAcceptedRole(seeker.id, 'mentor')).toBe(false);
        expect(await invitations.hasAcceptedRole(revokedMentor.id, 'mentor')).toBe(false);
        expect(await invitations.hasAcceptedRole(mentor.id, 'mentor')).toBe(true);
        expect(await invitations.isPilotMember(seeker.id)).toBe(true);
      });
    });
    await invitations.revoke(revoked.email, new Date());
    expect(await invitations.accept(revoked.email, user.id, new Date())).toBe(false);
    expect(await invitations.isPilotMember(user.id)).toBe(false);

    const invalidEmail = new InvitationRepository(orm.em.fork()).create({
      email: 'UPPERCASE@example.com',
      displayName: 'Invalid',
      role: 'seeker',
      invitedBy: null,
      acceptedByUserId: null,
      acceptedAt: null,
      revokedAt: null,
    });
    await expect(invalidEmail).rejects.toThrow();
    const duplicateEmail = new InvitationRepository(orm.em.fork()).create({
      email: 'not-accepted@example.com',
      displayName: 'Duplicate',
      role: 'mentor',
      invitedBy: null,
      acceptedByUserId: null,
      acceptedAt: null,
      revokedAt: null,
    });
    await expect(duplicateEmail).rejects.toThrow();

    expect(await orm.em.fork().findOne(Invitation, { email: 'not-accepted@example.com' })).toMatchObject({
      role: 'seeker',
    });
  });
});

describe('LoginTokenRepository', () => {
  it('stores the opaque hash and consumes a valid token once under concurrent reuse', async () => {
    const rawToken = Buffer.alloc(32, 7).toString('base64url');
    const tokenHash = await import('node:crypto').then(({ createHash }) =>
      createHash('sha256').update(Buffer.from(rawToken, 'base64url')).digest('hex'),
    );
    const now = new Date('2026-11-05T12:00:00.000Z');
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    await new LoginTokenRepository(orm.em.fork()).create({
      email: 'token@example.com',
      tokenHash,
      expiresAt,
      consumedAt: null,
    });

    const stored = await orm.em.fork().findOne(LoginToken, { tokenHash });
    expect(stored?.tokenHash).toBe(tokenHash);
    expect(JSON.stringify(stored)).not.toContain(rawToken);

    const results = await Promise.all([
      new LoginTokenRepository(orm.em.fork()).consume(tokenHash, now),
      new LoginTokenRepository(orm.em.fork()).consume(tokenHash, now),
    ]);
    expect(results.filter(Boolean)).toEqual(['token@example.com']);
    await expect(new LoginTokenRepository(orm.em.fork()).consume(tokenHash, now)).resolves.toBeNull();
  });

  it('does not consume an expired token', async () => {
    const tokenHash = 'a'.repeat(64);
    const expiredAt = new Date('2026-11-05T11:59:59.999Z');
    await new LoginTokenRepository(orm.em.fork()).create({
      email: 'expired@example.com',
      tokenHash,
      expiresAt: expiredAt,
      consumedAt: null,
    });

    await expect(
      new LoginTokenRepository(orm.em.fork()).consume(tokenHash, new Date('2026-11-05T12:00:00.000Z')),
    ).resolves.toBeNull();
  });
});

describe('UserRepository', () => {
  it('creates a user and finds it by id and by email', async () => {
    const users = new UserRepository(orm.em.fork());
    const created = await users.create({ email: 'ada@example.com', name: 'Ada' });

    const reader = new UserRepository(orm.em.fork());
    expect((await reader.findById(created.id))?.name).toBe('Ada');
    expect((await reader.findByEmail('ada@example.com'))?.id).toBe(created.id);
    expect(await reader.findByEmail('nobody@example.com')).toBeNull();
  });

  it('stores timestamps with time of day, not just the date', async () => {
    const users = new UserRepository(orm.em.fork());
    const created = await users.create({ email: 'time@example.com', name: 'Time' });

    const stored = await new UserRepository(orm.em.fork()).findById(created.id);
    expect(stored?.createdAt.getTime()).toBe(created.createdAt.getTime());
  });

  it('rejects a duplicate email', async () => {
    const users = new UserRepository(orm.em.fork());
    await users.create({ email: 'dup@example.com', name: 'First' });

    const duplicate = await new UserRepository(orm.em.fork())
      .create({ email: 'dup@example.com', name: 'Second' })
      .catch((error: unknown) => error);
    expect(isUniqueConstraintViolation(duplicate)).toBe(true);
    expect(isUniqueConstraintViolation(new Error('something else'))).toBe(false);
  });

  it('updates a user and returns null for an unknown id', async () => {
    const created = await new UserRepository(orm.em.fork()).create({ email: 'up@example.com', name: 'Old' });

    const updated = await new UserRepository(orm.em.fork()).update(created.id, { name: 'New' });
    expect(updated?.name).toBe('New');
    expect((await new UserRepository(orm.em.fork()).findById(created.id))?.name).toBe('New');

    const unknownId = '00000000-0000-4000-8000-000000000000';
    expect(await new UserRepository(orm.em.fork()).update(unknownId, { name: 'x' })).toBeNull();
  });

  it('deletes a user', async () => {
    const created = await new UserRepository(orm.em.fork()).create({ email: 'del@example.com', name: 'Del' });

    expect(await new UserRepository(orm.em.fork()).delete(created.id)).toBe(true);
    expect(await new UserRepository(orm.em.fork()).findById(created.id)).toBeNull();
    expect(await new UserRepository(orm.em.fork()).delete(created.id)).toBe(false);
  });
});

describe('ApprovalRequestRepository', () => {
  it('creates only one refund request when callers race', async () => {
    const data = {
      kind: 'refund',
      subjectType: 'payment',
      subjectId: randomUUID(),
      reason: 'Mentor did not respond.',
    };
    const attempts = await Promise.all([
      new ApprovalRequestRepository(orm.em.fork()).create(data).then(
        (approval) => approval,
        (error: unknown) => error,
      ),
      new ApprovalRequestRepository(orm.em.fork()).create(data).then(
        (approval) => approval,
        (error: unknown) => error,
      ),
    ]);

    expect(attempts.filter((result) => !(result instanceof Error))).toHaveLength(1);
    expect(attempts.filter((result) => result instanceof PendingApprovalConflictError)).toHaveLength(1);
    expect(await orm.em.count(ApprovalRequest, data)).toBe(1);
  });

  it('allows one pending refund per payment and a fresh request after a decision', async () => {
    const data = {
      kind: 'refund',
      subjectType: 'booking',
      subjectId: '00000000-0000-4000-8000-0000000000b1',
      reason: 'Mentor declined.',
    };
    const created = await new ApprovalRequestRepository(orm.em.fork()).create(data);
    const duplicate = new ApprovalRequestRepository(orm.em.fork()).create(data).catch((error: unknown) => error);

    await expect(duplicate).resolves.toBeInstanceOf(PendingApprovalConflictError);
    const decidedAt = new Date('2026-11-05T12:00:00.000Z');
    await new ApprovalRequestRepository(orm.em.fork()).transitionStatus(
      created.id,
      'rejected',
      '00000000-0000-4000-8000-0000000000b2',
      decidedAt,
    );

    const decided = await new ApprovalRequestRepository(orm.em.fork()).findById(created.id);
    expect(decided).toMatchObject({
      status: 'rejected',
      decidedBy: '00000000-0000-4000-8000-0000000000b2',
      decidedAt,
    });
    const retried = await new ApprovalRequestRepository(orm.em.fork()).create(data);
    expect(retried).toMatchObject({ status: 'pending', subjectId: data.subjectId });
    await expect(
      new ApprovalRequestRepository(orm.em.fork()).findPendingBySubject(
        'refund', 'booking', data.subjectId,
      ),
    ).resolves.toMatchObject({ id: retried.id, status: 'pending' });
    expect(retried.id).not.toBe(created.id);
    expect(await new ApprovalRequestRepository(orm.em.fork()).findById(created.id))
      .toMatchObject({ id: created.id, status: 'rejected' });
  });
});

describe('ArticleRepository', () => {
  it('creates articles and lists them by author', async () => {
    const author = await new UserRepository(orm.em.fork()).create({ email: 'author@example.com', name: 'Author' });
    const articles = new ArticleRepository(orm.em.fork());
    const first = await articles.create({ title: 'One', content: 'First', authorId: author.id });
    await articles.create({ title: 'Two', content: 'Second', authorId: author.id });
    await articles.create({
      title: 'Other',
      content: 'Someone else',
      authorId: '00000000-0000-4000-8000-000000000001',
    });

    const reader = new ArticleRepository(orm.em.fork());
    const byAuthor = await reader.findByAuthor(author.id);
    expect(byAuthor.map((article) => article.title).sort()).toEqual(['One', 'Two']);
    expect((await reader.findById(first.id))?.content).toBe('First');
  });
});

describe('ArticleRepository paging, update and delete', () => {
  it('pages newest first and counts the total, optionally per author', async () => {
    const author = '00000000-0000-4000-8000-0000000000a1';
    const articles = new ArticleRepository(orm.em.fork());
    for (const title of ['first', 'second', 'third']) {
      await articles.create({ title, content: title, authorId: author });
      await new Promise((resolve) => setTimeout(resolve, 5)); // distinct createdAt
    }

    const reader = new ArticleRepository(orm.em.fork());
    const firstPage = await reader.findPage({ authorId: author, limit: 2, offset: 0 });
    expect(firstPage.total).toBe(3);
    expect(firstPage.items.map((article) => article.title)).toEqual(['third', 'second']);
    const secondPage = await reader.findPage({ authorId: author, limit: 2, offset: 2 });
    expect(secondPage.items.map((article) => article.title)).toEqual(['first']);
    expect((await reader.findPage({ limit: 100, offset: 0 })).total).toBeGreaterThanOrEqual(3);
  });

  it('updates only the given fields and returns null for an unknown id', async () => {
    const created = await new ArticleRepository(orm.em.fork()).create({
      title: 'Old',
      content: 'Body',
      authorId: '00000000-0000-4000-8000-0000000000a2',
    });

    const updated = await new ArticleRepository(orm.em.fork()).update(created.id, { title: 'New' });
    expect(updated).toMatchObject({ title: 'New', content: 'Body' });
    expect(await new ArticleRepository(orm.em.fork()).update('00000000-0000-4000-8000-000000000000', { title: 'x' })).toBeNull();
  });

  it('deletes an article once', async () => {
    const created = await new ArticleRepository(orm.em.fork()).create({
      title: 'Gone',
      content: 'Soon',
      authorId: '00000000-0000-4000-8000-0000000000a3',
    });

    expect(await new ArticleRepository(orm.em.fork()).delete(created.id)).toBe(true);
    expect(await new ArticleRepository(orm.em.fork()).findById(created.id)).toBeNull();
    expect(await new ArticleRepository(orm.em.fork()).delete(created.id)).toBe(false);
  });
});

describe('ApprovalRequestRepository', () => {
  it('enforces one pending approval per kind and typed subject, then persists a terminal decision', async () => {
    const approvals = new ApprovalRequestRepository(orm.em.fork());
    const subject = '00000000-0000-4000-8000-0000000000b1';
    const created = await approvals.create({
      kind: 'refund',
      subjectType: 'payment',
      subjectId: subject,
      reason: 'Customer request',
    });

    const duplicate = await new ApprovalRequestRepository(orm.em.fork())
      .create({ kind: 'refund', subjectType: 'payment', subjectId: subject, reason: 'Duplicate' })
      .catch((error: unknown) => error);
    expect(duplicate).toMatchObject({ name: 'PendingApprovalConflictError' });

    await expect(
      new ApprovalRequestRepository(orm.em.fork()).create({
        kind: 'refund',
        subjectType: 'booking',
        subjectId: subject,
        reason: 'Different subject type',
      }),
    ).resolves.toBeDefined();

    const decidedAt = new Date('2026-11-05T12:00:00.000Z');
    await expect(
      new ApprovalRequestRepository(orm.em.fork()).transitionStatus(
        created.id,
        'approved',
        '00000000-0000-4000-8000-0000000000b2',
        decidedAt,
      ),
    ).resolves.toBe(true);

    const stored = await new ApprovalRequestRepository(orm.em.fork()).findById(created.id);
    expect(stored).toMatchObject({
      status: 'approved',
      decidedBy: '00000000-0000-4000-8000-0000000000b2',
      decidedAt,
    });
    expect(await orm.em.count(StatusTransition, { entityType: 'ApprovalRequest', entityId: created.id })).toBe(1);
    await expect(
      new ApprovalRequestRepository(orm.em.fork()).create({
        kind: 'refund',
        subjectType: 'payment',
        subjectId: subject,
        reason: 'Retry after prior decision',
      }),
    ).resolves.toBeDefined();
    await expect(
      orm.em.getConnection().execute(
        'update "approval_requests" set "decided_by" = null where "id" = ?',
        [created.id],
        'run',
      ),
    ).rejects.toThrow();
    expect(await orm.em.count(ApprovalRequest, { id: created.id, status: 'approved' })).toBe(1);
  });
});

describe('transitionStatus', () => {
  async function createPendingArticle(): Promise<string> {
    const article = await new ArticleRepository(orm.em.fork()).create({
      title: 'Workflow target',
      content: 'Transition test',
      authorId: '00000000-0000-4000-8000-0000000000a4',
    });
    await orm.em.getConnection().execute(
      'update "articles" set "status" = ? where "id" = ?',
      ['pending', article.id],
      'run',
    );
    return article.id;
  }

  it('allows only one concurrent transition and writes exactly one history row', async () => {
    const articleId = await createPendingArticle();
    const attempts = await Promise.all([
      transitionStatus(orm.em.fork(), {
        entityType: 'Article',
        entityId: articleId,
        from: ['pending'],
        to: 'accepted',
        actor: { kind: 'user', userId: '00000000-0000-4000-8000-0000000000a5' },
      }).then(() => 'success', (error: unknown) => error),
      transitionStatus(orm.em.fork(), {
        entityType: 'Article',
        entityId: articleId,
        from: ['pending'],
        to: 'declined',
        actor: { kind: 'system' },
      }).then(() => 'success', (error: unknown) => error),
    ]);

    expect(attempts.filter((result) => result === 'success')).toHaveLength(1);
    const conflict = attempts.find((result) => result !== 'success');
    expect(conflict).toMatchObject({ name: 'ConflictError', code: 'conflict' });
    const transitions = await orm.em.find(StatusTransition, { entityType: 'Article', entityId: articleId });
    expect(transitions).toHaveLength(1);
  });

  it('joins a caller transaction so its rollback also removes the history row', async () => {
    const articleId = await createPendingArticle();
    const em = orm.em.fork();

    await expect(
      em.transactional(async (transactionalEm) => {
        await new UserRepository(transactionalEm).create({
          email: 'transition-composition-rollback@example.com',
          name: 'Rollback',
        });
        await transitionStatus(transactionalEm, {
          entityType: 'Article',
          entityId: articleId,
          from: ['pending'],
          to: 'accepted',
          actor: { kind: 'system' },
        });
        throw new Error('roll back composition');
      }),
    ).rejects.toThrow('roll back composition');

    const row = (await orm.em.getConnection().execute(
      'select "status" from "articles" where "id" = ?',
      [articleId],
      'get',
    )) as { status: string } | undefined;
    expect(row?.status).toBe('pending');
    expect(await orm.em.count(StatusTransition, { entityType: 'Article', entityId: articleId })).toBe(0);
    expect(await new UserRepository(orm.em.fork()).findByEmail('transition-composition-rollback@example.com')).toBeNull();
  });

  it('treats a replay as a no-op when ifAlready is enabled', async () => {
    const articleId = await createPendingArticle();
    const em = orm.em.fork();
    const input = {
      entityType: 'Article',
      entityId: articleId,
      from: ['pending'],
      to: 'accepted',
      actor: { kind: 'webhook' as const },
    };

    await expect(transitionStatus(em, input)).resolves.toBe(true);
    await expect(transitionStatus(em.fork(), { ...input, ifAlready: true })).resolves.toBe(false);
    expect(await orm.em.count(StatusTransition, { entityType: 'Article', entityId: articleId })).toBe(1);
  });
});

describe('User password hash', () => {
  it('is stored, loaded, and left out of the serialized entity', async () => {
    const created = await new UserRepository(orm.em.fork()).create({
      email: 'hash@example.com',
      name: 'Hash',
      passwordHash: '$2b$12$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz01234',
    });

    const stored = await new UserRepository(orm.em.fork()).findById(created.id);
    expect(stored?.passwordHash).toMatch(/^\$2b\$12\$/);
    expect(JSON.parse(JSON.stringify(stored))).not.toHaveProperty('passwordHash');
  });
});

describe('migrations (down)', () => {
  it('reverts the history table and renames the remaining tables back without losing rows', async () => {
    const created = await new UserRepository(orm.em.fork()).create({ email: 'rename@example.com', name: 'Rename' });

    await orm.migrator.down(); // status_transitions
    expect(await publicTables()).toEqual(['articles', 'mikro_orm_migrations', 'users']);
    await orm.migrator.up();
    await orm.migrator.down(); // add_user_password_hash
    await orm.migrator.down(); // plural_table_names
    expect(await publicTables()).toEqual(['article', 'mikro_orm_migrations', 'user']);
    const rows: { email: string }[] = await orm.em.getConnection().execute('select email from "user" where id = ?', [created.id]);
    expect(rows).toEqual([{ email: 'rename@example.com' }]);

    await orm.migrator.up();
    await orm.migrator.up();
    await orm.migrator.up();
    expect(await publicTables()).toEqual(['articles', 'mikro_orm_migrations', 'status_transitions', 'users']);
  });

  it('remove the application tables when everything is reverted', async () => {
    await orm.migrator.down({ to: 0 });
    expect(await publicTables()).toEqual(['mikro_orm_migrations']);
  });
});

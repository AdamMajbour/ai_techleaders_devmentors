/** @jest-environment node */
import type { Booking, Message } from '@devmentor/db';
import { createEventBus } from '../../events/event-bus';
import { ConflictError, NotFoundError, ValidationError } from '../../http/errors';
import { MessageService } from './message.service';

const SEEKER_ID = '00000000-0000-4000-8000-000000000001';
const MENTOR_ID = '00000000-0000-4000-8000-000000000002';
const OUTSIDER_ID = '00000000-0000-4000-8000-000000000003';
const BOOKING_ID = '00000000-0000-4000-8000-000000000004';
const MESSAGE_ID = '00000000-0000-4000-8000-000000000005';
const START = new Date('2026-11-06T12:00:00.000Z');
const END = new Date('2026-11-06T12:25:00.000Z');
const now = { value: new Date('2026-11-06T12:10:00.000Z') };

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: BOOKING_ID,
    seekerId: SEEKER_ID,
    mentorId: MENTOR_ID,
    status: 'accepted',
    startsAt: START,
    endsAt: END,
    ...overrides,
  } as Booking;
}

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: MESSAGE_ID,
    bookingId: BOOKING_ID,
    authorId: SEEKER_ID,
    body: 'Here is the issue.',
    createdAt: now.value,
    ...overrides,
  } as Message;
}

function setup(options: { booking?: Booking | null; rows?: Message[] } = {}) {
  const bookingRepository = { findById: jest.fn(async () => options.booking === undefined ? booking() : options.booking) };
  const messageRepository = {
    create: jest.fn(async (input: { authorId: string; body: string }) => message(input)),
    findByBookingAfter: jest.fn(async () => options.rows ?? []),
  };
  const userRepository = { findById: jest.fn(async () => ({ id: SEEKER_ID, name: 'Seeker' }) as never) };
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const eventBus = createEventBus(logger);
  const posted = jest.fn();
  eventBus.on('messages.message.posted', posted);
  const service = new MessageService({
    bookingRepository: bookingRepository as never,
    messageRepository: messageRepository as never,
    userRepository: userRepository as never,
    eventBus,
    clock: { now: () => new Date(now.value) },
  });
  return { service, bookingRepository, messageRepository, userRepository, posted, logger };
}

describe('MessageService', () => {
  afterEach(() => {
    now.value = new Date('2026-11-06T12:10:00.000Z');
  });

  it.each([SEEKER_ID, MENTOR_ID])('allows an accepted participant (%s) to read after the session ends', async (userId) => {
    const row = message();
    const deps = setup({ rows: [row] });
    now.value = new Date('2026-11-06T12:30:00.000Z');

    await expect(deps.service.list({ userId }, BOOKING_ID)).resolves.toMatchObject({
      items: [{ id: MESSAGE_ID, authorName: 'Seeker', text: 'Here is the issue.' }],
      nextCursor: null,
      serverTime: now.value.toISOString(),
    });
  });

  it('conceals the conversation from nonparticipants before querying messages', async () => {
    const deps = setup();

    await expect(deps.service.list({ userId: OUTSIDER_ID }, BOOKING_ID)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deps.service.post({ userId: OUTSIDER_ID }, BOOKING_ID, 'hello')).rejects.toBeInstanceOf(NotFoundError);
    expect(deps.messageRepository.findByBookingAfter).not.toHaveBeenCalled();
    expect(deps.messageRepository.create).not.toHaveBeenCalled();
  });

  it('allows posting at startsAt and records only message, booking and author ids in the event', async () => {
    const deps = setup();
    now.value = START;

    await expect(deps.service.post({ userId: SEEKER_ID }, BOOKING_ID, '  formatted\n message  ')).resolves.toMatchObject({
      text: '  formatted\n message  ',
    });
    expect(deps.messageRepository.create).toHaveBeenCalledWith({
      bookingId: BOOKING_ID,
      authorId: SEEKER_ID,
      body: '  formatted\n message  ',
    });
    expect(deps.posted).toHaveBeenCalledWith({ messageId: MESSAGE_ID, bookingId: BOOKING_ID, authorId: SEEKER_ID });
    expect(JSON.stringify(deps.posted.mock.calls)).not.toContain('formatted');
  });

  it.each([
    ['before the session', new Date(START.getTime() - 1)],
    ['at the session end', END],
  ])('rejects posting %s', async (_label, time) => {
    const deps = setup();
    now.value = time;

    await expect(deps.service.post({ userId: MENTOR_ID }, BOOKING_ID, 'hello')).rejects.toBeInstanceOf(ConflictError);
    expect(deps.messageRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    ['m'.repeat(2001), 'longer than 2000 characters'],
  ])('rejects a %s message body', async (body) => {
    const deps = setup();
    await expect(deps.service.post({ userId: SEEKER_ID }, BOOKING_ID, body)).rejects.toBeInstanceOf(ValidationError);
    expect(deps.messageRepository.create).not.toHaveBeenCalled();
  });

  it('rejects messages for bookings that are not accepted or have no session window', async () => {
    for (const state of [
      { status: 'paid', startsAt: START, endsAt: END },
      { status: 'accepted', startsAt: null, endsAt: null },
    ]) {
      const deps = setup({ booking: booking(state as Partial<Booking>) });
      await expect(deps.service.list({ userId: SEEKER_ID }, BOOKING_ID)).rejects.toBeInstanceOf(NotFoundError);
      await expect(deps.service.post({ userId: SEEKER_ID }, BOOKING_ID, 'hello')).rejects.toBeInstanceOf(NotFoundError);
    }
  });

  it('uses a stable keyset cursor and exposes no messages from an invalid cursor', async () => {
    const rows = Array.from({ length: 51 }, (_, index) => message({
      id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
      createdAt: new Date(START.getTime() + index),
    }));
    const deps = setup({ rows });
    const firstPage = await deps.service.list({ userId: SEEKER_ID }, BOOKING_ID);

    expect(firstPage.items).toHaveLength(50);
    expect(firstPage.nextCursor).toBeTruthy();
    expect(deps.messageRepository.findByBookingAfter).toHaveBeenCalledWith(BOOKING_ID, null, 51);
    await deps.service.list({ userId: SEEKER_ID }, BOOKING_ID, firstPage.nextCursor ?? undefined);
    expect(deps.messageRepository.findByBookingAfter).toHaveBeenLastCalledWith(
      BOOKING_ID,
      { createdAt: rows[49].createdAt, id: rows[49].id },
      51,
    );
    await expect(deps.service.list({ userId: SEEKER_ID }, BOOKING_ID, 'invalid'))
      .rejects.toBeInstanceOf(ValidationError);
  });
});

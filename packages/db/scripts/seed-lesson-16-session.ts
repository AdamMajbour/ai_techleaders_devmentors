import '../src/load-env';
import { Booking, Message, User, closeORM, initializeORM } from '../src';

const BOOKING_ID = '0e7c8b4a-ef14-4e71-a618-161600000003';
const MESSAGE_IDS = [
  '0e7c8b4a-ef14-4e71-a618-161600000004',
  '0e7c8b4a-ef14-4e71-a618-161600000005',
] as const;

async function main(): Promise<void> {
  const orm = await initializeORM();
  const em = orm.em.fork();
  const mentee = await em.findOne(User, { email: 'mock-mentee@devmentor.test' });
  const mentor = await em.findOne(User, { email: 'mock-mentor@devmentor.test' });
  if (!mentee || !mentor) throw new Error('Demo mentee or mentor is missing; run the demo seed first.');

  let booking = await em.findOne(Booking, { id: BOOKING_ID });
  const startsAt = new Date(Date.now() - 60_000);
  const endsAt = new Date(startsAt.getTime() + 25 * 60_000);
  if (!booking) {
    booking = em.create(Booking, {
      id: BOOKING_ID,
      seekerId: mentee.id,
      mentorId: mentor.id,
      question: 'Prywatna sesja tekstowa do weryfikacji kontroli dostępu.',
      durationMinutes: 25,
      priceMinor: 1,
      currency: 'PLN',
      status: 'accepted',
      source: 'link',
      landedAt: startsAt,
      startsAt,
      endsAt,
      availabilitySlotId: null,
    });
    em.persist(booking);
    await em.flush();
  } else {
    // This fixture is refreshed before a recording; keep its existing ID and messages,
    // but ensure the booking remains open even when a previous run has expired.
    booking.startsAt = startsAt;
    booking.endsAt = endsAt;
    booking.status = 'accepted';
    await em.flush();
  }

  for (const [index, id] of MESSAGE_IDS.entries()) {
    if (!(await em.findOne(Message, { id }))) {
      em.persist(em.create(Message, {
        id,
        bookingId: booking.id,
        authorId: index === 0 ? mentee.id : mentor.id,
        body: index === 0 ? 'Cześć, sprawdźmy prywatny wątek.' : 'Jasne, widzę wiadomość w sesji.',
      }));
    }
  }
  await em.flush();
  console.log('Seeded the lesson 16 private text-session fixture.');
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(closeORM);

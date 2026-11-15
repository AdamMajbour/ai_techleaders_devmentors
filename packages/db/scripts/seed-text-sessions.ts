// Seeds three local text-session fixtures. Idempotent: keeps stable booking/message IDs.
// Usage: npm run db:seed:text-sessions (demo seed and migrations must be applied first)
import '../src/load-env';
import { Booking, Message, User, closeORM, initializeORM } from '../src';

const FIXTURES = [
  {
    bookingId: '0e7c8b4a-ef14-4e71-a618-261100000001',
    messageIds: ['0e7c8b4a-ef14-4e71-a618-261100000011', '0e7c8b4a-ef14-4e71-a618-261100000012'],
    kind: 'upcoming',
    question: 'Chcę omówić plan rozwoju aplikacji i podział odpowiedzialności między modułami.',
    messages: ['Cześć! Zostawiłem tu kilka pytań do naszej sesji.', 'Cześć! Widzę temat. Przygotuję propozycję podziału modułów.'],
  },
  {
    bookingId: '0e7c8b4a-ef14-4e71-a618-261100000002',
    messageIds: ['0e7c8b4a-ef14-4e71-a618-261100000021', '0e7c8b4a-ef14-4e71-a618-261100000022'],
    kind: 'active',
    question: 'Potrzebuję pomocy z diagnozą problemu w aplikacji TypeScript.',
    messages: ['Jestem już na miejscu. Problem pojawia się po odświeżeniu strony.', 'Zaczynajmy — pokaż proszę, co widzisz w konsoli.'],
  },
  {
    bookingId: '0e7c8b4a-ef14-4e71-a618-261100000003',
    messageIds: ['0e7c8b4a-ef14-4e71-a618-261100000031', '0e7c8b4a-ef14-4e71-a618-261100000032'],
    kind: 'finished',
    question: 'Chcę skonsultować testy i obsługę błędów w moim API.',
    messages: ['Dziękuję za wspólne przejrzenie testów.', 'Dzięki! Ustaliliśmy trzy poprawki do wdrożenia.'],
  },
] as const;

async function main(): Promise<void> {
  const orm = await initializeORM();
  const em = orm.em.fork();
  const seeker = await em.findOne(User, { email: 'mock-mentee@devmentor.test' });
  const mentor = await em.findOne(User, { email: 'mock-mentor@devmentor.test' });
  if (!seeker || !mentor) throw new Error('Demo mentee or mentor is missing; run npm run db:seed first.');

  const now = new Date();
  for (const fixture of FIXTURES) {
    const startsAt = fixture.kind === 'upcoming'
      ? new Date(now.getTime() + 24 * 60 * 60_000)
      : fixture.kind === 'active'
        ? new Date(now.getTime() - 5 * 60_000)
        : new Date(now.getTime() - 48 * 60 * 60_000);
    const endsAt = fixture.kind === 'active'
      ? new Date(now.getTime() + 20 * 60_000)
      : new Date(startsAt.getTime() + 25 * 60_000);

    let booking = await em.findOne(Booking, { id: fixture.bookingId });
    if (!booking) {
      booking = em.create(Booking, {
        id: fixture.bookingId,
        seekerId: seeker.id,
        mentorId: mentor.id,
        question: fixture.question,
        durationMinutes: 25,
        priceMinor: 2500,
        currency: 'PLN',
        status: 'accepted',
        source: 'list',
        landedAt: now,
        startsAt,
        endsAt,
        availabilitySlotId: null,
      });
      em.persist(booking);
    } else {
      booking.seekerId = seeker.id;
      booking.mentorId = mentor.id;
      booking.question = fixture.question;
      booking.status = 'accepted';
      booking.startsAt = startsAt;
      booking.endsAt = endsAt;
    }
    await em.flush();

    for (const [index, id] of fixture.messageIds.entries()) {
      const message = await em.findOne(Message, { id });
      const data = {
        bookingId: booking.id,
        authorId: index === 0 ? seeker.id : mentor.id,
        body: fixture.messages[index],
      };
      if (!message) em.persist(em.create(Message, { id, ...data }));
      else {
        message.bookingId = data.bookingId;
        message.authorId = data.authorId;
        message.body = data.body;
      }
    }
    await em.flush();
  }
  console.log('Seeded upcoming, active, and past text-session fixtures for mock-mentee@devmentor.test.');
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(closeORM);

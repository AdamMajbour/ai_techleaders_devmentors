// Adds demo data for lesson 14: testing fixes and reviewing regressions.
// Usage: npm run db:seed:lesson-14 (migrations must be applied first)
import '../src/load-env';
import { Booking, SessionNote, User, closeORM, initializeORM } from '../src';

const LESSON_14_MENTOR = {
  id: '0e7c8b4a-ef14-4e71-a618-141400000001',
  email: 'lesson-14-mentor@devmentor.test',
  name: 'Mentor Lekcji 14',
} as const;

const LESSON_14_SEEKER = {
  id: '0e7c8b4a-ef14-4e71-a618-141400000002',
  email: 'lesson-14-learner@devmentor.test',
  name: 'Uczestnik Lekcji 14',
} as const;

const LESSON_14_BOOKING_ID = '0e7c8b4a-ef14-4e71-a618-141400000003';
const LESSON_14_NOTE_ID = '0e7c8b4a-ef14-4e71-a618-141400000004';
const WARSAW_TIME_ZONE = 'Europe/Warsaw';

function getWarsawOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: WARSAW_TIME_ZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const offset = parts.find((part) => part.type === 'timeZoneName')?.value;
  const match = offset?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) throw new Error(`Could not determine ${WARSAW_TIME_ZONE} UTC offset.`);

  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

function getReproductionStart(now: Date): Date {
  const winterOffset = 60;
  const summerOffset = 120;
  const offset = getWarsawOffsetMinutes(now);
  const delayMinutes = offset === summerOffset ? 30 : offset === winterOffset ? 90 : 30;
  return new Date(now.getTime() + delayMinutes * 60_000);
}

async function main(): Promise<void> {
  const orm = await initializeORM();
  const em = orm.em.fork();

  for (const user of [LESSON_14_MENTOR, LESSON_14_SEEKER]) {
    const existing = await em.findOne(User, { email: user.email });
    if (!existing) em.persist(em.create(User, { ...user, passwordHash: null } as never));
  }
  await em.flush();

  let booking = await em.findOne(Booking, { id: LESSON_14_BOOKING_ID });
  if (!booking) {
    const startsAt = getReproductionStart(new Date());
    const endsAt = new Date(startsAt.getTime() + 25 * 60_000);
    booking = em.create(Booking, {
      id: LESSON_14_BOOKING_ID,
      seekerId: LESSON_14_SEEKER.id,
      mentorId: LESSON_14_MENTOR.id,
      question: 'Lekcja 14: sprawdzenie poprawki do walidacji formularza i wyszukanie możliwych regresji.',
      durationMinutes: 25,
      priceMinor: 0,
      currency: 'PLN',
      status: 'accepted',
      source: 'lesson-14-seed',
      landedAt: startsAt,
      startsAt,
      endsAt,
      availabilitySlotId: null,
    });
    em.persist(booking);
  }

  const existingNote = await em.findOne(SessionNote, { id: LESSON_14_NOTE_ID });
  if (!existingNote) {
    em.persist(em.create(SessionNote, {
      id: LESSON_14_NOTE_ID,
      bookingId: booking.id,
      mentorId: LESSON_14_MENTOR.id,
      seekerId: LESSON_14_SEEKER.id,
      title: 'Lekcja 14: Testowanie i poprawki',
      content: [
        'Temat: Nie ufaj pierwszemu fixowi.',
        '',
        'Ćwiczenie: odtwórz błąd walidacji formularza, opisz oczekiwane zachowanie i przygotuj minimalną poprawkę.',
        'Weryfikacja: uruchom test regresyjny oraz test przepływu w Playwright; sprawdź także przypadki brzegowe.',
        'Review: poproś drugiego agenta o niezależny przegląd diffu pod kątem regresji i brakujących testów.',
        'Kryterium zaliczenia: test odtwarza błąd przed poprawką i przechodzi po niej; kontrola zakresu nie ujawnia niepowiązanych zmian.',
      ].join('\n'),
      seekerApprovedAt: null,
      withdrawnAt: null,
    }));
  }

  await em.flush();
  console.log('Seeded lesson 14 demo users, a near-future accepted booking, and a session note.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeORM);

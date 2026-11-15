// Seeds a local database with demo data. Idempotent: safe to run repeatedly.
// Usage: npm run db:seed   (migrations must be applied first)
import '../src/load-env';
import bcrypt from 'bcryptjs';
import { ArticleRepository, AvailabilitySlotRepository, BookingRepository, closeORM, initializeORM, InvitationRepository, MentorProfileRepository, MessageRepository, TermsRepository, UserRepository } from '../src';
import { DEMO_ARTICLE_TITLE, DEMO_AUTHOR, DEMO_LEARNER, DEMO_PERSONAS } from './seed-data';
import { ensureDemoSeekerTerms } from './demo-seeker-terms';
import { assertDemoSeedAllowed } from './seed-environment';
import { Booking, Payment } from '../src/entities';
import { transitionStatus } from '../src/repositories/transition';

const SEED_BCRYPT_COST = 12;

function hashDemoPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SEED_BCRYPT_COST);
}

async function main(): Promise<void> {
  assertDemoSeedAllowed(process.env);

  const orm = await initializeORM();
  const em = orm.em.fork();
  const users = new UserRepository(em);
  const articles = new ArticleRepository(em);

  const operatorIds = new Set((process.env.OPERATOR_USER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean));

  for (const data of [DEMO_AUTHOR, DEMO_LEARNER]) {
    const existingUser = await users.findByEmail(data.email);
    const passwordHash = data.id === DEMO_LEARNER.id ? await hashDemoPassword('mock-mentee-password') : null;
    if (!existingUser) await users.create({ ...data, passwordHash });
    else if (data.id === DEMO_LEARNER.id && !existingUser.passwordHash) {
      await users.update(existingUser.id, { passwordHash });
    }
  }

  const invitations = new InvitationRepository(em);
  const learnerInvitation = await invitations.findByEmail(DEMO_LEARNER.email);
  if (!learnerInvitation) await invitations.create({
    email: DEMO_LEARNER.email,
    displayName: DEMO_LEARNER.name,
    role: 'seeker',
    invitedBy: null,
    acceptedByUserId: DEMO_LEARNER.id,
    acceptedAt: new Date(),
    revokedAt: null,
  });
  else if (!learnerInvitation.acceptedByUserId || !learnerInvitation.acceptedAt || learnerInvitation.revokedAt) {
    await em.nativeUpdate((await import('../src/entities')).Invitation, { id: learnerInvitation.id }, {
      acceptedByUserId: DEMO_LEARNER.id, acceptedAt: new Date(), revokedAt: null,
    });
  }
  let mentorUserId: string = DEMO_PERSONAS.mentor.id;
  const additionalMentors = [DEMO_PERSONAS.mentorFrontend, DEMO_PERSONAS.mentorBackend];
  for (const persona of [DEMO_PERSONAS.mentee, DEMO_PERSONAS.mentor, ...additionalMentors, DEMO_PERSONAS.operator, DEMO_PERSONAS.ada, DEMO_PERSONAS.noBioMentor]) {
    let existingUser = await users.findByEmail(persona.email);
    if (!existingUser) {
      existingUser = await users.create({ id: persona.id, email: persona.email, name: persona.name, passwordHash: 'password' in persona ? await hashDemoPassword(persona.password) : null });
    } else if ('password' in persona && !existingUser.passwordHash) {
      existingUser = (await users.update(existingUser.id, { passwordHash: await hashDemoPassword(persona.password) }))!;
    } else if (!('password' in persona) && existingUser.passwordHash) {
      existingUser = (await users.update(existingUser.id, { passwordHash: null }))!;
    }
    if (persona === DEMO_PERSONAS.mentor) mentorUserId = existingUser.id;

    if (!(await invitations.findByEmail(persona.email))) {
      await invitations.create({
        email: persona.email,
        displayName: persona.name,
        role: persona.invitationRole,
        invitedBy: null,
        acceptedByUserId: existingUser.id,
        acceptedAt: new Date(),
        revokedAt: null,
      });
    }
  }

  const operator = DEMO_PERSONAS.operator;
  const now = new Date();

  const mentorProfiles = new MentorProfileRepository(em);
  const mentorProfilesToSeed = [
    { userId: mentorUserId, slug: 'mock-mentor', headline: 'Senior TypeScript & Next.js mentor', bio: 'Pomagam projektować aplikacje w TypeScript i Next.js, poprawiać jakość kodu oraz przygotować się do rozmów technicznych. Pracuję na konkretnych przykładach z Twojego projektu.', technologies: 'typescript nextjs react nodejs', publicWorkUrl: 'https://devmentor.test', githubUrl: 'https://github.com', isListed: true },
    ...additionalMentors.map((persona, index) => ({
      userId: persona.id,
      slug: index === 0 ? 'maja-frontend' : 'tomasz-backend',
      headline: index === 0 ? 'Frontend mentor: React, UX i dostępność' : 'Backend mentor: Node.js, API i PostgreSQL',
      bio: index === 0
        ? 'Pomagam budować dostępne i szybkie interfejsy w React. Wspólnie przejrzymy komponenty, testy i decyzje UX, a po sesji dostaniesz konkretny plan dalszej pracy.'
        : 'Pomagam projektować API i usługi backendowe w Node.js. Możemy wspólnie zdiagnozować problem z bazą, omówić architekturę lub przećwiczyć projektowanie systemów.',
      technologies: index === 0 ? 'react typescript nextjs accessibility css' : 'nodejs typescript postgresql api docker',
      publicWorkUrl: 'https://devmentor.test',
      githubUrl: 'https://github.com',
      isListed: true,
    })),
  ];
  for (const profile of mentorProfilesToSeed) {
    const existingProfile = await mentorProfiles.findByUserId(profile.userId);
    if (!existingProfile) await mentorProfiles.create({ ...profile, lastActiveAt: null });
    else await mentorProfiles.update(existingProfile.id, profile);
  }

  const noBioMentor = DEMO_PERSONAS.noBioMentor;
  const noBioMentorUser = await users.findByEmail(noBioMentor.email);
  if (noBioMentorUser && !(await mentorProfiles.findByUserId(noBioMentorUser.id))) {
    await mentorProfiles.create({
      userId: noBioMentorUser.id,
      slug: 'mentor-without-bio',
      headline: 'TypeScript mentor',
      bio: '',
      technologies: 'typescript',
      publicWorkUrl: 'https://devmentor.test',
      isListed: true,
      lastActiveAt: null,
    });
  }

  await seedDemoSessions(em, now, mentorUserId, additionalMentors.map((persona) => persona.id), DEMO_LEARNER.id);

  const availabilitySlots = new AvailabilitySlotRepository(em);
  const bookableFrom = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const bookableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const demoMentors = [mentorUserId, noBioMentorUser?.id].filter((id): id is string => Boolean(id));
  for (const mentorId of demoMentors) {
    const available = await availabilitySlots.findOpenForMentor(mentorId, bookableFrom, bookableUntil);
    const firstStartMs = Math.ceil((now.getTime() + 8 * 60 * 60 * 1000) / (15 * 60 * 1000)) * (15 * 60 * 1000);
    const has25MinuteWindow = available.some((slot) => slot.endsAt.getTime() - slot.startsAt.getTime() === 25 * 60 * 1000);
    const has50MinuteWindow = available.some((slot) => slot.endsAt.getTime() - slot.startsAt.getTime() === 50 * 60 * 1000);
    if (!has25MinuteWindow) {
      const startsAt = new Date(firstStartMs);
      await availabilitySlots.create({ mentorId, startsAt, endsAt: new Date(startsAt.getTime() + 25 * 60 * 1000) });
    }
    if (!has50MinuteWindow) {
      const startsAt = new Date(firstStartMs + 2 * 60 * 60 * 1000);
      await availabilitySlots.create({ mentorId, startsAt, endsAt: new Date(startsAt.getTime() + 50 * 60 * 1000) });
    }
  }

  await ensureDemoSeekerTerms(new TermsRepository(em), operator.id, now);

  const existing = await articles.findByAuthor(DEMO_AUTHOR.id);
  if (!existing.some((article) => article.title === DEMO_ARTICLE_TITLE)) {
    await articles.create({
      title: DEMO_ARTICLE_TITLE,
      content: 'Welcome to DevMentor. This article was created by the seed script.',
      authorId: DEMO_AUTHOR.id,
    });
  }

  console.log('Seeded demo users, 4 mentor profiles, bookable windows, sample sessions and messages, seeker demo terms, and 1 article.');
  console.log(`Demo operator ID: ${operator.id}${operatorIds.has(operator.id) ? ' (operator panel enabled).' : ' (add it to OPERATOR_USER_IDS to enable the operator panel).'}`);
}

async function seedDemoSessions(
  em: Parameters<typeof transitionStatus>[0],
  now: Date,
  primaryMentorId: string,
  additionalMentorIds: string[],
  seekerId: string,
): Promise<void> {
  const sessionIds = [
    'e11c9966-335e-4d28-ae8f-9f8a44b78d01',
    'e11c9966-335e-4d28-ae8f-9f8a44b78d02',
    'e11c9966-335e-4d28-ae8f-9f8a44b78d03',
    'e11c9966-335e-4d28-ae8f-9f8a44b78d04',
    'e11c9966-335e-4d28-ae8f-9f8a44b78d05',
  ];
  const existing = await em.find(Booking, { id: { $in: sessionIds } });
  const existingById = new Set(existing.map((booking) => booking.id));
  const scenarios = [
    { status: 'pending_payment', mentorId: primaryMentorId, days: 2, question: 'Chcę skonsultować architekturę aplikacji w Next.js i sposób podziału logiki między warstwy.' },
    { status: 'payment_failed', mentorId: additionalMentorIds[0], days: 3, question: 'Mam problem z optymalizacją formularza w React. Czy możemy przejrzeć stan i walidację?' },
    { status: 'paid', mentorId: additionalMentorIds[1], days: 4, question: 'Proszę o przegląd projektu API w Node.js i modelu danych w PostgreSQL.' },
    { status: 'accepted', mentorId: primaryMentorId, days: 5, question: 'Przygotowuję się do rozmowy na stanowisko senior frontend. Chętnie przećwiczę zadanie z TypeScript.' },
    { status: 'declined', mentorId: additionalMentorIds[0], days: 6, question: 'Chciałbym omówić dostępność i testowanie komponentów React.' },
  ] as const;
  const messages = new MessageRepository(em);
  const bookings = new BookingRepository(em);

  for (let index = 0; index < scenarios.length; index += 1) {
    const scenario = scenarios[index];
    const id = sessionIds[index];
    if (existingById.has(id)) continue;
    const startsAt = new Date(now.getTime() + scenario.days * 24 * 60 * 60 * 1000);
    startsAt.setMinutes(0, 0, 0);
    const booking = em.create(Booking, {
      id,
      seekerId,
      mentorId: scenario.mentorId,
      question: scenario.question,
      durationMinutes: 25,
      priceMinor: 5000,
      currency: 'PLN',
      status: 'pending_payment',
      source: 'list',
      landedAt: now,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 25 * 60 * 1000),
      availabilitySlotId: null,
    });
    em.persist(booking);
    await em.flush();

    if (scenario.status === 'pending_payment' || scenario.status === 'payment_failed') {
      const payment = em.create(Payment, {
        bookingId: id,
        vaultAnswerId: null,
        provider: 'mock',
        livemode: false,
        providerSessionId: scenario.status === 'pending_payment' ? `demo-session-${id}` : null,
        providerPaymentId: null,
        amountMinor: 5000,
        currency: 'PLN',
        status: 'pending',
      });
      em.persist(payment);
      await em.flush();
    }
    if (scenario.status === 'payment_failed') {
      await bookings.failCheckout(id);
    } else if (scenario.status === 'paid' || scenario.status === 'accepted' || scenario.status === 'declined') {
      const payment = em.create(Payment, {
        bookingId: id,
        vaultAnswerId: null,
        provider: 'mock',
        livemode: false,
        providerSessionId: `demo-session-${id}`,
        providerPaymentId: `demo-payment-${id}`,
        amountMinor: 5000,
        currency: 'PLN',
        status: 'pending',
      });
      em.persist(payment);
      await em.flush();
      await transitionStatus(em, { entityType: 'Payment', entityId: payment.id, from: ['pending'], to: 'succeeded', actor: { kind: 'system' }, patch: { providerPaymentId: `demo-payment-${id}` } });
      await transitionStatus(em, { entityType: 'Booking', entityId: id, from: ['pending_payment'], to: 'paid', actor: { kind: 'system' } });
      if (scenario.status === 'accepted' || scenario.status === 'declined') {
        await bookings.transitionStatus(id, scenario.status, scenario.mentorId);
      }
    }

    await messages.create({ bookingId: id, authorId: seekerId, body: 'Cześć! Dodałem kontekst i pytanie do sesji. Daj proszę znać, jeśli warto przygotować coś jeszcze.' });
    if (scenario.status === 'accepted' || scenario.status === 'paid') {
      await messages.create({ bookingId: id, authorId: scenario.mentorId, body: 'Cześć! Dziękuję za opis. Przed spotkaniem możesz podesłać fragment kodu lub repozytorium, które chcesz omówić.' });
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeORM);

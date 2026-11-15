// Seeds a local database with demo data. Idempotent: safe to run repeatedly.
// Usage: npm run db:seed   (migrations must be applied first)
import '../src/load-env';
import bcrypt from 'bcryptjs';
import { ArticleRepository, AvailabilitySlotRepository, closeORM, initializeORM, InvitationRepository, MentorProfileRepository, TermsRepository, UserRepository } from '../src';
import { DEMO_ARTICLE_TITLE, DEMO_AUTHOR, DEMO_LEARNER, DEMO_PERSONAS } from './seed-data';
import { ensureDemoSeekerTerms } from './demo-seeker-terms';
import { assertDemoSeedAllowed } from './seed-environment';

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
    if (!(await users.findByEmail(data.email))) await users.create({ ...data });
  }

  const invitations = new InvitationRepository(em);
  let mentorUserId: string = DEMO_PERSONAS.mentor.id;
  for (const persona of [DEMO_PERSONAS.mentee, DEMO_PERSONAS.mentor, DEMO_PERSONAS.operator, DEMO_PERSONAS.ada, DEMO_PERSONAS.noBioMentor]) {
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

  const mentorProfiles = new MentorProfileRepository(em);
  if (!(await mentorProfiles.findByUserId(mentorUserId))) {
    await mentorProfiles.create({
      userId: mentorUserId,
      slug: 'mock-mentor',
      headline: 'Mock mentor for local testing',
      bio: 'A demo profile created by the local seed script.',
      technologies: 'typescript nextjs',
      publicWorkUrl: 'https://devmentor.test',
      isListed: true,
      lastActiveAt: null,
    });
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

  const availabilitySlots = new AvailabilitySlotRepository(em);
  const now = new Date();
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

  console.log('Seeded demo users, 2 mentor profiles, 25- and 50-minute bookable windows, seeker demo terms, and 1 article.');
  console.log(`Demo operator ID: ${operator.id}${operatorIds.has(operator.id) ? ' (operator panel enabled).' : ' (add it to OPERATOR_USER_IDS to enable the operator panel).'}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeORM);

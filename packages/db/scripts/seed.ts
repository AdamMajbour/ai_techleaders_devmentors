// Seeds a local database with demo data. Idempotent: safe to run repeatedly.
// Usage: npm run db:seed   (migrations must be applied first)
import '../src/load-env';
import { ArticleRepository, closeORM, initializeORM, UserRepository } from '../src';

const USERS = [
  { email: 'ada@devmentor.local', name: 'Ada Mentor' },
  { email: 'linus@devmentor.local', name: 'Linus Learner' },
];

async function main(): Promise<void> {
  const orm = await initializeORM();
  const em = orm.em.fork();
  const users = new UserRepository(em);
  const articles = new ArticleRepository(em);

  const created = [];
  for (const data of USERS) {
    created.push((await users.findByEmail(data.email)) ?? (await users.create(data)));
  }

  const [author] = created;
  const title = 'Getting started with mentoring';
  const existing = await articles.findByAuthor(author.id);
  if (!existing.some((article) => article.title === title)) {
    await articles.create({
      title,
      content: 'Welcome to DevMentor. This article was created by the seed script.',
      authorId: author.id,
    });
  }

  console.log(`Seeded ${created.length} users and 1 article.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeORM);

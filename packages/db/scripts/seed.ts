// Seeds a local database with demo data. Idempotent: safe to run repeatedly.
// Usage: npm run db:seed   (migrations must be applied first)
import '../src/load-env';
import { ArticleRepository, closeORM, initializeORM, UserRepository } from '../src';
import { DEMO_ARTICLE_TITLE, DEMO_AUTHOR, DEMO_LEARNER } from './seed-data';

async function main(): Promise<void> {
  const orm = await initializeORM();
  const em = orm.em.fork();
  const users = new UserRepository(em);
  const articles = new ArticleRepository(em);

  for (const data of [DEMO_AUTHOR, DEMO_LEARNER]) {
    if (!(await users.findByEmail(data.email))) await users.create({ ...data });
  }

  const existing = await articles.findByAuthor(DEMO_AUTHOR.id);
  if (!existing.some((article) => article.title === DEMO_ARTICLE_TITLE)) {
    await articles.create({
      title: DEMO_ARTICLE_TITLE,
      content: 'Welcome to DevMentor. This article was created by the seed script.',
      authorId: DEMO_AUTHOR.id,
    });
  }

  console.log('Seeded 2 users and 1 article.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeORM);

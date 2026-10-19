import fs from 'node:fs';
import path from 'node:path';
import type { MikroORM } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { closeORM, initializeORM } from '../config';
import { ArticleRepository, UserRepository } from './index';

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
});

afterAll(async () => {
  await closeORM();
});

describe('migrations', () => {
  it('create the application tables', async () => {
    expect(await publicTables()).toEqual(['articles', 'mikro_orm_migrations', 'users']);
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

    await expect(
      new UserRepository(orm.em.fork()).create({ email: 'dup@example.com', name: 'Second' }),
    ).rejects.toThrow(/unique|duplicate/i);
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

describe('migrations (down)', () => {
  it('rename the tables back and keep their rows when the last migration is reverted', async () => {
    const created = await new UserRepository(orm.em.fork()).create({ email: 'rename@example.com', name: 'Rename' });

    await orm.migrator.down();
    expect(await publicTables()).toEqual(['article', 'mikro_orm_migrations', 'user']);
    const rows: { email: string }[] = await orm.em.getConnection().execute('select email from "user" where id = ?', [created.id]);
    expect(rows).toEqual([{ email: 'rename@example.com' }]);

    await orm.migrator.up();
    expect(await publicTables()).toEqual(['articles', 'mikro_orm_migrations', 'users']);
  });

  it('remove the application tables when everything is reverted', async () => {
    await orm.migrator.down({ to: 0 });
    expect(await publicTables()).toEqual(['mikro_orm_migrations']);
  });
});

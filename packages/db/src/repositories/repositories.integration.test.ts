import fs from 'node:fs';
import path from 'node:path';
import type { MikroORM } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { closeORM, initializeORM } from '../config';
import { StatusTransition } from '../entities';
import { isUniqueConstraintViolation } from '../errors';
import { ArticleRepository, UserRepository, transitionStatus } from './index';

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
    expect(await publicTables()).toEqual(['articles', 'mikro_orm_migrations', 'status_transitions', 'users']);
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

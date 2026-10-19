// MikroORM configuration
import { Migrator } from '@mikro-orm/migrations';
import { MikroORM, type Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Article, User } from '../entities';

export const mikroOrmConfig: Options<PostgreSqlDriver> = {
  driver: PostgreSqlDriver,
  dbName: process.env.DATABASE_NAME || 'devmentor',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  entities: [User, Article],
  extensions: [Migrator],
  migrations: {
    path: './src/migrations',
    // No snapshot file: MikroORM rewrites it from whichever database ran last (devmentor_test,
    // devmentor_e2e, ...), so it never stays committed-clean. Without it `migration:create`
    // diffs against the real database (run `npm run migrate` first) and also generates `down()`.
    snapshot: false,
    glob: '!(*.d).{js,ts}',
  },
  pool: {
    min: 2,
    max: 10,
  },
  debug: process.env.NODE_ENV === 'development',
  forceUtcTimezone: true,
};

let orm: MikroORM<PostgreSqlDriver> | null = null;

/**
 * Initializes the shared ORM instance. `overrides` are merged into
 * `mikroOrmConfig` on first initialization (e.g. an absolute migrations path
 * when the process is not started from `packages/db`).
 */
export async function initializeORM(
  overrides: Partial<Options<PostgreSqlDriver>> = {},
): Promise<MikroORM<PostgreSqlDriver>> {
  if (orm) {
    return orm;
  }

  orm = await MikroORM.init<PostgreSqlDriver>({ ...mikroOrmConfig, ...overrides });
  return orm;
}

export async function closeORM(): Promise<void> {
  if (orm) {
    await orm.close();
    orm = null;
  }
}

export function getORM(): MikroORM<PostgreSqlDriver> {
  if (!orm) {
    throw new Error('ORM not initialized. Call initializeORM() first.');
  }
  return orm;
}

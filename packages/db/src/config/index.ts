// MikroORM configuration
import { MikroORM, Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

export const mikroOrmConfig: Options<PostgreSqlDriver> = {
  driver: PostgreSqlDriver,
  dbName: process.env.DATABASE_NAME || 'devmentor',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  entities: ['./dist/entities'], // will be updated in build
  entitiesTs: ['./src/entities'],
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
    pattern: /^[\w-]+\d+\.[jt]s$/,
  },
  pool: {
    min: 2,
    max: 10,
  },
  debug: process.env.NODE_ENV === 'development',
  forceUtcTimezone: true,
};

let orm: MikroORM<PostgreSqlDriver> | null = null;

export async function initializeORM(): Promise<MikroORM<PostgreSqlDriver>> {
  if (orm) {
    return orm;
  }

  orm = await MikroORM.init<PostgreSqlDriver>(mikroOrmConfig);
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

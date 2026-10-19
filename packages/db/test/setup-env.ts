// Runs before the test files: point the ORM at a dedicated test database.
// Host, user and password come from the usual DATABASE_* settings (.env.local or
// the environment); only the database name is forced, so the dev database is never touched.
import { loadEnv } from '../src/env';

loadEnv();
process.env.DATABASE_NAME = process.env.DATABASE_TEST_NAME || 'devmentor_test';

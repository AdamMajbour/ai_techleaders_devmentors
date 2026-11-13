import fs from 'node:fs';
import path from 'node:path';

function readEnvFile(filePath: string): NodeJS.ProcessEnv {
  if (!fs.existsSync(filePath)) return {};
  const values: NodeJS.ProcessEnv = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const repoRoot = path.resolve(__dirname, '../../..');
const localEnv = readEnvFile(path.join(repoRoot, '.env.local'));
const databaseName = process.env.DATABASE_E2E_NAME || 'devmentor_e2e';

if (databaseName !== 'devmentor_e2e' || databaseName === localEnv.DATABASE_NAME) {
  throw new Error('E2E database must be the isolated devmentor_e2e database, separate from .env.local.');
}

export const e2eDatabaseOptions = {
  dbName: databaseName,
  host: process.env.DATABASE_E2E_HOST || process.env.DATABASE_HOST || localEnv.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_E2E_PORT || process.env.DATABASE_PORT || localEnv.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_E2E_USER || process.env.DATABASE_USER || localEnv.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_E2E_PASSWORD || process.env.DATABASE_PASSWORD || localEnv.DATABASE_PASSWORD || 'postgres',
};

process.env.DATABASE_NAME = e2eDatabaseOptions.dbName;
process.env.DATABASE_HOST = e2eDatabaseOptions.host;
process.env.DATABASE_PORT = String(e2eDatabaseOptions.port);
process.env.DATABASE_USER = e2eDatabaseOptions.user;
process.env.DATABASE_PASSWORD = e2eDatabaseOptions.password;

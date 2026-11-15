import { config } from 'dotenv';
import path from 'node:path';

/**
 * Loads database settings from `.env.local` / `.env` in the repository root for
 * scripts that run outside Next.js (MikroORM CLI, seed). Variables that are
 * already set in the environment win over the files.
 */
export function loadEnv(): void {
  const root = path.resolve(__dirname, '../../..');
  config({ path: [path.join(root, '.env.local'), path.join(root, '.env')], quiet: true });
}

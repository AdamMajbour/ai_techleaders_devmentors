// Runs the story tests (interaction + accessibility) once per theme. Run: npm run test:stories
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
let failed = false;
for (const theme of ['dark', 'light']) {
  console.log(`\n=== story tests, ${theme} theme ===`);
  const result = spawnSync(process.execPath, [vitest, 'run'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, STORYBOOK_THEME: theme },
  });
  if (result.error) {
    console.error(`Could not start Storybook tests (${theme} theme): ${result.error.message}`);
    failed = true;
    continue;
  }
  if (result.status === null) {
    console.error(`Storybook tests (${theme} theme) exited without a status${result.signal ? ` after ${result.signal}` : ''}.`);
    failed = true;
    continue;
  }
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);

// Runs the story tests (interaction + accessibility) once per theme. Run: npm run test:stories
import { spawnSync } from 'node:child_process';

let failed = false;
for (const theme of ['dark', 'light']) {
  console.log(`\n=== story tests, ${theme} theme ===`);
  const result = spawnSync('npx', ['vitest', 'run'], { stdio: 'inherit', env: { ...process.env, STORYBOOK_THEME: theme } });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);

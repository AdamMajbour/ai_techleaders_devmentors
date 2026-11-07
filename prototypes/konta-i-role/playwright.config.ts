import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './test',
  outputDir: join(tmpdir(), 'devmentor-konta-i-role-playwright-results'),
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000/prototypes/konta-i-role/index.html',
    browserName: 'chromium',
  },
});

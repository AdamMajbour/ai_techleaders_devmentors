import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Stories run as browser tests. STORYBOOK_THEME (dark or light) selects the theme; npm run test:stories
// runs both. The Storybook addon applies .storybook/preview.tsx and the accessibility addon itself.
// Needs Chromium: `npx playwright install chromium` plus its system libraries.
const theme = process.env.STORYBOOK_THEME === 'light' ? 'light' : 'dark';

export default defineConfig({
  define: { 'import.meta.env.STORYBOOK_THEME': JSON.stringify(theme) },
  plugins: [tailwindcss(), storybookTest({ configDir: '.storybook' })],
  test: {
    name: `storybook-${theme}`,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    passWithNoTests: true,
  },
});

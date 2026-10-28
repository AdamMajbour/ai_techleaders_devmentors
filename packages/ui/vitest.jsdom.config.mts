import { defineConfig } from 'vitest/config';

// Fallback for machines without a browser: runs every story (with its play function and the
// accessibility check) in jsdom through Storybook's portable stories. It cannot measure colour
// contrast or real layout; those need the browser run (npm run test:stories) and tokens:contrast.
export default defineConfig({
  test: {
    name: 'stories-jsdom',
    environment: 'jsdom',
    include: ['src/**/*.stories.spec.tsx'],
  },
});

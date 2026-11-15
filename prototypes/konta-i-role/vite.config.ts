import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const prototypeRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: prototypeRoot,
  base: '/prototypes/konta-i-role/',
  plugins: [tailwindcss()],
  publicDir: resolve(prototypeRoot, 'public'),
  build: {
    outDir: resolve(prototypeRoot, '../../packages/ui/.storybook/public/prototypes/konta-i-role'),
    emptyOutDir: false,
  },
});

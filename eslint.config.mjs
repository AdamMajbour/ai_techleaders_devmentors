import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";


// Package boundaries (engineering standards): app -> core -> db, ui importable by app only.
// Only db may import the ORM; core stays free of next/react.
const orm = { group: ["@mikro-orm/*"], message: "Only @devmentor/db may import the ORM." };
const restrict = (...patterns) => ({
  rules: { "no-restricted-imports": ["error", { patterns }] },
});

const boundaries = [
  {
    files: ["packages/app/**/*.{ts,tsx}"],
    ...restrict(orm, { group: ["@devmentor/db", "@devmentor/db/*"], message: "app talks to the database through @devmentor/core/server." }),
  },
  {
    files: ["packages/core/**/*.{ts,tsx}"],
    ...restrict(
      orm,
      { group: ["next", "next/*", "react", "react-dom", "react/*"], message: "core never imports next or react." },
      { group: ["@devmentor/ui", "@devmentor/ui/*"], message: "core must not depend on ui." },
    ),
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    ...restrict(
      orm,
      { group: ["@devmentor/core", "@devmentor/core/*", "@devmentor/db", "@devmentor/db/*"], message: "ui is standalone: it must not import core or db." },
    ),
  },
  {
    files: ["packages/db/**/*.{ts,tsx}"],
    ...restrict(
      { group: ["@devmentor/core", "@devmentor/core/*", "@devmentor/ui", "@devmentor/ui/*"], message: "db depends on no other workspace package." },
      { group: ["next", "next/*", "react", "react-dom", "react/*"], message: "db never imports next or react." },
    ),
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      // The Next.js app lives in a workspace package, not at the repo root.
      next: { rootDir: "packages/app" },
    },
  },
  ...boundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/next-env.d.ts",
    // Built Storybook output (generated code).
    "**/storybook-static/**",
  ]),
]);

export default eslintConfig;

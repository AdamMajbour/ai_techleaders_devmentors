import nextJest from "next/jest.js";

// Deterministic regardless of the shell: React's test utilities do not work with NODE_ENV=production.
process.env.NODE_ENV = "test";

// Unit tests: next/jest compiles TS/TSX with SWC and loads Next.js config from the app package.
const createJestConfig = nextJest({ dir: "./packages/app" });

const unitConfig = createJestConfig({
  displayName: "unit",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/packages/ui/src/test/setup.ts"],
  roots: ["<rootDir>/packages"],
  testMatch: ["**/*.test.{ts,tsx}"],
  testPathIgnorePatterns: ["\\.integration\\.test\\.", "\\.e2e\\.test\\."],
  moduleNameMapper: {
    "^@devmentor/core$": "<rootDir>/packages/core/src/index.ts",
    "^@devmentor/db$": "<rootDir>/packages/db/src/index.ts",
    "^@devmentor/ui$": "<rootDir>/packages/ui/src/index.ts",
    "^@devmentor/ui/(.*)$": "<rootDir>/packages/ui/src/$1",
    "^@/(.*)$": "<rootDir>/packages/app/src/$1",
  },
});

const tsJest = {
  "^.+\\.ts$": [
    "ts-jest",
    {
      tsconfig: {
        target: "ES2022",
        module: "commonjs",
        moduleResolution: "node10",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false,
      },
    },
  ],
};

// Integration tests: need a running PostgreSQL (see .env.example). They use the
// separate `devmentor_test` database and never touch the development one.
const db = {
  displayName: "db",
  testEnvironment: "node",
  roots: ["<rootDir>/packages/db"],
  testMatch: ["**/*.integration.test.ts"],
  setupFiles: ["<rootDir>/packages/db/test/setup-env.ts"],
  transform: tsJest,
};

// End-to-end tests: build and start the real app against its own `devmentor_e2e` database.
const e2e = {
  displayName: "e2e",
  testEnvironment: "node",
  roots: ["<rootDir>/packages/app/e2e"],
  testMatch: ["**/*.e2e.test.ts"],
  transform: tsJest,
};

export default async () => ({ projects: [await unitConfig(), db, e2e] });

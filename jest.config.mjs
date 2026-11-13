import nextJest from "next/jest.js";

// Deterministic regardless of the shell: React's test utilities do not work with NODE_ENV=production.
process.env.NODE_ENV = "test";

// Unit tests: next/jest compiles TS/TSX with SWC and loads Next.js config from the app package.
const createJestConfig = nextJest({ dir: "./packages/app" });

const unitConfig = createJestConfig({
  displayName: "unit",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/packages/ui/src/test/setup.ts"],
  roots: ["<rootDir>/packages", "<rootDir>/scripts"],
  testMatch: ["**/*.test.{ts,tsx}"],
  testPathIgnorePatterns: ["\\.integration\\.test\\.", "\\.e2e\\.test\\."],
  moduleNameMapper: {
    "^@devmentor/core$": "<rootDir>/packages/core/src/index.ts",
    "^@devmentor/core/server$": "<rootDir>/packages/core/src/server.ts",
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
  setupFiles: ["<rootDir>/packages/app/e2e/setup-env.ts"],
  transform: tsJest,
};

const esmOnly = [
  "jose",
  "@ungap/structured-clone",
  "bail",
  "ccount",
  "character-entities",
  "character-entities-html4",
  "character-entities-legacy",
  "character-reference-invalid",
  "comma-separated-tokens",
  "decode-named-character-reference",
  "devlop",
  "estree-util-is-identifier-name",
  "hast-util-to-jsx-runtime",
  "hast-util-whitespace",
  "html-url-attributes",
  "is-alphabetical",
  "is-alphanumerical",
  "is-decimal",
  "is-hexadecimal",
  "is-plain-obj",
  "longest-streak",
  "mdast-util-from-markdown",
  "mdast-util-mdx-expression",
  "mdast-util-mdx-jsx",
  "mdast-util-mdxjs-esm",
  "mdast-util-phrasing",
  "mdast-util-to-hast",
  "mdast-util-to-markdown",
  "mdast-util-to-string",
  "micromark",
  "micromark-core-commonmark",
  "micromark-factory-destination",
  "micromark-factory-label",
  "micromark-factory-space",
  "micromark-factory-title",
  "micromark-factory-whitespace",
  "micromark-util-character",
  "micromark-util-chunked",
  "micromark-util-classify-character",
  "micromark-util-combine-extensions",
  "micromark-util-decode-numeric-character-reference",
  "micromark-util-decode-string",
  "micromark-util-edit-map",
  "micromark-util-encode",
  "micromark-util-html-tag-name",
  "micromark-util-normalize-identifier",
  "micromark-util-resolve-all",
  "micromark-util-sanitize-uri",
  "micromark-util-subtokenize",
  "micromark-util-symbol",
  "micromark-util-types",
  "parse-entities",
  "property-information",
  "react-markdown",
  "remark-parse",
  "remark-rehype",
  "space-separated-tokens",
  "stringify-entities",
  "trim-lines",
  "trough",
  "unified",
  "unist-util-is",
  "unist-util-position",
  "unist-util-stringify-position",
  "unist-util-visit",
  "unist-util-visit-parents",
  "vfile",
  "vfile-message",
  "zwitch",
];

export default async () => {
  const unit = await unitConfig();
  // ESM-only packages are transformed by SWC (next/jest ignores all of node_modules by default).
  // jose: session tokens. The rest is react-markdown and its ESM dependency tree (MarkdownView in @devmentor/ui).
  unit.transformIgnorePatterns = [`/node_modules/(?!(${esmOnly.join("|")})/)`, "^.+\\.module\\.(css|sass|scss)$"];
  return { projects: [unit, db, e2e] };
};

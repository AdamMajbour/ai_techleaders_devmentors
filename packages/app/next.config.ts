import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Next.js only reads .env files from this package; share the repository-root ones
// (DATABASE_*, see .env.example) with the app. The cwd is packages/app for dev/build/start.
// forceReload: Next has already loaded this package's own .env files, and without it the call is a no-op.
loadEnvConfig(path.resolve(process.cwd(), "../.."), process.env.NODE_ENV !== "production", console, true);

const nextConfig: NextConfig = {
  // Internal workspace packages are consumed as TypeScript source.
  transpilePackages: ["@devmentor/core", "@devmentor/db", "@devmentor/ui"],
  // MikroORM and the PostgreSQL driver must stay real Node.js modules (they load files dynamically).
  serverExternalPackages: ["@mikro-orm/core", "@mikro-orm/knex", "@mikro-orm/migrations", "@mikro-orm/postgresql", "pg"],
};

export default nextConfig;

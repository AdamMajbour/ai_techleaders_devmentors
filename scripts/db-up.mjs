// Start the local Compose database on the port configured for the app.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseEnv, resolveDbTarget } from "./setup-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localEnvFile = path.join(ROOT, ".env.local");
const envFile = existsSync(localEnvFile) ? localEnvFile : path.join(ROOT, ".env.compose.dev.example");
const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
const target = resolveDbTarget(fileEnv, process.env);

if (!["localhost", "127.0.0.1", "::1"].includes(target.host)) {
  console.error(`DATABASE_HOST is ${target.host}; docker compose only starts a local database.`);
  process.exit(1);
}

console.log(`Starting PostgreSQL on ${target.host}:${target.port}`);
const composeFile = path.join(ROOT, "docker-compose.db.yml");
const result = spawnSync("docker", ["compose", "-f", composeFile, "--env-file", envFile, "up", "-d", "db"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, POSTGRES_HOST_PORT: String(target.port) },
});
process.exit(result.status ?? 1);

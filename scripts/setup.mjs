// One-command local setup: `npm run setup` (add `--no-seed` to skip demo data).
// Every step is idempotent; see the README "Instalacja" section.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkVersions,
  decideDbAction,
  ensureJwtSecret,
  formatSummary,
  needsInstall,
  parseEnv,
  resolveDbTarget,
} from "./setup-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");
const DB_COMPOSE_FILE = path.join(ROOT, "docker-compose.db.yml");
const IS_WINDOWS = process.platform === "win32";
const DB_WAIT_MS = 60_000;
const PROBE_TIMEOUT_MS = 2_000;

const results = [];
const record = (name, status, note) => results.push({ name, status, note });

function finish(code, message) {
  if (message) console.error(`\n${message}`);
  console.log(`\n${formatSummary(results)}`);
  if (code === 0) console.log("\nNext: npm run dev");
  process.exit(code);
}

function fail(name, message) {
  record(name, "failed");
  finish(1, message);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: ROOT, stdio: "inherit", shell: IS_WINDOWS, ...options });
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", shell: IS_WINDOWS });
  return result.status === 0 ? result.stdout.trim() : null;
}

function mtime(file) {
  return existsSync(file) ? statSync(file).mtimeMs : null;
}

function probe(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(PROBE_TIMEOUT_MS, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealthy() {
  const deadline = Date.now() + DB_WAIT_MS;
  while (Date.now() < deadline) {
    const id = capture("docker", ["compose", "-f", DB_COMPOSE_FILE, "--env-file", ENV_FILE, "ps", "-q", "db"]);
    const status = id && capture("docker", ["inspect", "--format", "{{.State.Health.Status}}", id]);
    if (status === "healthy") return true;
    await sleep(2_000);
  }
  return false;
}

async function main() {
  // 1. Preflight
  const npmVersion = capture("npm", ["--version"]) ?? "0";
  const problems = checkVersions(process.version, npmVersion);
  if (problems.length > 0) fail("preflight", problems.join("\n"));
  record("preflight", "done", `node ${process.version}, npm ${npmVersion}`);

  // 2. Dependencies
  if (needsInstall(mtime(path.join(ROOT, "node_modules", ".package-lock.json")), mtime(path.join(ROOT, "package-lock.json")))) {
    if (run("npm", ["install"]).status !== 0) fail("dependencies", "npm install failed.");
    record("dependencies", "done");
  } else {
    record("dependencies", "skipped", "node_modules is up to date");
  }

  // 3. Environment file (never overwritten; only a missing/short JWT_SECRET is filled in)
  const created = !existsSync(ENV_FILE);
  if (created) copyFileSync(ENV_EXAMPLE, ENV_FILE);
  const { text, changed } = ensureJwtSecret(readFileSync(ENV_FILE, "utf8"));
  if (changed) writeFileSync(ENV_FILE, text);
  if (created || changed) {
    record("environment", "done", [created && "created .env.local", changed && "generated JWT_SECRET"].filter(Boolean).join(", "));
  } else {
    record("environment", "skipped", ".env.local already valid");
  }

  // 4. PostgreSQL
  const target = resolveDbTarget(parseEnv(text), process.env);
  const reachable = await probe(target.host, target.port);
  const action = decideDbAction({ reachable, hasDocker: capture("docker", ["--version"]) !== null, target });
  if (action === "skip") {
    record("postgres", "skipped", `${target.host}:${target.port} accepts connections`);
  } else if (action === "fail") {
    fail(
      "postgres",
      `PostgreSQL is not reachable at ${target.host}:${target.port}.\n` +
        "Start PostgreSQL 14+ matching DATABASE_* in .env.local, or (for localhost:5432) install Docker, then re-run: npm run setup",
    );
  } else {
    if (run("docker", ["compose", "-f", DB_COMPOSE_FILE, "--env-file", ENV_FILE, "up", "-d", "db"]).status !== 0) {
      fail("postgres", "docker compose up -d db failed.");
    }
    if (!(await waitForHealthy())) fail("postgres", `The db container did not become healthy within ${DB_WAIT_MS / 1000}s.`);
    record("postgres", "done", "started via docker compose");
  }

  // 5. Migrations
  console.log(`\nMigrating database "${target.name}" on ${target.host}:${target.port}`);
  if (run("npm", ["run", "migrate"]).status !== 0) fail("migrations", "npm run migrate failed.");
  record("migrations", "done", "no-op when up to date");

  // 6. Demo data
  if (process.argv.includes("--no-seed")) {
    record("seed", "skipped", "--no-seed");
  } else {
    if (run("npm", ["run", "db:seed"]).status !== 0) fail("seed", "npm run db:seed failed.");
    record("seed", "done", "idempotent");
  }

  // 7. Summary
  finish(0);
}

main().catch((error) => fail("setup", error instanceof Error ? error.message : String(error)));

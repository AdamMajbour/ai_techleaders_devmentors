// Pure logic for scripts/setup.mjs. No side effects on import, Node built-ins only
// (the setup script runs before `npm install`).
import { randomBytes } from "node:crypto";

// Keep in sync with MIN_SECRET_LENGTH in packages/core/src/config/env.ts.
export const MIN_SECRET_LENGTH = 32;
export const MIN_NODE = [20, 9, 0];
export const MIN_NPM = [9, 0, 0];
export const DEFAULT_DB_HOST = "localhost";
export const DEFAULT_DB_PORT = 5432;

/** Parses KEY=VALUE lines (comments and blank lines ignored, surrounding quotes stripped). */
export function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

export function isValidSecret(secret) {
  return typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH;
}

export function generateSecret() {
  return randomBytes(48).toString("base64");
}

/**
 * Returns the env file text with a valid JWT_SECRET. A valid existing secret leaves the text
 * untouched (byte for byte); a missing or short one is replaced in place or appended.
 * `secret` is only used when a change is needed.
 */
export function ensureJwtSecret(text, secret = generateSecret()) {
  if (isValidSecret(parseEnv(text).JWT_SECRET)) return { text, changed: false };
  const line = /^(\s*(?:export\s+)?JWT_SECRET\s*=).*$/m;
  if (line.test(text)) {
    return { text: text.replace(line, (_, prefix) => `${prefix}${secret}`), changed: true };
  }
  const separator = text === "" || text.endsWith("\n") ? "" : "\n";
  return { text: `${text}${separator}JWT_SECRET=${secret}\n`, changed: true };
}

export function parseVersion(version) {
  const [major = 0, minor = 0, patch = 0] = String(version).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  return [major, minor, patch];
}

export function versionAtLeast(version, minimum) {
  const actual = parseVersion(version);
  for (let i = 0; i < 3; i++) {
    if (actual[i] !== minimum[i]) return actual[i] > minimum[i];
  }
  return true;
}

/** Returns a list of human-readable problems; empty when the toolchain is fine. */
export function checkVersions(nodeVersion, npmVersion) {
  const problems = [];
  if (!versionAtLeast(nodeVersion, MIN_NODE)) problems.push(`Node.js ${MIN_NODE.slice(0, 2).join(".")}+ is required (found ${nodeVersion}).`);
  if (!versionAtLeast(npmVersion, MIN_NPM)) problems.push(`npm ${MIN_NPM[0]}+ is required (found ${npmVersion}).`);
  return problems;
}

/** Install when node_modules is missing or older than package-lock.json. Times are mtimeMs, or null if absent. */
export function needsInstall(nodeModulesMtime, lockMtime) {
  if (nodeModulesMtime === null) return true;
  return lockMtime !== null && nodeModulesMtime < lockMtime;
}

/** Same precedence as packages/db/src/env.ts: variables already in the environment win over the file. */
export function resolveDbTarget(fileEnv, processEnv = {}) {
  const pick = (key) => processEnv[key] || fileEnv[key];
  const port = parseInt(pick("DATABASE_PORT") ?? "", 10);
  return {
    host: pick("DATABASE_HOST") || DEFAULT_DB_HOST,
    port: Number.isInteger(port) && port > 0 ? port : DEFAULT_DB_PORT,
    name: pick("DATABASE_NAME") || "devmentor",
  };
}

/** "skip" when PostgreSQL already answers, "docker" to start the compose service, otherwise "fail". */
export function decideDbAction({ reachable, hasDocker }) {
  if (reachable) return "skip";
  return hasDocker ? "docker" : "fail";
}

/** Renders the final report. Takes only step names, statuses and notes, never env values. */
export function formatSummary(results) {
  const icon = { done: "✔ done   ", skipped: "- skipped", failed: "✘ failed " };
  return results.map(({ name, status, note }) => `${icon[status]} ${name}${note ? ` (${note})` : ""}`).join("\n");
}

// @ts-nocheck -- setup-lib.mjs is plain JavaScript (it must run before dependencies are installed)
import {
  checkVersions,
  decideDbAction,
  isComposeTarget,
  ensureJwtSecret,
  formatSummary,
  generateSecret,
  isValidSecret,
  needsInstall,
  parseEnv,
  resolveDbTarget,
} from "./setup-lib.mjs";

const VALID = "a".repeat(32);

describe("secret generation", () => {
  it("produces a valid, unique secret", () => {
    const secret = generateSecret();
    expect(isValidSecret(secret)).toBe(true);
    expect(generateSecret()).not.toBe(secret);
  });

  it("rejects empty and short secrets", () => {
    expect(isValidSecret("")).toBe(false);
    expect(isValidSecret(undefined)).toBe(false);
    expect(isValidSecret("a".repeat(31))).toBe(false);
    expect(isValidSecret(VALID)).toBe(true);
  });
});

describe("parseEnv", () => {
  it("reads values, ignoring comments and quotes", () => {
    const env = parseEnv('# c\nDATABASE_HOST=db.local\nJWT_SECRET="abc"\n\nEMPTY=\n');
    expect(env).toEqual({ DATABASE_HOST: "db.local", JWT_SECRET: "abc", EMPTY: "" });
  });
});

describe("ensureJwtSecret", () => {
  it("leaves a file with a valid secret byte-for-byte unchanged", () => {
    const text = `# mine\r\nDATABASE_HOST=custom\r\nJWT_SECRET=${VALID}\r\nDATABASE_PORT=6543`;
    expect(ensureJwtSecret(text, "X".repeat(40))).toEqual({ text, changed: false });
  });

  it("fills an empty JWT_SECRET in place and keeps other values", () => {
    const text = "DATABASE_HOST=custom\nJWT_SECRET=\nDATABASE_PORT=6543\n";
    const secret = "S".repeat(40);
    const result = ensureJwtSecret(text, secret);
    expect(result.changed).toBe(true);
    expect(result.text).toBe(`DATABASE_HOST=custom\nJWT_SECRET=${secret}\nDATABASE_PORT=6543\n`);
  });

  it("replaces a too-short secret", () => {
    const result = ensureJwtSecret("JWT_SECRET=short\n", "S".repeat(40));
    expect(parseEnv(result.text).JWT_SECRET).toBe("S".repeat(40));
  });

  it("appends when the key is missing, adding a newline if needed", () => {
    expect(ensureJwtSecret("A=1", "S".repeat(40)).text).toBe(`A=1\nJWT_SECRET=${"S".repeat(40)}\n`);
  });

  it("treats secrets containing $ or = literally", () => {
    const secret = "ab$&c=d".padEnd(40, "x");
    expect(parseEnv(ensureJwtSecret("JWT_SECRET=\n", secret).text).JWT_SECRET).toBe(secret);
  });

  it("is idempotent", () => {
    const first = ensureJwtSecret("JWT_SECRET=\n");
    expect(ensureJwtSecret(first.text).changed).toBe(false);
  });
});

describe("step-skip decisions", () => {
  it("installs only when node_modules is missing or older than the lockfile", () => {
    expect(needsInstall(null, 10)).toBe(true);
    expect(needsInstall(5, 10)).toBe(true);
    expect(needsInstall(10, 10)).toBe(false);
    expect(needsInstall(20, 10)).toBe(false);
    expect(needsInstall(20, null)).toBe(false);
  });

  it("chooses skip, docker or fail for PostgreSQL", () => {
    const local = { host: "localhost", port: 5432 };
    expect(decideDbAction({ reachable: true, hasDocker: false, target: local })).toBe("skip");
    expect(decideDbAction({ reachable: false, hasDocker: true, target: local })).toBe("docker");
    expect(decideDbAction({ reachable: false, hasDocker: false, target: local })).toBe("fail");
  });

  it("never starts the compose service for a target it does not provide", () => {
    expect(isComposeTarget({ host: "127.0.0.1", port: 5432 })).toBe(true);
    expect(decideDbAction({ reachable: false, hasDocker: true, target: { host: "db.example.com", port: 5432 } })).toBe("fail");
    expect(decideDbAction({ reachable: false, hasDocker: true, target: { host: "localhost", port: 6543 } })).toBe("fail");
  });

  it("probes the configured host and port, with the process environment winning", () => {
    const file = { DATABASE_HOST: "filehost", DATABASE_PORT: "6543", DATABASE_NAME: "mine" };
    expect(resolveDbTarget(file, {})).toEqual({ host: "filehost", port: 6543, name: "mine" });
    expect(resolveDbTarget(file, { DATABASE_HOST: "envhost" }).host).toBe("envhost");
    expect(resolveDbTarget({}, {})).toEqual({ host: "localhost", port: 5432, name: "devmentor" });
    expect(resolveDbTarget({ DATABASE_PORT: "abc" }, {}).port).toBe(5432);
  });
});

describe("checkVersions", () => {
  it("accepts supported versions", () => {
    expect(checkVersions("v20.9.0", "9.0.0")).toEqual([]);
    expect(checkVersions("v24.1.0", "11.0.0")).toEqual([]);
  });

  it("reports unsupported node and npm", () => {
    expect(checkVersions("v20.8.9", "10.0.0")).toHaveLength(1);
    expect(checkVersions("v18.0.0", "8.19.0")).toHaveLength(2);
  });
});

describe("formatSummary", () => {
  it("lists each step with its status and note", () => {
    const out = formatSummary([
      { name: "environment", status: "done", note: "generated JWT_SECRET" },
      { name: "seed", status: "skipped" },
    ]);
    expect(out).toContain("environment (generated JWT_SECRET)");
    expect(out).toContain("skipped seed");
  });
});

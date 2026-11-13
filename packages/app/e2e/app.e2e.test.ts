/**
 * End-to-end test against a real production server (`next build` + `next start`)
 * backed by a real PostgreSQL database. It uses its own database (`devmentor_e2e`),
 * migrates and seeds it through the same npm scripts developers use, and migrates it
 * back down afterwards. Pages and the API are checked over HTTP, and the pages are also
 * rendered in headless Chromium (computed styles, console errors, the login and article flows).
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import { e2eDatabaseOptions as E2E_DATABASE_OPTIONS } from './e2e-database-config';
const E2E_DATABASE_NAME = E2E_DATABASE_OPTIONS.dbName;
import '../../db/src/load-env';
import { closeORM, initializeORM, InvitationRepository, TermsRepository } from '../../db/src';
import { VAULT_NOTICE_VERSION } from '@devmentor/core';
// Relative on purpose: app code must not import the db package, but a test may read its demo constants.
import { DEMO_ARTICLE_TITLE, DEMO_AUTHOR } from '../../db/scripts/seed-data';

const APP_DIR = path.resolve(__dirname, '..');
const ROOT = path.resolve(APP_DIR, '../..');

// A fresh signing key per run: never a committed or shared secret.
const JWT_SECRET = randomBytes(48).toString('base64');
const PASSWORD = 'correct horse battery';
if (
  E2E_DATABASE_NAME !== 'devmentor_e2e'
) {
  throw new Error('E2E tests require a dedicated database and will not migrate a development/test database.');
}

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_NAME: E2E_DATABASE_NAME,
  DATABASE_HOST: E2E_DATABASE_OPTIONS.host,
  DATABASE_PORT: String(E2E_DATABASE_OPTIONS.port),
  DATABASE_USER: E2E_DATABASE_OPTIONS.user,
  DATABASE_PASSWORD: E2E_DATABASE_OPTIONS.password,
  JWT_SECRET,
  PUBLIC_SIGNUP: 'true',
  PAYMENTS_MODE: 'mock',
  NODE_ENV: 'production',
  MOCK_PAYMENT_E2E_ENABLED: 'true',
  VAULT_ENABLED: 'true',
  VAULT_PUBLISH_ENABLED: 'true',
  AI_MODE: 'mock',
  AI_ALLOW_MOCK_IN_PRODUCTION: 'true',
  AI_LIVE_ENABLED: 'false',
  PAYMENTS_LIVE_ENABLED: 'false',
  JEST_WORKER_ID: process.env.JEST_WORKER_ID ?? '1',
};

jest.setTimeout(30_000);

// Chromium needs system libraries. If they were installed without root with
// scripts/setup-chromium-libs.py, make them visible to the browser process.
function chromiumEnv(): NodeJS.ProcessEnv {
  const root = path.join(process.env.CHROMIUM_LIBS_DIR || path.join(os.homedir(), '.cache/chromium-libs'), 'root');
  const dirs = ['usr/lib/x86_64-linux-gnu', 'lib/x86_64-linux-gnu']
    .map((dir) => path.join(root, dir))
    .filter((dir) => fs.existsSync(dir));
  const existing = process.env.LD_LIBRARY_PATH;
  return { ...process.env, LD_LIBRARY_PATH: [...dirs, ...(existing ? [existing] : [])].join(':') };
}

type RunningServer = { url: string; log: () => string; stop: () => void };

function run(args: string[], cwd = ROOT, extraEnv: NodeJS.ProcessEnv = {}): string {
  const npmCli = process.env.npm_execpath;
  return execFileSync(
    npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm',
    npmCli ? [npmCli, ...args] : args,
    {
      cwd,
      env: { ...env, ...extraEnv },
      encoding: 'utf8',
      shell: process.platform === 'win32' && !npmCli,
    },
  );
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address() as net.AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

async function startServer(extraEnv: NodeJS.ProcessEnv = {}): Promise<RunningServer> {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  let log = '';
  const nextCli = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
  const child: ChildProcess = spawn(process.execPath, [nextCli, 'start', '--port', String(port)], {
    cwd: APP_DIR,
    env: { ...env, APP_BASE_URL: url, MAILER_MODE: 'console', ...extraEnv },
  });
  child.stdout?.on('data', (chunk) => (log += chunk));
  child.stderr?.on('data', (chunk) => (log += chunk));

  const deadline = Date.now() + 60_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`Server exited early:\n${log}`);
    try {
      if ((await fetch(`${url}/api/health`)).ok) break;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error(`Server did not become ready:\n${log}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return {
    url,
    log: () => log,
    stop: () => {
      child.kill('SIGTERM');
    },
  };
}

let browser: Browser | undefined;
let server: RunningServer;
let baseUrl = '';
let e2eOrm: Awaited<ReturnType<typeof initializeORM>> | undefined;

async function cleanE2EDatabase(): Promise<void> {
  if (E2E_DATABASE_NAME !== 'devmentor_e2e') {
    throw new Error('Refusing to clean a database other than the dedicated devmentor_e2e database.');
  }
  await closeORM();
  const cleanupOrm = await initializeORM(E2E_DATABASE_OPTIONS);
  await cleanupOrm.em.getConnection().execute('drop schema public cascade; create schema public');
  await cleanupOrm.em.getConnection().execute('drop function if exists "release_booking_availability_slot"() cascade');
  await cleanupOrm.em.getConnection().execute('drop function if exists "release_mentor_availability_slot"() cascade');
  await cleanupOrm.schema.dropSchema({ dropMigrationsTable: true });
  await closeORM();
}

beforeAll(async () => {
  await cleanE2EDatabase();
  run(['--workspace=@devmentor/db', 'run', 'migrate']);
  run(['--workspace=@devmentor/db', 'run', 'seed']);
  await seedE2ETerms();
  run(['run', 'build'], APP_DIR);

  server = await startServer();
  baseUrl = server.url;
}, 180_000);

afterAll(async () => {
  await browser?.close();
  browser = undefined;
  server?.stop();
  await cleanE2EDatabase();
}, 60_000);

// --- helpers -----------------------------------------------------------------------------

type Call = { method?: string; json?: unknown; cookie?: string; headers?: Record<string, string>; client?: boolean };

/** `apiCall`'s contract from outside: the client header on every request unless a test removes it. */
async function api(pathname: string, { method = 'GET', json, cookie, headers = {}, client = true }: Call = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(client ? { 'x-requested-with': 'devmentor' } : {}),
      ...(json === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  const text = await response.text();
  return { response, text, body: text ? JSON.parse(text) : null };
}

type E2ETerms = { id: string; sha256: string };

async function currentTerms(kind: 'seeker' | 'mentor'): Promise<E2ETerms> {
  const result = await api(`/api/terms/current?kind=${kind}`);
  const data: unknown = result.body?.data;
  if (
    result.response.status !== 200 ||
    typeof data !== 'object' ||
    data === null ||
    !('id' in data) || typeof data.id !== 'string' ||
    !('sha256' in data) || typeof data.sha256 !== 'string'
  ) {
    throw new Error(`Current ${kind} terms are unavailable in the E2E fixture.`);
  }
  return { id: data.id, sha256: data.sha256 };
}

async function seedE2ETerms(): Promise<void> {
  // E2E-only reviewed terms let the payment and publication flows exercise the
  // same consent gates as the app without treating test fixtures as legal copy.
  e2eOrm = await initializeORM(E2E_DATABASE_OPTIONS);
  const repository = new TermsRepository(e2eOrm.em.fork());
  const operatorId = DEMO_AUTHOR.id;
  const now = new Date();
  for (const kind of ['seeker', 'mentor'] as const) {
    const body = `E2E fixture terms for ${kind}; not legal copy.`;
    const sha256 = createHash('sha256').update(body, 'utf8').digest('hex');
    const draft = await repository.createDraft({
      kind,
      version: 'e2e-1',
      body,
      sha256,
      createdBy: operatorId,
    });
    await repository.recordReview({
      termsVersionId: draft.id,
      sha256,
      reviewer: 'E2E fixture verifier',
      scopes: ['terms', 'payment_handling', 'ai_notice_and_processors'],
      outcome: 'pass',
      reviewedAt: now,
      note: 'Test fixture only.',
      recordedBy: operatorId,
    });
    await repository.publish(draft.id, now);
  }
}

let userCounter = 0;
/** Registers a new user (each from its own client address, so the register limiter never interferes). */
async function registerUser(name = 'Tester') {
  userCounter += 1;
  const email = `e2e-user-${userCounter}-${randomBytes(3).toString('hex')}@example.com`;
  const result = await api('/api/auth/register', {
    method: 'POST',
    json: { name, email, password: PASSWORD },
    headers: { 'x-forwarded-for': `198.51.100.${userCounter}` },
  });
  const setCookie = result.response.headers.get('set-cookie') ?? '';
  return { ...result, email, cookie: setCookie.split(';')[0], setCookie };
}

async function registerPilotUser(role: 'seeker' | 'mentor', name: string) {
  const result = await registerUser(name);
  if (result.response.status !== 201 || typeof result.body?.data?.id !== 'string') {
    throw new Error(`Could not create the ${role} account for the booking E2E.`);
  }
  e2eOrm ??= await initializeORM(E2E_DATABASE_OPTIONS);
  await new InvitationRepository(e2eOrm.em.fork()).create({
    email: result.email,
    displayName: name,
    role,
    invitedBy: null,
    acceptedByUserId: result.body.data.id,
    acceptedAt: new Date(),
    revokedAt: null,
  });
  return result;
}

// --- pages ---------------------------------------------------------------------------------

describe('pages', () => {
  it('serves the home page unchanged', async () => {
    const response = await fetch(baseUrl);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Your Next.js app is ready.');
  });

  it('renders shared @devmentor/ui components on /ui-preview with Tailwind styles', async () => {
    const response = await fetch(`${baseUrl}/ui-preview`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Button variants');
    expect(html).toContain('bg-primary');

    const stylesheet = html.match(/href="(\/_next\/static\/[^"]+\.css)"/)?.[1];
    expect(stylesheet).toBeDefined();
    const css = await (await fetch(`${baseUrl}${stylesheet}`)).text();
    expect(css).toContain('.bg-primary');
  });

  it.each(['/login', '/auth/verify', '/register', '/articles'])('serves %s', async (pathname) => {
    expect((await fetch(`${baseUrl}${pathname}`)).status).toBe(200);
  });
});

// --- API: public reads ----------------------------------------------------------------------

describe('API reads', () => {
  it('reports health in the standard envelope, without touching the database', async () => {
    const { response, body } = await api('/api/health');
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, data: { status: 'ok' } });
  });

  it("lists the seeded author's article through the container, service and repository", async () => {
    const { response, body } = await api(`/api/articles?authorId=${DEMO_AUTHOR.id}`);
    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({ title: DEMO_ARTICLE_TITLE, authorId: DEMO_AUTHOR.id });
    expect(body.data).toMatchObject({ page: 1, pageSize: 10, total: 1, pageCount: 1 });
  });

  it('pages the list and answers an unknown author with an empty one', async () => {
    const paged = await api('/api/articles?pageSize=1&page=1');
    expect(paged.body.data.items).toHaveLength(1);
    expect(paged.body.data.total).toBeGreaterThanOrEqual(1);

    const empty = await api('/api/articles?authorId=00000000-0000-4000-8000-000000000000');
    expect(empty.body).toEqual({ ok: true, data: { items: [], page: 1, pageSize: 10, total: 0, pageCount: 1 } });
  });

  it('rejects malformed query parameters with field errors in the error envelope', async () => {
    for (const [query, field] of [
      ['?authorId=not-a-uuid', 'authorId'],
      ['?page=0', 'page'],
      ['?pageSize=500', 'pageSize'],
    ]) {
      const { response, body } = await api(`/api/articles${query}`);
      expect(response.status).toBe(400);
      expect(body).toMatchObject({ ok: false, error: { code: 'validation_failed' } });
      expect(body.error.fieldErrors[field].length).toBeGreaterThan(0);
    }
  });

  it('does not expose a user lookup', async () => {
    expect((await fetch(`${baseUrl}/api/users?email=${DEMO_AUTHOR.email}`)).status).toBe(404);
  });

  it('serves concurrent requests, each in its own scope', async () => {
    const responses = await Promise.all(Array.from({ length: 10 }, () => api(`/api/articles?authorId=${DEMO_AUTHOR.id}`)));
    expect(responses.map(({ response }) => response.status)).toEqual(Array(10).fill(200));
  });
});

// --- API: authentication ---------------------------------------------------------------------

describe('API authentication', () => {
  it('registers, sets a hardened session cookie, and never returns the password hash', async () => {
    const { response, body, setCookie, email, text } = await registerUser('Ada');

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ email, name: 'Ada' });
    expect(text).not.toMatch(/password|hash|\$2[aby]\$/i);
    for (const flag of ['HttpOnly', 'SameSite=Lax', 'Path=/', 'Secure', 'Max-Age=86400']) expect(setCookie).toContain(flag);
  });

  it('returns the logged-in user from /api/auth/me and 401 without a session', async () => {
    const { cookie, email } = await registerUser();

    expect((await api('/api/auth/me', { cookie })).body.data).toMatchObject({ email });
    expect((await api('/api/auth/me')).response.status).toBe(401);
  });

  it('rejects a tampered or garbage session cookie', async () => {
    const { cookie } = await registerUser();
    const [name, token] = cookie.split('=');
    const [header, payload, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: DEMO_AUTHOR.id, exp: 9_999_999_999 })).toString('base64url');

    expect((await api('/api/auth/me', { cookie: `${name}=${header}.${forged}.${signature}` })).response.status).toBe(401);
    expect((await api('/api/auth/me', { cookie: `${name}=${header}.${payload}.AAAA` })).response.status).toBe(401);
    expect((await api('/api/auth/me', { cookie: `${name}=garbage` })).response.status).toBe(401);
  });

  it('validates registration input and answers a duplicate e-mail with a generic conflict', async () => {
    const weak = await api('/api/auth/register', {
      method: 'POST',
      json: { name: 'X', email: 'weak@example.com', password: 'short' },
      headers: { 'x-forwarded-for': '198.51.100.200' },
    });
    expect(weak.response.status).toBe(400);
    expect(weak.body.error.fieldErrors.password.length).toBeGreaterThan(0);

    const { email } = await registerUser();
    const duplicate = await api('/api/auth/register', {
      method: 'POST',
      json: { name: 'Again', email: email.toUpperCase(), password: PASSWORD },
      headers: { 'x-forwarded-for': '198.51.100.201' },
    });
    expect(duplicate.response.status).toBe(409);
    expect(duplicate.body.error.message).toBe('Registration could not be completed.');
  });

  it('logs in with the right password and gives one identical answer for every failure', async () => {
    const { email } = await registerUser();
    const login = (json: unknown, ip: string) => api('/api/auth/login', { method: 'POST', json, headers: { 'x-forwarded-for': ip } });

    const good = await login({ email: email.toUpperCase(), password: PASSWORD }, '198.51.100.210');
    expect(good.response.status).toBe(200);
    expect(good.response.headers.get('set-cookie')).toContain('devmentor_session=');

    const wrongPassword = await login({ email, password: 'wrong password!!' }, '198.51.100.211');
    const unknownEmail = await login({ email: 'nobody-at-all@example.com', password: PASSWORD }, '198.51.100.212');
    expect(wrongPassword.response.status).toBe(401);
    expect(unknownEmail.response.status).toBe(401);
    expect(wrongPassword.text).toBe(unknownEmail.text);
    expect(wrongPassword.body.error.message).toBe('Invalid credentials.');
  });

  it('throttles repeated failed logins per client and e-mail, with Retry-After', async () => {
    const { email } = await registerUser();
    const attempt = () =>
      api('/api/auth/login', { method: 'POST', json: { email, password: 'wrong password!!' }, headers: { 'x-forwarded-for': '198.51.100.220' } });

    for (let i = 0; i < 5; i++) expect((await attempt()).response.status).toBe(401);

    const blocked = await attempt();
    expect(blocked.response.status).toBe(429);
    expect(Number(blocked.response.headers.get('retry-after'))).toBeGreaterThan(0);
    // Even the right password is refused while blocked, and another client is unaffected.
    const stillBlocked = await api('/api/auth/login', {
      method: 'POST',
      json: { email, password: PASSWORD },
      headers: { 'x-forwarded-for': '198.51.100.220' },
    });
    expect(stillBlocked.response.status).toBe(429);
    const otherClient = await api('/api/auth/login', {
      method: 'POST',
      json: { email, password: PASSWORD },
      headers: { 'x-forwarded-for': '198.51.100.221' },
    });
    expect(otherClient.response.status).toBe(200);
  });

  it('logout clears the cookie with the same flags', async () => {
    const { cookie } = await registerUser();
    const { response } = await api('/api/auth/logout', { method: 'POST', cookie });

    const cleared = response.headers.get('set-cookie') ?? '';
    expect(cleared).toContain('Max-Age=0');
    expect(cleared).toContain('HttpOnly');
    expect(cleared).toContain('Secure');
  });

  it('requires the client header on every state-changing auth route (CSRF)', async () => {
    const withoutHeader = await api('/api/auth/login', { method: 'POST', client: false, json: { email: 'a@b.co', password: 'x' } });
    expect(withoutHeader.response.status).toBe(403);
    const register = await api('/api/auth/register', { method: 'POST', client: false, json: {} });
    expect(register.response.status).toBe(403);
    const logout = await api('/api/auth/logout', { method: 'POST', client: false });
    expect(logout.response.status).toBe(403);
  });
});

// --- API: articles (CRUD, ownership) ------------------------------------------------------------

describe('API articles', () => {
  it('rejects unauthenticated mutations, a missing client header and a cross-origin request', async () => {
    const json = { title: 'T', content: 'C' };
    expect((await api('/api/articles', { method: 'POST', json })).response.status).toBe(401);

    const { cookie } = await registerUser();
    expect((await api('/api/articles', { method: 'POST', json, cookie, client: false })).response.status).toBe(403);
    expect((await api('/api/articles', { method: 'POST', json, cookie, headers: { origin: 'https://evil.example' } })).response.status).toBe(403);
  });

  it('runs the full lifecycle for the author and forces the author to be the session user', async () => {
    const { cookie, body: me } = await registerUser();

    const created = await api('/api/articles', {
      method: 'POST',
      cookie,
      json: { title: 'Lifecycle', content: 'First version', authorId: DEMO_AUTHOR.id, id: DEMO_AUTHOR.id },
    });
    expect(created.response.status).toBe(201);
    expect(created.body.data.authorId).toBe(me.data.id);
    const id = created.body.data.id;

    expect((await api(`/api/articles/${id}`)).body.data).toMatchObject({ title: 'Lifecycle' });

    const updated = await api(`/api/articles/${id}`, { method: 'PUT', cookie, json: { content: 'Second version' } });
    expect(updated.body.data).toMatchObject({ title: 'Lifecycle', content: 'Second version' });

    const removed = await api(`/api/articles/${id}`, { method: 'DELETE', cookie });
    expect(removed.body).toEqual({ ok: true, data: { id } });
    expect((await api(`/api/articles/${id}`)).response.status).toBe(404);
  });

  it("refuses to edit or delete somebody else's article and leaves it unchanged", async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const created = await api('/api/articles', { method: 'POST', cookie: owner.cookie, json: { title: 'Mine', content: 'Original' } });
    const id = created.body.data.id;

    const edit = await api(`/api/articles/${id}`, { method: 'PUT', cookie: intruder.cookie, json: { title: 'Hijacked' } });
    const remove = await api(`/api/articles/${id}`, { method: 'DELETE', cookie: intruder.cookie });

    expect(edit.response.status).toBe(403);
    expect(remove.response.status).toBe(403);
    expect((await api(`/api/articles/${id}`)).body.data).toMatchObject({ title: 'Mine', content: 'Original' });
  });

  it('validates bodies and ids', async () => {
    const { cookie } = await registerUser();

    const empty = await api('/api/articles', { method: 'POST', cookie, json: { title: '', content: '' } });
    expect(empty.response.status).toBe(400);
    expect(empty.body.error.fieldErrors.title.length).toBeGreaterThan(0);

    const notJson = await fetch(`${baseUrl}/api/articles`, {
      method: 'POST',
      headers: { 'x-requested-with': 'devmentor', cookie },
      body: 'not json',
    });
    expect(notJson.status).toBe(400);

    expect((await api('/api/articles/42')).response.status).toBe(400);
    expect((await api('/api/articles/0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a99', { method: 'PUT', cookie, json: { title: 'x' } })).response.status).toBe(404);
    expect((await api(`/api/articles/${DEMO_AUTHOR.id}`, { method: 'PUT', cookie, json: {} })).response.status).toBe(400);
  });
});

// --- Operational properties ----------------------------------------------------------------------

describe('operations', () => {
  it('never writes a password or a session token to the server log', async () => {
    const { cookie } = await registerUser();
    await api('/api/auth/login', { method: 'POST', json: { email: 'x@y.co', password: PASSWORD }, headers: { 'x-forwarded-for': '198.51.100.230' } });

    const log = server.log();
    expect(log).not.toContain(PASSWORD);
    expect(log).not.toContain(cookie.split('=')[1]);
    expect(log).not.toContain(JWT_SECRET);
  });

  it('builds and boots without a reachable database: only the database routes fail, with a generic 500', async () => {
    const offline = await startServer({ DATABASE_HOST: '127.0.0.1', DATABASE_PORT: '1' });
    try {
      expect((await fetch(offline.url)).status).toBe(200);
      expect((await fetch(`${offline.url}/api/health`)).status).toBe(200);

      const failing = await fetch(`${offline.url}/api/articles`);
      expect(failing.status).toBe(500);
      const text = await failing.text();
      expect(JSON.parse(text)).toEqual({ ok: false, error: { code: 'internal_error', message: 'Something went wrong.' } });
      expect(text).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|postgres/i);
      expect(offline.log()).toContain('Unhandled error in API route');
    } finally {
      offline.stop();
    }
  });

  it('boots without JWT_SECRET: public pages work, auth routes fail closed before touching anything', async () => {
    const noSecret = await startServer({ JWT_SECRET: '' });
    try {
      expect((await fetch(`${noSecret.url}/articles`)).status).toBe(200);
      expect((await fetch(`${noSecret.url}/api/articles`)).status).toBe(200);

      const register = await fetch(`${noSecret.url}/api/auth/register`, {
        method: 'POST',
        headers: { 'x-requested-with': 'devmentor', 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'No Secret', email: 'nosecret@example.com', password: PASSWORD }),
      });
      expect(register.status).toBe(500);
      expect(register.headers.get('set-cookie')).toBeNull();
      // No account was created: the same address can still register on a correctly configured server.
      expect((await api('/api/auth/login', { method: 'POST', json: { email: 'nosecret@example.com', password: PASSWORD }, headers: { 'x-forwarded-for': '198.51.100.240' } })).response.status).toBe(401);
    } finally {
      noSecret.stop();
    }
  });
});

// --- Browser ---------------------------------------------------------------------------------

describe('in a browser', () => {
  beforeAll(async () => {
    try {
      browser = await chromium.launch({
        env: chromiumEnv() as Record<string, string>,
        timeout: 30000,
      });
    } catch (error) {
      const chromiumLibs = process.env.CHROMIUM_LIBS_DIR || path.join(os.homedir(), '.cache/chromium-libs');
      throw new Error(
        'Could not start Chromium. ' +
        `CHROMIUM_LIBS_DIR=${chromiumLibs}\n` +
        'Install it with `npx playwright install --with-deps chromium` (root) ' +
        'or `npx playwright install chromium && python3 scripts/setup-chromium-libs.py` (no root).\n' +
        String(error),
      );
    }
  });

  async function open(pathname: string) {
    const page = await browser!.newPage({ viewport: { width: 1100, height: 720 } });
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(String(error)));
    page.on('console', (message) => {
      // The articles page asks /api/auth/me who is logged in; the browser logs the visitor's expected 401.
      const isExpectedVisitorCheck = message.location().url.endsWith('/api/auth/me') && message.text().includes('401');
      if (message.type() === 'error' && !isExpectedVisitorCheck) problems.push(message.text());
    });
    await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return { page, problems };
  }

  it('renders the home page with its own styles and no console errors', async () => {
    const { page, problems } = await open('/');

    expect(await page.locator('h1').textContent()).toBe('Your Next.js app is ready.');
    const styles = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      headline: getComputedStyle(document.querySelector('h1')!).color,
      align: getComputedStyle(document.querySelector('.starter > main')!).textAlign,
    }));
    expect(styles).toEqual({ background: 'rgb(20, 19, 19)', headline: 'rgb(237, 245, 205)', align: 'center' });
    expect(problems).toEqual([]);
    await page.close();
  });

  it('renders the shared components with the design tokens, without leaking starter styles', async () => {
    const { page, problems } = await open('/ui-preview');

    const styles = await page.evaluate(() => {
      const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
      const buttons = [...document.querySelectorAll('button')];
      const named = (label: string) => getComputedStyle(buttons.find((button) => button.textContent === label)!);
      return {
        primary: named('default').backgroundColor,
        primaryText: named('default').color,
        destructive: named('destructive').backgroundColor,
        ghostBackground: named('ghost').backgroundColor,
        buttonHeight: named('default').height,
        buttonBorderColor: named('default').borderTopColor,
        mainAlign: style('main').textAlign,
        cardTitleMargin: style('h3').marginTop,
        cardBackground: style('main > div').backgroundColor,
      };
    });
    expect(styles).toEqual({
      primary: 'rgb(229, 245, 32)',
      primaryText: 'rgb(26, 25, 25)',
      destructive: 'rgb(239, 68, 68)',
      ghostBackground: 'rgba(0, 0, 0, 0)',
      buttonHeight: '40px',
      buttonBorderColor: 'rgba(0, 0, 0, 0)',
      mainAlign: 'start',
      cardTitleMargin: '0px',
      cardBackground: 'rgb(28, 27, 27)',
    });
    expect(problems).toEqual([]);
    await page.close();
  });

  it('validates e-mail before requesting a sign-in link', async () => {
    const { page, problems } = await open('/login');

    await page.click('button[type=submit]');
    expect(await page.locator('text=Enter a valid e-mail address').count()).toBe(1);
    expect(await page.locator('input[name=email]').getAttribute('aria-invalid')).toBe('true');
    expect(problems).toEqual([]);
    await page.close();
  });

    it('shows the same generic confirmation for an uninvited address', async () => {
    const { page, problems } = await open('/login');

    await page.fill('input[name=email]', 'nobody-here@example.com');
    await page.click('button[type=submit]');
    await page.getByText('If an invitation exists for this address, a sign-in link has been sent. Check your e-mail.').waitFor();
    expect(problems).toEqual([]);
    await page.close();
  });
});

describe('mock booking payment flow', () => {
  it('creates a booking, completes mock checkout, and keeps failed or abandoned payments unpaid', async () => {
    const suffix = randomBytes(4).toString('hex');
    const seeker = await registerPilotUser('seeker', 'Booking Seeker');
    const mentor = await registerPilotUser('mentor', 'Booking Mentor');
    const profileResponse = await api('/api/mentors', {
      method: 'POST',
      cookie: mentor.cookie,
      json: {
        slug: `e2e-mentor-${suffix}`,
        headline: 'E2E mentor',
        bio: 'A mentor profile for booking flow verification.',
        technologies: 'typescript',
        publicWorkUrl: 'https://example.com/work',
        isListed: true,
      },
    });
    expect(profileResponse.response.status).toBe(201);
    const profile = profileResponse.body.data;
    const seekerTerms = await currentTerms('seeker');
    let bookingAttempt = 0;
    const createBooking = async (question: string) => {
      const slotStart = new Date(Math.ceil((Date.now() + (60 + bookingAttempt++ * 30) * 60_000) / (15 * 60_000)) * (15 * 60_000));
      const slotResponse = await api('/api/mentors/me/availability', {
        method: 'POST',
        cookie: mentor.cookie,
        json: { startsAt: slotStart.toISOString() },
      });
      if (slotResponse.response.status !== 200) {
        const serverErrors = server.log().split('\n').flatMap((line) => {
          if (!line.includes('"level":"error"')) return [];
          try {
            const parsed = JSON.parse(line) as { error?: { name?: string; message?: string } };
            return [`${parsed.error?.name ?? 'Error'}: ${parsed.error?.message ?? 'unknown server error'}`];
          } catch {
            return [];
          }
        });
        throw new Error(`Could not publish an availability slot: ${slotResponse.text}; ${serverErrors.join(' | ')}`);
      }
      const landedAt = new Date().toISOString();
      const response = await api('/api/bookings', {
        method: 'POST',
        cookie: seeker.cookie,
        json: {
          mentorId: profile.id,
          availabilitySlotId: slotResponse.body.data.id,
          question,
          source: 'list',
          landedAt,
          acceptedTerms: true,
          termsVersionId: seekerTerms.id,
          termsSha256: seekerTerms.sha256,
        },
      });
      expect(response.response.status).toBe(201);
      expect(response.body.data.booking).toMatchObject({
        seekerId: seeker.body.data.id,
        mentorId: expect.any(String),
        question,
        durationMinutes: 25,
        priceMinor: 2500,
        currency: 'EUR',
        status: 'pending_payment',
        source: 'list',
        landedAt,
        startsAt: slotResponse.body.data.startsAt,
        endsAt: slotResponse.body.data.endsAt,
      });
      expect(response.body.data.checkoutUrl).toMatch(/^\/mock-payment\/checkout\//);
      return response.body.data;
    };

    const paidAttempt = await createBooking('How do I keep this service reliable?');
    const checkoutPage = await fetch(`${baseUrl}${paidAttempt.checkoutUrl}`);
    expect(checkoutPage.status).toBe(200);
    const completed = await api(`/api/bookings/${paidAttempt.booking.id}/mock-payment`, {
      method: 'POST',
      cookie: seeker.cookie,
      json: { outcome: 'complete' },
    });
    expect(completed.response.status).toBe(200);
    expect(completed.body.data.status).toBe('paid');

    const afterWebhookReconcile = await api(`/api/bookings/${paidAttempt.booking.id}/reconcile-payment`, {
      method: 'POST',
      cookie: seeker.cookie,
      json: {},
    });
    expect(afterWebhookReconcile.body.data.status).toBe('paid');

    const failedAttempt = await createBooking('Why does my test fail intermittently?');
    const failed = await api(`/api/bookings/${failedAttempt.booking.id}/mock-payment`, {
      method: 'POST',
      cookie: seeker.cookie,
      json: { outcome: 'fail' },
    });
    expect(failed.response.status).toBe(200);
    expect(failed.body.data.status).toBe('payment_failed');

    const abandonedAttempt = await createBooking('How should I diagnose this timeout?');
    const unpaid = await api(`/api/bookings/${abandonedAttempt.booking.id}/reconcile-payment`, {
      method: 'POST',
      cookie: seeker.cookie,
      json: {},
    });
    expect(unpaid.body.data.status).toBe('pending_payment');

    const mentorList = await api('/api/bookings?role=mentor', { cookie: mentor.cookie });
    const mentorPaid = mentorList.body.data.items.find((item: { id: string }) => item.id === paidAttempt.booking.id);
    const mentorFailed = mentorList.body.data.items.find((item: { id: string }) => item.id === failedAttempt.booking.id);
    expect(mentorPaid.question).toBe('How do I keep this service reliable?');
    expect(mentorFailed).toBeUndefined();
    expect(mentorList.body.data.items.some((item: { id: string }) => item.id === abandonedAttempt.booking.id)).toBe(false);
    expect(unpaid.body.data.status).not.toBe('paid');
  }, 120_000);
});

describe('mentor profile publication', () => {
  beforeAll(async () => {
    if (browser) return;
    browser = await chromium.launch({ env: chromiumEnv() as Record<string, string>, timeout: 30_000 });
  });

  afterAll(async () => {
    if (browser) await browser.close();
    browser = undefined;
  });

  it('blocks publishing until the mentor chooses at least one technology', async () => {
    const mentor = await registerPilotUser('mentor', 'Profile Test Mentor');
    const page = await browser!.newPage({ viewport: { width: 1100, height: 720 } });
    try {
      await page.context().addCookies([{ name: 'devmentor_session', value: mentor.cookie.slice('devmentor_session='.length), url: baseUrl, httpOnly: true, sameSite: 'Lax' }]);
      await page.goto(`${baseUrl}/profile`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('link', { name: 'Edit mentor profile' }).click();
      await page.getByRole('heading', { name: 'Create mentor profile' }).waitFor({ state: 'visible' });

      await page.getByLabel('Profile link').fill(`mentor-without-technology-${randomBytes(3).toString('hex')}`);
      await page.getByLabel('Headline').fill('Independent software mentor');
      await page.getByLabel('Bio').fill('I help teams build and maintain reliable software.');
      await page.getByLabel('Public work URL').fill('https://example.com/mentor-work');
      await page.getByLabel('Publish this profile').check();
      await page.getByRole('button', { name: 'Create and publish profile' }).click();

      await page.locator('p[role="alert"]').waitFor({ state: 'visible' });
      if (!(await page.getByRole('button', { name: 'Create and publish profile' }).isVisible())) {
        throw new Error('Publish action should stay available after the validation error.');
      }
      if (await page.getByRole('heading', { name: 'Your profile is published' }).count() !== 0) {
        throw new Error('The profile must remain unpublished when no technology is selected.');
      }
      await page.screenshot({ path: path.join(ROOT, '.ai/qa/artifacts/mentor-profile-requires-technology.png'), fullPage: true });
    } finally {
      await page.close();
    }
  });

  it('requires current vault notice consent before publishing a note', async () => {
    const mentor = await registerPilotUser('mentor', 'Vault Consent Mentor');
    const created = await api('/api/notes', {
      method: 'POST', cookie: mentor.cookie,
      json: { title: `Consent note ${randomBytes(3).toString('hex')}`, body: 'A note that requires explicit consent before publication.' },
    });
    expect(created.response.status).toBe(201);

    const missingConsent = await api(`/api/notes/${created.body.data.id}/publish`, {
      method: 'POST', cookie: mentor.cookie, json: { consent: false, noticeVersion: VAULT_NOTICE_VERSION },
    });
    expect(missingConsent.response.status).toBe(400);
    expect((await api(`/api/notes/${created.body.data.id}`, { cookie: mentor.cookie })).body.data.status).toBe('draft');

    const mentorTerms = await currentTerms('mentor');
    const staleNotice = await api(`/api/notes/${created.body.data.id}/publish`, {
      method: 'POST', cookie: mentor.cookie,
      json: {
        consent: true,
        noticeVersion: 'stale-e2e-notice',
        acceptedTerms: true,
        termsVersionId: mentorTerms.id,
        termsSha256: mentorTerms.sha256,
      },
    });
    expect(staleNotice.response.status).toBe(409);
    expect((await api(`/api/notes/${created.body.data.id}`, { cookie: mentor.cookie })).body.data.status).toBe('draft');
  });
});

describe('mock vault purchase and mentor preview', () => {
  beforeAll(async () => {
    if (browser) return;
    browser = await chromium.launch({
      env: chromiumEnv() as Record<string, string>,
      timeout: 30_000,
    });
  });

  afterAll(async () => {
    await browser?.close();
    browser = undefined;
  });

  it('shows the paid answer to the cited mentor first and releases it after approval', async () => {
    const mentorName = 'Vault Mentor';
    const seeker = await registerPilotUser('seeker', 'Vault Seeker');
    const mentor = await registerPilotUser('mentor', mentorName);
    const artifactsDir = path.join(ROOT, '.ai/qa/artifacts_e02-local');
    fs.mkdirSync(artifactsDir, { recursive: true });
    const noteTitle = `Vault note ${randomBytes(3).toString('hex')}`;
    const createdNote = await api('/api/notes', {
      method: 'POST',
      cookie: mentor.cookie,
      json: { title: noteTitle, body: 'A reliable service uses observable health checks and bounded retries.' },
    });
    expect(createdNote.response.status).toBe(201);
    const mentorTerms = await currentTerms('mentor');
    const published = await api(`/api/notes/${createdNote.body.data.id}/publish`, {
      method: 'POST',
      cookie: mentor.cookie,
      json: {
        consent: true,
        noticeVersion: VAULT_NOTICE_VERSION,
        acceptedTerms: true,
        termsVersionId: mentorTerms.id,
        termsSha256: mentorTerms.sha256,
      },
    });
    expect(published.response.status).toBe(200);
    expect(published.body.data.status).toBe('published');

    const cookieFor = (user: { cookie: string }) => {
      const pair = user.cookie.split(';')[0] ?? '';
      const separator = pair.indexOf('=');
      return { name: pair.slice(0, separator), value: pair.slice(separator + 1) };
    };
    const seekerPage = await browser!.newPage({ viewport: { width: 1100, height: 720 } });
    await seekerPage.context().addCookies([{ ...cookieFor(seeker), url: baseUrl, httpOnly: true, sameSite: 'Lax' }]);
    const browserProblems: string[] = [];
    seekerPage.on('console', (message) => { if (message.type() === 'error') browserProblems.push(message.text()); });
    seekerPage.on('response', (response) => { if (response.url().includes('/api/vault-answers') && response.status() >= 400) browserProblems.push(`${response.status()} ${response.url()}`); });
    seekerPage.on('pageerror', (error) => browserProblems.push(String(error)));
    await seekerPage.goto(`${baseUrl}/vault`, { waitUntil: 'domcontentloaded' });
    expect(await seekerPage.getByRole('heading', { name: 'Ask the vault' }).count()).toBe(1);
    const question = `How should I make a service more reliable? ${randomBytes(2).toString('hex')}`;
    await seekerPage.getByLabel('Your question').fill(question);
    await seekerPage.getByRole('checkbox').check();
    await seekerPage.getByRole('button', { name: /Pay .*and send/ }).click();
    await seekerPage.getByRole('heading', { name: 'Local mock checkout' }).waitFor({ timeout: 10_000 });
    await seekerPage.getByRole('button', { name: 'Complete test payment' }).click();
    await seekerPage.waitForURL(/\/vault\/[0-9a-f-]+$/);
    await seekerPage.getByText('Waiting for the mentors whose notes were used').waitFor({ timeout: 10_000 }).catch(async () => {
      await seekerPage.reload({ waitUntil: 'domcontentloaded' });
      await seekerPage.getByText('Waiting for the mentors whose notes were used').waitFor({ timeout: 30_000 });
    });

    const mentorPage = await browser!.newPage({ viewport: { width: 1100, height: 720 } });
    await mentorPage.context().addCookies([{ ...cookieFor(mentor), url: baseUrl, httpOnly: true, sameSite: 'Lax' }]);
    mentorPage.on('pageerror', (error) => browserProblems.push(String(error)));
    await mentorPage.goto(`${baseUrl}/mentor/previews`, { waitUntil: 'domcontentloaded' });
    await mentorPage.getByText(question).waitFor();
    await mentorPage.getByText(`A mock answer based on ${noteTitle}.`).waitFor();
    await mentorPage.screenshot({ path: path.join(artifactsDir, 'vault-mentor-preview.png'), fullPage: true });
    await mentorPage.setViewportSize({ width: 390, height: 844 });
    await expectElementVisible(mentorPage.getByRole('button', { name: new RegExp(`Approve the answer that cites ${noteTitle}`) }));
    await mentorPage.getByRole('button', { name: new RegExp(`Approve the answer that cites ${noteTitle}`) }).click();
    await mentorPage.getByText('Nothing to review').waitFor();

    await seekerPage.getByText('Generated by AI from the notes below. Not written by the mentor.').waitFor({ timeout: 10_000 });
    await seekerPage.getByText(`${mentorName}, ${noteTitle}`).waitFor();
    await seekerPage.screenshot({ path: path.join(artifactsDir, 'vault-answer-released.png'), fullPage: true });
    expect(browserProblems).toEqual([]);
    await mentorPage.close();
    await seekerPage.close();
  }, 120_000);

  it('does not expose another seekerâ€™s answer to an authenticated non-participant', async () => {
    const seeker = await registerPilotUser('seeker', 'Private Answer Buyer');
    const otherSeeker = await registerPilotUser('seeker', 'Unrelated Seeker');
    const mentor = await registerPilotUser('mentor', 'Private Answer Mentor');
    const note = await api('/api/notes', {
      method: 'POST', cookie: mentor.cookie,
      json: { title: `Private answer source ${randomBytes(3).toString('hex')}`, body: 'Health checks reveal whether a service is ready to receive traffic.' },
    });
    expect(note.response.status).toBe(201);
    const mentorTerms = await currentTerms('mentor');
    const published = await api(`/api/notes/${note.body.data.id}/publish`, {
      method: 'POST', cookie: mentor.cookie,
      json: { consent: true, noticeVersion: VAULT_NOTICE_VERSION, acceptedTerms: true, termsVersionId: mentorTerms.id, termsSha256: mentorTerms.sha256 },
    });
    expect(published.response.status).toBe(200);

    const seekerPage = await browser!.newPage();
    await seekerPage.context().addCookies([{ name: 'devmentor_session', value: seeker.cookie.slice('devmentor_session='.length), url: baseUrl, httpOnly: true, sameSite: 'Lax' }]);
    try {
      await seekerPage.goto(`${baseUrl}/vault`, { waitUntil: 'domcontentloaded' });
      await seekerPage.getByLabel('Your question').fill(`Private access check ${randomBytes(2).toString('hex')}`);
      await seekerPage.getByRole('checkbox').check();
      await seekerPage.getByRole('button', { name: /Pay .*and send/ }).click();
      await seekerPage.getByRole('heading', { name: 'Local mock checkout' }).waitFor();
      await seekerPage.getByRole('button', { name: 'Complete test payment' }).click();
      await seekerPage.waitForURL(/\/vault\/[0-9a-f-]+$/);
      const answerId = seekerPage.url().split('/').at(-1);
      expect(answerId).toBeTruthy();

      const response = await api(`/api/vault-answers/${answerId}`, { cookie: otherSeeker.cookie });
      expect(response.response.status).toBe(404);
      expect(response.body.ok).toBe(false);
    } finally {
      await seekerPage.close();
    }
  }, 120_000);
});

async function expectElementVisible(locator: import('playwright').Locator): Promise<void> {
  await locator.waitFor({ state: 'visible' });
}

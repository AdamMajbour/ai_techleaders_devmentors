/**
 * End-to-end test against a real production server (`next build` + `next start`)
 * backed by a real PostgreSQL database. It uses its own database (`devmentor_e2e`),
 * migrates and seeds it through the same npm scripts developers use, and migrates it
 * back down afterwards. Pages and the API are checked over HTTP, and the pages are also rendered in headless Chromium (computed styles, console errors).
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';

const APP_DIR = path.resolve(__dirname, '..');
const ROOT = path.resolve(APP_DIR, '../..');

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_NAME: process.env.DATABASE_E2E_NAME || 'devmentor_e2e',
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

let browser: Browser | undefined;
let server: ChildProcess | undefined;
let serverLog = '';
let baseUrl = '';

function run(args: string[], cwd = ROOT) {
  execFileSync('npm', args, { cwd, env, stdio: 'pipe' });
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

async function waitForServer(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error(`Server exited early:\n${serverLog}`);
    try {
      if ((await fetch(`${url}/api/health`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready within ${timeoutMs} ms:\n${serverLog}`);
}

beforeAll(async () => {
  run(['--workspace=@devmentor/db', 'run', 'migrate']);
  run(['--workspace=@devmentor/db', 'run', 'seed']);
  run(['run', 'build'], APP_DIR);

  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  // Own process group, so the whole npx -> next-server tree can be stopped in afterAll.
  server = spawn('npx', ['next', 'start', '--port', String(port)], { cwd: APP_DIR, env, detached: true });
  server.stdout?.on('data', (chunk) => (serverLog += chunk));
  server.stderr?.on('data', (chunk) => (serverLog += chunk));
  await waitForServer(baseUrl, 60_000);
}, 180_000);

afterAll(async () => {
  await browser?.close();
  if (server?.pid) process.kill(-server.pid, 'SIGTERM');
  run(['--workspace=@devmentor/db', 'run', 'migrate:down']);
}, 60_000);

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
});

describe('API', () => {
  it('reports health without touching the database', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });

  it('finds a seeded user by e-mail through the DI container', async () => {
    const response = await fetch(`${baseUrl}/api/users?email=ada@devmentor.local`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ email: 'ada@devmentor.local', name: 'Ada Mentor' });
  });

  it('validates query parameters and reports unknown users', async () => {
    expect((await fetch(`${baseUrl}/api/users`)).status).toBe(400);
    expect((await fetch(`${baseUrl}/api/users?email=nobody@devmentor.local`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/api/articles?authorId=not-a-uuid`)).status).toBe(400);
  });

  it('lists the seeded article of that user', async () => {
    const user = await (await fetch(`${baseUrl}/api/users?email=ada@devmentor.local`)).json();

    const response = await fetch(`${baseUrl}/api/articles?authorId=${user.id}`);
    expect(response.status).toBe(200);
    const { articles } = await response.json();
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({ title: 'Getting started with mentoring', authorId: user.id });
  });

  it('serves concurrent requests, each in its own scope', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => fetch(`${baseUrl}/api/users?email=linus@devmentor.local`)),
    );
    expect(responses.map((response) => response.status)).toEqual(Array(10).fill(200));
  });
});

describe('in a browser', () => {
  beforeAll(async () => {
    try {
      browser = await chromium.launch({ env: chromiumEnv() as Record<string, string> });
    } catch (error) {
      throw new Error(
        'Could not start Chromium. Install it with `npx playwright install --with-deps chromium` ' +
          '(root) or `npx playwright install chromium && python3 scripts/setup-chromium-libs.py` (no root).\n' +
          String(error),
      );
    }
  });

  async function open(pathname: string) {
    const page = await browser!.newPage({ viewport: { width: 1100, height: 720 } });
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(String(error)));
    page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
    await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'networkidle' });
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
});

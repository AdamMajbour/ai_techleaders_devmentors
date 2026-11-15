// Local recording helper. Session cookies stay in the ignored .ai/tmp directory.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';

const descriptor = JSON.parse(readFileSync('.ai/qa/test-env.json', 'utf8'));
const demoEnv = parseEnv(readFileSync('.ai/qa/test-env.env', 'utf8'));
const baseUrl = descriptor.baseUrl;
assert.equal(descriptor.status, 'running');
assert.equal(descriptor.startedByThisRepo, true);
assert.equal(new URL(baseUrl).hostname, '127.0.0.1');
assert.equal(new URL(demoEnv.DATABASE_URL).hostname, '127.0.0.1');
assert.equal(demoEnv.AUTH_IDENTITY_ADAPTER, 'mock');
assert.equal(demoEnv.INTEGRATION_TEST_RUN, '1');
assert.equal(demoEnv.OPERATOR_EMAILS, 'mock-operator@devmentor.test');

const privateDir = '.ai/tmp/lesson-16';
const evidenceDir = '.ai/qa/lesson-16';
mkdirSync(privateDir, { recursive: true, mode: 0o700 });
chmodSync(privateDir, 0o700);
mkdirSync(evidenceDir, { recursive: true });

function run(command, args, options = {}) {
  const executable = process.platform === 'win32'
    ? command === 'npm' ? 'npm.cmd' : command === 'curl' ? 'curl.exe' : command
    : command;
  const result = spawnSync(executable, args, { encoding: 'utf8', shell: process.platform === 'win32' && executable.endsWith('.cmd'), ...options });
  // Do not include command arguments, environment, or HTTP headers in failures.
  if (result.error || result.status !== 0) {
    const message = command === 'curl'
      ? `INDETERMINATE: HTTP transport failed (curl exit ${result.status ?? 'unknown'}). Check that the prepared app is reachable.`
      : `${executable} failed; exit ${result.status}`;
    throw new Error(message);
  }
  return result.stdout;
}

run('npm', ['--workspace=@devmentor/db', 'run', 'seed:lesson-16-session'], {
  env: { ...process.env, ...demoEnv, DB_DEBUG: 'false' },
  stdio: 'inherit',
});

const db = new pg.Client({ connectionString: demoEnv.DATABASE_URL });
let booking;
try {
  await db.connect();
  const result = await db.query(
    'SELECT id, starts_at, ends_at FROM bookings WHERE id = $1',
    ['0e7c8b4a-ef14-4e71-a618-161600000003'],
  );
  assert.equal(result.rows.length, 1);
  booking = result.rows[0];
} finally {
  await db.end();
}

const jars = {};
for (const persona of ['mentee', 'operator']) {
  const jar = `${privateDir}/${persona}.txt`;
  writeFileSync(jar, '', { mode: 0o600 });
  chmodSync(jar, 0o600);
  run('curl', ['-sS', '--max-time', '90', '--proto', '=http',
    '-c', jar, '-o', process.platform === 'win32' ? 'NUL' : '/dev/null',
    `${baseUrl}/api/auth/github/mock?persona=${persona}`]);
  assert.ok(/\tdevmentor_session\t/.test(readFileSync(jar, 'utf8')), 'Session cookie missing');
  jars[persona] = jar;
}

function request(persona, method = 'GET', path = `/api/bookings/${booking.id}`) {
  const args = ['-sS', '--max-time', '60', '-b', jars[persona], '-w', '\n%{http_code}'];
  if (method === 'POST') args.push('-X', 'POST', '-H', 'content-type: application/json',
    '-H', 'x-devmentor-request: 1', '-H', 'x-requested-with: devmentor', '--data', '{"body":"let me in"}');
  const raw = run('curl', [...args, `${baseUrl}${path}`]);
  const split = raw.lastIndexOf('\n');
  const status = Number(raw.slice(split + 1));
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new Error('INDETERMINATE: HTTP response did not include a valid status code.');
  }
  let body;
  try {
    body = JSON.parse(raw.slice(0, split));
  } catch {
    throw new Error(`INDETERMINATE: HTTP ${status} response was not valid JSON.`);
  }
  return { status, body };
}

const operatorAccess = request('operator', 'GET', '/api/operator/users');
assert.equal(operatorAccess.status, 200, 'Operator fixture must have operator access.');

const beforeBooking = request('mentee');
assert.equal(beforeBooking.status, 200);
assert.equal(beforeBooking.body.ok, true);
assert.equal(beforeBooking.body.data.status, 'accepted');
const before = request('mentee', 'GET', `/api/bookings/${booking.id}/messages`);
assert.equal(before.status, 200);
assert.equal(before.body.ok, true);
assert.equal(before.body.data.items.length, 2);
const refusedRead = request('operator', 'GET', `/api/bookings/${booking.id}/messages`);
assert.equal(refusedRead.status, 403);
assert.equal(refusedRead.body.error.code, 'forbidden');
assert.equal('data' in refusedRead.body, false);
assert.equal(JSON.stringify(refusedRead.body).includes('body'), false);
const refusedWrite = request('operator', 'POST', `/api/bookings/${booking.id}/messages`);
assert.equal(refusedWrite.status, 403);
assert.equal(refusedWrite.body.error.code, 'forbidden');
assert.equal('data' in refusedWrite.body, false);
const after = request('mentee', 'GET', `/api/bookings/${booking.id}/messages`);
assert.equal(after.status, 200);
assert.deepEqual(after.body.data.items, before.body.data.items);

const shellQuote = value => `'${value.replaceAll("'", "'\\''")}'`;
const values = { BASE_URL: baseUrl, BOOKING_ID: booking.id,
  MENTEE: jars.mentee, OPERATOR: jars.operator, SESSION_ENDS_AT: booking.ends_at.toISOString() };
writeFileSync(`${privateDir}/scene.env`, Object.entries(values)
  .map(([key, value]) => `export ${key}=${shellQuote(value)}\n`).join(''), { mode: 0o600 });
const report = {
  verifiedAt: new Date().toISOString(), baseUrl, bookingId: booking.id,
  pageUrl: `${baseUrl}/sessions/${booking.id}`,
  menteeLoginUrl: `${baseUrl}/api/auth/github/mock?persona=mentee&returnTo=%2Fsessions%2F${booking.id}`,
  endsAt: booking.ends_at.toISOString(),
  checks: { menteeRead: beforeBooking.status, operatorUsersAccess: operatorAccess.status,
    operatorRead: refusedRead.status, operatorPost: refusedWrite.status,
    messagesBefore: before.body.data.items, messagesAfter: after.body.data.items,
    messagesUnchanged: true },
};
writeFileSync(`${evidenceDir}/verification.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Ready: ${report.pageUrl}\nBooking: ${booking.id}`);
console.log(`Session open until: ${new Date(report.endsAt).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })} (Europe/Warsaw)`);
console.log('Verified: mentee GET 200; operator users access 200; operator session GET/POST 403 forbidden; full message list unchanged.');
console.log('Load recording variables: source .ai/tmp/lesson-16/scene.env');

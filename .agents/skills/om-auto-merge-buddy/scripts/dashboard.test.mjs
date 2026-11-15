import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { request as httpRequest } from 'node:http'
import test from 'node:test'
import { rowVersion, startDashboard } from './dashboard.mjs'

async function freePort() {
  const probe = createServer()
  await new Promise((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', resolve)
  })
  const { port } = probe.address()
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()))
  return port
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'merge-buddy-dashboard-test-'))
  const meta = join(root, '.ai', 'meta')
  await mkdir(meta, { recursive: true })
  const port = await freePort()
  const dashboard = await startDashboard({ root, port })
  t.after(async () => {
    await new Promise(resolve => dashboard.server.close(resolve))
    await rm(root, { recursive: true, force: true })
  })
  return { root, meta, ...dashboard }
}

async function readCsrf(url) {
  const response = await fetch(url)
  assert.equal(response.status, 200)
  const html = await response.text()
  const token = /window\.dashboardCsrf="([^"]+)"/.exec(html)?.[1]
  assert.ok(token, 'dashboard page should expose its per-process CSRF token')
  return token
}

function row(overrides = {}) {
  return {
    repository: 'owner/repo',
    number: 7,
    head: 'a'.repeat(40),
    updatedAt: '2026-11-15T10:00:00.000Z',
    outcome: 'ready',
    reservation: null,
    ...overrides,
  }
}

async function saveState(meta, rows) {
  await writeFile(join(meta, 'merge-buddy.json'), JSON.stringify({ version: 1, repository: 'owner/repo', activePrs: rows, queue: [], dismissedPrs: [] }))
}

async function state(url) {
  const response = await fetch(`${url}/api/state`)
  assert.equal(response.status, 200)
  return response.json()
}

async function postCommand(url, csrfToken, expectedVersion, options = {}) {
  return fetch(`${url}/api/commands`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dashboard-csrf': csrfToken,
      origin: url,
      ...options.headers,
    },
    body: options.body ?? JSON.stringify({ operation: 'dismiss', repository: 'owner/repo', number: options.number ?? 7, expectedVersion }),
  })
}

test('dashboard rejects hostile hosts, cross-origin and missing CSRF, and oversized command bodies', async t => {
  const app = await fixture(t)
  const token = await readCsrf(app.url)

  const port = Number(new URL(app.url).port)
  const hostileHost = await new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port, path: '/api/state', headers: { host: 'attacker.example' } }, response => {
      response.resume()
      response.once('end', () => resolve(response.statusCode))
    })
    request.once('error', reject)
    request.end()
  })
  assert.equal(hostileHost, 403)

  const crossOrigin = await postCommand(app.url, token, 'a'.repeat(64), { headers: { origin: 'http://attacker.example' } })
  assert.equal(crossOrigin.status, 403)

  const missingCsrf = await postCommand(app.url, token, 'a'.repeat(64), { headers: { 'x-dashboard-csrf': '' } })
  assert.equal(missingCsrf.status, 403)

  const oversized = await postCommand(app.url, token, 'a'.repeat(64), { body: ' '.repeat(8193) })
  assert.equal(oversized.status, 413)
  assert.deepEqual(await readdir(app.meta), [])
})

test('dashboard rejects stale row snapshots and active reservations before publishing commands', async t => {
  const app = await fixture(t)
  const token = await readCsrf(app.url)
  const initial = row()
  await saveState(app.meta, [initial])
  const initialVersion = (await state(app.url)).activePrs[0].localVersion

  const changed = row({ head: 'b'.repeat(40), updatedAt: '2026-11-15T11:00:00.000Z' })
  await saveState(app.meta, [changed])
  const stale = await postCommand(app.url, token, initialVersion)
  assert.equal(stale.status, 409)
  assert.match((await stale.json()).error, /row changed/)
  await assert.rejects(readdir(join(app.meta, 'merge-buddy-commands')), { code: 'ENOENT' })

  const currentVersion = (await state(app.url)).activePrs[0].localVersion
  const accepted = await postCommand(app.url, token, currentVersion)
  assert.equal(accepted.status, 202)
  assert.equal((await accepted.json()).status, 'pending')
  const files = await readdir(join(app.meta, 'merge-buddy-commands'))
  assert.equal(files.filter(name => name.endsWith('.json') && !name.endsWith('.ack.json')).length, 1)

  const reserved = row({ number: 8, head: 'c'.repeat(40), reservation: { runId: 'active-run' } })
  await saveState(app.meta, [reserved])
  const reservedVersion = (await state(app.url)).activePrs.find(value => value.number === 8).localVersion
  const blocked = await postCommand(app.url, token, reservedVersion, { number: 8 })
  assert.equal(blocked.status, 409)
  assert.match((await blocked.json()).error, /ownership is active or unknown/)
  assert.equal((await readdir(join(app.meta, 'merge-buddy-commands'))).length, 1)
})

test('row version changes when material PR state changes', () => {
  const rootFingerprint = createHash('sha256').update('/repo').digest('hex')
  const original = row()
  assert.notEqual(rowVersion(rootFingerprint, 'owner/repo', original), rowVersion(rootFingerprint, 'owner/repo', row({ outcome: 'working' })))
  assert.notEqual(rowVersion(rootFingerprint, 'owner/repo', original), rowVersion(rootFingerprint, 'owner/repo', row({ reservation: { runId: 'active-run' } })))
})

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const SCRIPT = fileURLToPath(new URL('./select-issues.mjs', import.meta.url))
const now = '2026-11-15T12:00:00.000Z'
const config = {
  labels: {
    enabled: true,
    pipeline: ['review', 'changes-requested', 'qa', 'qa-failed', 'merge-queue', 'blocked', 'do-not-merge'],
    priority: ['priority-low', 'priority-medium', 'priority-high', 'priority-extreme'],
    risk: ['risk-low', 'risk-medium', 'risk-high'],
  },
  autofix: { label: 'cez-autofix', eligibility: { lookbackDays: 7, analyzeLimit: 50, limit: 20 } },
}

function issue(issueId, overrides = {}) {
  return {
    issueId,
    state: 'OPEN',
    isPullRequest: false,
    labels: [],
    claimStatus: 'clear',
    createdAt: '2026-11-12T12:00:00.000Z',
    ...overrides,
  }
}

function run(input) {
  return spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify({ config, now, ...input }),
    encoding: 'utf8',
  })
}

test('selection respects state, kind, claims, labels, date window and priority order', () => {
  const result = run({ issues: [
    issue('low', { labels: ['priority-low'] }),
    issue('high', { labels: ['priority-high', 'risk-low'] }),
    issue('closed', { state: 'CLOSED' }),
    issue('pull', { isPullRequest: true }),
    issue('claimed', { claimStatus: 'active' }),
    issue('unknown-claim', { claimStatus: 'unknown' }),
    issue('excluded', { labels: ['do-not-fix'] }),
    issue('queued', { labels: ['cez-autofix'] }),
    issue('outside-window', { createdAt: '2026-11-01T12:00:00.000Z' }),
  ] })

  assert.equal(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout)
  assert.deepEqual(output.shortlist.map(value => value.issueId), ['high', 'low'])
  assert.deepEqual(output.rejected, [
    { issueId: 'claimed', reason: 'actively claimed' },
    { issueId: 'closed', reason: 'closed' },
    { issueId: 'excluded', reason: 'label do-not-fix' },
    { issueId: 'pull', reason: 'pull request' },
    { issueId: 'queued', reason: 'already queued' },
    { issueId: 'unknown-claim', reason: 'claim unknown' },
  ])
  assert.equal(output.outsideWindow, 1)
  assert.equal(output.window, 1)
})

test('from-oldest windows advance by lookback span and exclude newer issues', () => {
  const result = run({ window: 2, issues: [
    issue('old', { createdAt: '2026-10-20T12:00:00.000Z' }),
    issue('middle', { createdAt: '2026-10-27T12:00:00.000Z' }),
    issue('new', { createdAt: '2026-11-12T12:00:00.000Z' }),
  ], fromOldest: true })

  assert.equal(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout)
  assert.equal(output.start, '2026-10-27T12:00:00.000Z')
  assert.equal(output.end, '2026-11-03T12:00:00.000Z')
  assert.deepEqual(output.shortlist.map(value => value.issueId), ['middle'])
  assert.equal(output.nextWindow, true)
})

test('plan apply rechecks proposal, labels, claims and current suitability evidence', () => {
  const eligible = issue('eligible', { judgment: { outcome: 'match', reason: 'In scope', evidence: ['matches criteria'] } })
  const result = run({ action: 'plan-apply', proposalIds: ['eligible', 'claimed', 'no-evidence'], confirmedIds: ['eligible', 'claimed', 'not-proposed', 'no-evidence'], issues: [
    eligible,
    issue('claimed', { claimStatus: 'active', judgment: { outcome: 'match', reason: 'In scope', evidence: ['evidence'] } }),
    issue('not-proposed', { judgment: { outcome: 'match', reason: 'In scope', evidence: ['evidence'] } }),
    issue('no-evidence', { judgment: { outcome: 'match', reason: 'In scope', evidence: [] } }),
  ] })

  assert.equal(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout)
  assert.deepEqual(output.applyIds, ['eligible'])
  assert.deepEqual(output.skipped, [
    { issueId: 'claimed', reason: 'actively claimed' },
    { issueId: 'not-proposed', reason: 'not in proposal' },
    { issueId: 'no-evidence', reason: 'current suitability not established' },
  ])

  const disabled = run({ action: 'plan-apply', proposalIds: ['eligible'], confirmedIds: ['eligible'], config: { ...config, labels: { ...config.labels, enabled: false } }, issues: [eligible] })
  assert.equal(JSON.parse(disabled.stdout).skipped[0].reason, 'labels disabled')
})

test('invalid windows and unsafe or duplicate issue identifiers fail closed', () => {
  const duplicate = run({ issues: [issue('same'), issue('same')] })
  assert.notEqual(duplicate.status, 0)
  assert.match(duplicate.stderr, /Issue IDs must be unique safe native identifiers/)

  const unsafe = run({ issues: [issue('../unsafe')] })
  assert.notEqual(unsafe.status, 0)
  assert.match(unsafe.stderr, /unique safe native identifiers/)

  const invalidWindow = run({ window: 0, issues: [] })
  assert.notEqual(invalidWindow.status, 0)
  assert.match(invalidWindow.stderr, /window must be a positive integer/)
})

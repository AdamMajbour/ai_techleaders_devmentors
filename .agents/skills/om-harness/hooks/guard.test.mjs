import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const SCRIPT = fileURLToPath(new URL('./guard.mjs', import.meta.url))

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'om-harness-guard-test-'))
  execFileSync('git', ['init', '--quiet'], { cwd: root })
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

function run(root, mode, toolInput) {
  return spawnSync(process.execPath, [SCRIPT, mode], {
    cwd: root,
    input: JSON.stringify({ cwd: root, tool_input: toolInput }),
    encoding: 'utf8',
  })
}

test('staged-only guard blocks remote publication and permits local inspection', async t => {
  const root = await fixture(t)
  const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: root, encoding: 'utf8' }).trim()
  const guardDir = join(gitDir, 'om-harness')
  await mkdir(guardDir, { recursive: true })
  await writeFile(join(guardDir, 'stage-only.json'), JSON.stringify({
    version: 1,
    runId: 'test-run',
    startState: join(root, 'start-state.json'),
  }))

  const publication = run(root, 'block', { command: 'git push origin HEAD' })
  assert.equal(publication.status, 2)
  assert.match(publication.stderr, /Remote publication is disabled/)

  const inspection = run(root, 'block', { command: 'git status --short' })
  assert.equal(inspection.status, 0, inspection.stderr)
})

test('freeze guard blocks test edits and allows product-code edits', async t => {
  const root = await fixture(t)
  await writeFile(join(root, '.om-freeze-tests'), '[]')

  const testEdit = run(root, 'freeze', { file_path: 'packages/core/src/example.test.ts' })
  assert.equal(testEdit.status, 2)
  assert.match(testEdit.stderr, /Test files are frozen/)

  const productEdit = run(root, 'freeze', { file_path: 'packages/core/src/example.ts' })
  assert.equal(productEdit.status, 0, productEdit.stderr)
})

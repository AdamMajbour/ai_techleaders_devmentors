import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

describe('prepare-release helper', () => {
  let directory: string;
  let runnerTemp: string;
  let outputPath: string;
  const helperPath = resolve(__dirname, 'prepare-release.mjs');
  const writeJson = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  const readJson = (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

  const runHelper = (versionType: string, customVersion = '') => execFileSync('node', [helperPath], {
    cwd: directory,
    env: { ...process.env, VERSION_TYPE: versionType, CUSTOM_VERSION: customVersion, RUNNER_TEMP: runnerTemp, GITHUB_OUTPUT: outputPath },
    stdio: 'pipe',
  });

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'devmentor-release-'));
    runnerTemp = join(directory, 'runner-temp');
    outputPath = join(directory, 'github-output');
    const remote = join(directory, 'origin.git');
    mkdirSync(runnerTemp);
    mkdirSync(join(directory, 'packages', 'core'), { recursive: true });
    writeJson(join(directory, 'package.json'), { name: 'devmentor', version: '1.2.3' });
    writeJson(join(directory, 'packages', 'core', 'package.json'), { name: '@devmentor/core', version: '1.2.3' });
    writeJson(join(directory, 'package-lock.json'), { name: 'devmentor', version: '1.2.3', packages: {
      '': { name: 'devmentor', version: '1.2.3' }, 'packages/core': { name: '@devmentor/core', version: '1.2.3' },
    } });
    writeFileSync(join(directory, 'CHANGELOG.md'), '## [1.2.4] - 2026-11-15\n\n### Added\n\n- Release fixture.\n\n## [1.2.3] - 2026-11-14\n');
    execFileSync('git', ['init', '-q', directory]);
    execFileSync('git', ['init', '--bare', '-q', remote]);
    execFileSync('git', ['-C', directory, 'remote', 'add', 'origin', remote]);
    execFileSync('git', ['-C', directory, 'config', 'user.name', 'Release test']);
    execFileSync('git', ['-C', directory, 'config', 'user.email', 'release-test@example.invalid']);
    writeFileSync(join(directory, 'fixture.txt'), 'fixture');
    execFileSync('git', ['-C', directory, 'add', '.']);
    execFileSync('git', ['-C', directory, 'commit', '-m', 'fixture']);
    execFileSync('git', ['-C', directory, 'tag', 'v1.2.3']);
    writeFileSync(join(directory, 'release-change.txt'), 'release change');
    execFileSync('git', ['-C', directory, 'add', 'release-change.txt']);
    execFileSync('git', ['-C', directory, 'commit', '-m', 'Add release changes']);
  });

  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it.each([['patch', '', '1.2.4'], ['minor', '', '1.3.0'], ['major', '', '2.0.0'], ['custom', '3.4.5', '3.4.5']])(
    'prepares %s versions and updates manifests and lockfile', (type, custom, expected) => {
      writeFileSync(join(directory, 'CHANGELOG.md'), readFileSync(join(directory, 'CHANGELOG.md'), 'utf8').replace('1.2.4', expected));
      runHelper(type, custom);
      expect(readJson(join(directory, 'package.json')).version).toBe(expected);
      expect(readJson(join(directory, 'packages', 'core', 'package.json')).version).toBe(expected);
      expect(readJson(join(directory, 'package-lock.json')).version).toBe(expected);
      expect(readFileSync(join(runnerTemp, 'release-notes.md'), 'utf8')).toContain('- Release fixture.');
      expect(readFileSync(outputPath, 'utf8')).toContain(`tag=v${expected}`);
    },
  );

  it.each(['1.2', '01.2.3', '1.2.3-beta', '1.2.3'])('rejects invalid or non-increasing custom version %s', (version) => {
    expect(() => runHelper('custom', version)).toThrow();
    expect(readJson(join(directory, 'package.json')).version).toBe('1.2.3');
  });

  it('rejects a missing changelog entry before changing manifests', () => {
    writeFileSync(join(directory, 'CHANGELOG.md'), '## [1.2.3] - 2026-11-14\n');
    runHelper('patch');
    expect(readJson(join(directory, 'package.json')).version).toBe('1.2.4');
    expect(readFileSync(join(runnerTemp, 'release-notes.md'), 'utf8')).toContain('Add release changes');
  });
});

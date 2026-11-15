import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseVersion(value) {
  const match = versionPattern.exec(value);
  if (!match) throw new Error(`Expected stable MAJOR.MINOR.PATCH version, received: ${value}`);
  return match.slice(1).map(BigInt);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

function increment(current, type, custom) {
  const [major, minor, patch] = parseVersion(current);
  const next = type === 'patch' ? `${major}.${minor}.${patch + 1n}`
    : type === 'minor' ? `${major}.${minor + 1n}.0`
      : type === 'major' ? `${major + 1n}.0.0`
        : type === 'custom' ? (custom ?? '').trim() : '';
  parseVersion(next);
  if (compareVersions(next, current) <= 0) throw new Error(`Version ${next} must be greater than ${current}.`);
  return next;
}

function latestReleaseVersion(fallback) {
  const tags = execFileSync('git', ['tag', '--list', 'v*', '--sort=-version:refname'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .find((tag) => tag.startsWith('v') && versionPattern.test(tag.slice(1)));
  return tags ? tags.slice(1) : fallback;
}

function releaseNotes(changelog, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`^## \\[${escaped}\\] - \\d{4}-\\d{2}-\\d{2}\\s*$`, 'm');
  const found = header.exec(changelog);
  if (!found) throw new Error(`Add a dated ${version} entry to CHANGELOG.md first.`);
  const remainder = changelog.slice(found.index + found[0].length);
  const next = /^## \[/m.exec(remainder);
  const notes = remainder.slice(0, next?.index ?? remainder.length).trim();
  if (!notes) throw new Error(`The ${version} changelog entry is empty.`);
  return `${notes}\n`;
}

function main() {
  const root = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = increment(latestReleaseVersion(root.version), process.env.VERSION_TYPE, process.env.CUSTOM_VERSION);
  const tag = `v${version}`;
  const localTag = execFileSync('git', ['tag', '--list', tag], { encoding: 'utf8' }).trim();
  const remoteTag = execFileSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`], { encoding: 'utf8' }).trim();
  if (localTag || remoteTag) throw new Error(`Tag ${tag} already exists.`);
  const notes = releaseNotes(readFileSync('CHANGELOG.md', 'utf8'), version);

  const files = ['package.json', ...readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join('packages', entry.name, 'package.json'))
    .filter(existsSync)
    .sort()];
  const manifests = files.map((file) => {
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    if (manifest.version !== root.version) throw new Error(`${file} version does not match root package.json.`);
    manifest.version = version;
    return { file, manifest };
  });

  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  if (lock.version !== root.version || lock.packages?.['']?.version !== root.version) {
    throw new Error('package-lock.json root version does not match package.json.');
  }
  for (const file of files.slice(1)) {
    const key = file.replaceAll('\\', '/').replace(/\/package\.json$/, '');
    if (lock.packages?.[key]?.version !== root.version) throw new Error(`Missing or mismatched lockfile entry: ${key}`);
    lock.packages[key].version = version;
  }
  lock.version = version;
  lock.packages[''].version = version;
  for (const { file, manifest } of manifests) writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

  const runnerTemp = process.env.RUNNER_TEMP;
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (!runnerTemp || !githubOutput) throw new Error('GitHub runner output paths are unavailable.');
  writeFileSync(join(runnerTemp, 'release-notes.md'), notes);
  writeFileSync(githubOutput, `version=${version}\ntag=${tag}\n`, { flag: 'a' });
}

main();

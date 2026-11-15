import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
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

function releaseTags() {
  const tags = execFileSync('git', ['tag', '--list', 'v*', '--sort=-version:refname'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith('v') && versionPattern.test(tag.slice(1)));
  return tags;
}

function releaseNotes(changelog, version, baseVersion, targetRef) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`^## \\[${escaped}\\] - \\d{4}-\\d{2}-\\d{2}\\s*$`, 'm');
  const found = header.exec(changelog);
  if (!found) {
    const baseTag = `v${baseVersion}`;
    const commits = execFileSync('git', ['log', '--pretty=format:- %s', `${baseTag}..${targetRef}`], { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter((line) => !line.includes('chore(release): prepare '))
      .join('\n')
      .trim();
    if (!commits) throw new Error(`No changelog entry for ${version}, and no commits found since ${baseTag}.`);
    return `## Changes\n\n${commits}\n`;
  }
  const remainder = changelog.slice(found.index + found[0].length);
  const next = /^## \[/m.exec(remainder);
  const notes = remainder.slice(0, next?.index ?? remainder.length).trim();
  if (!notes) throw new Error(`The ${version} changelog entry is empty.`);
  return `${notes}\n`;
}

function main() {
  const root = JSON.parse(readFileSync('package.json', 'utf8'));
  const tags = releaseTags();
  const pendingTag = process.env.PENDING_TAG ?? '';
  const baseTag = tags.find((tag) => tag !== pendingTag);
  const baseVersion = baseTag ? baseTag.slice(1) : root.version;
  const version = pendingTag ? pendingTag.slice(1)
    : increment(baseVersion, process.env.VERSION_TYPE, process.env.CUSTOM_VERSION);
  const tag = `v${version}`;
  const localTag = execFileSync('git', ['tag', '--list', tag], { encoding: 'utf8' }).trim();
  const remoteTag = execFileSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`], { encoding: 'utf8' }).trim();
  if (pendingTag && !localTag && !remoteTag) throw new Error(`Pending tag ${tag} was not found.`);
  if (localTag || remoteTag) {
    if (localTag && remoteTag) {
      const localRef = execFileSync('git', ['rev-parse', `refs/tags/${tag}^{}`], { encoding: 'utf8' }).trim();
      const remoteRef = execFileSync('git', ['ls-remote', 'origin', `refs/tags/${tag}^{}`], { encoding: 'utf8' }).trim().split(/\s+/)[0];
      if (localRef !== remoteRef) throw new Error(`Local and remote ${tag} point to different commits.`);
    }
    if (!localTag) execFileSync('git', ['fetch', '--no-tags', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
  }
  const notes = releaseNotes(readFileSync('CHANGELOG.md', 'utf8'), version, baseVersion, localTag || remoteTag ? tag : 'HEAD');

  const runnerTemp = process.env.RUNNER_TEMP;
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (!runnerTemp || !githubOutput) throw new Error('GitHub runner output paths are unavailable.');
  writeFileSync(join(runnerTemp, 'release-notes.md'), notes);
  writeFileSync(githubOutput, `version=${version}\ntag=${tag}\ntag_exists=${localTag || remoteTag ? 'true' : 'false'}\n`, { flag: 'a' });
}

main();

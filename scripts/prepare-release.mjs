import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseVersion(version) {
  const match = semverPattern.exec(version);
  if (!match) throw new Error(`Version must be stable SemVer in MAJOR.MINOR.PATCH form: ${version}`);
  return match.slice(1).map(BigInt);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

function nextVersion(current, versionType, customVersion) {
  const [major, minor, patch] = parseVersion(current);
  let next;
  switch (versionType) {
    case 'patch': next = `${major}.${minor}.${patch + 1n}`; break;
    case 'minor': next = `${major}.${minor + 1n}.0`; break;
    case 'major': next = `${major + 1n}.0.0`; break;
    case 'custom': next = customVersion?.trim() ?? ''; break;
    default: throw new Error(`Unsupported version type: ${versionType}`);
  }
  parseVersion(next);
  if (compareVersions(next, current) <= 0) {
    throw new Error(`Version ${next} must be greater than current version ${current}.`);
  }
  return next;
}

function getCurrentReleaseVersion(fallbackVersion) {
  const tags = execFileSync('git', ['tag', '--list', 'v*', '--sort=-version:refname'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .find((tag) => tag.startsWith('v') && semverPattern.test(tag.slice(1)));
  return tags ? tags.slice(1) : fallbackVersion;
}

function hasTag(ref) {
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', ref], { stdio: 'ignore' });
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw error;
  }
}

function getWorkspacePackageFiles() {
  return readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join('packages', entry.name, 'package.json'))
    .filter(existsSync)
    .sort();
}

function getReleaseNotes(changelog, version) {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}\\s*$`, 'm');
  const match = header.exec(changelog);
  if (!match) throw new Error(`Add a dated ${version} entry to CHANGELOG.md before starting the release.`);
  const afterHeader = changelog.slice(match.index + match[0].length);
  const nextHeader = /^## \[/m.exec(afterHeader);
  const notes = afterHeader.slice(0, nextHeader?.index ?? afterHeader.length).trim();
  if (!notes) throw new Error(`The ${version} changelog entry is empty.`);
  return `${notes}\n`;
}

function prepareRelease({ versionType, customVersion, runnerTemp, githubOutput }) {
  if (!runnerTemp || !githubOutput) throw new Error('GitHub runner output paths are unavailable.');
  const root = JSON.parse(readFileSync('package.json', 'utf8'));
  const packageVersion = root.version;
  const currentRelease = getCurrentReleaseVersion(packageVersion);
  const next = nextVersion(currentRelease, versionType, customVersion);
  const tag = `v${next}`;

  if (hasTag(`refs/tags/${tag}`)) throw new Error(`Local tag ${tag} already exists.`);
  const remoteTags = execFileSync(
    'git',
    ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
    { encoding: 'utf8' },
  ).trim();
  if (remoteTags) throw new Error(`Remote tag ${tag} already exists.`);

  const notes = getReleaseNotes(readFileSync('CHANGELOG.md', 'utf8'), next);
  const workspaceFiles = getWorkspacePackageFiles();
  const manifestFiles = ['package.json', ...workspaceFiles];
  const manifests = manifestFiles.map((file) => {
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    if (pkg.version !== packageVersion) throw new Error(`${file} is at ${pkg.version}; expected ${packageVersion}.`);
    return { file, pkg: { ...pkg, version: next } };
  });

  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  if (lock.version !== packageVersion || lock.packages?.['']?.version !== packageVersion) {
    throw new Error(`package-lock.json root version must match ${packageVersion}.`);
  }
  for (const file of workspaceFiles) {
    const relative = file.replaceAll('\\', '/').replace(/\/package\.json$/, '');
    const locked = lock.packages?.[relative];
    if (!locked || locked.version !== packageVersion) {
      throw new Error(`${file} is missing from package-lock.json or has a mismatched version.`);
    }
    locked.version = next;
  }
  lock.version = next;
  lock.packages[''].version = next;

  for (const { file, pkg } of manifests) {
    writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
  writeFileSync(join(runnerTemp, 'release-notes.md'), notes);
  writeFileSync(githubOutput, `version=${next}\ntag=${tag}\n`, { flag: 'a' });
}

prepareRelease({
  versionType: process.env.VERSION_TYPE,
  customVersion: process.env.CUSTOM_VERSION,
  runnerTemp: process.env.RUNNER_TEMP,
  githubOutput: process.env.GITHUB_OUTPUT,
});
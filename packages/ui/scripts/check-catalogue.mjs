// Checks that the component catalogue (.storybook/blocks/catalogue.tsx) matches the package:
//  1. every component exported from src/components and src/backend is in the catalogue (by name or in `alsoExports`);
//  2. every `docs` id of the catalogue exists in the built Storybook (storybook-static/index.json).
// Run after `npm run build-storybook`. Exits 1 and prints what is wrong. Run: npm run check:catalogue
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = readFileSync(path.join(root, '.storybook/blocks/catalogue.tsx'), 'utf8');

const listed = new Set();
const docs = [];
for (const m of catalogue.matchAll(/^\s{4}name: '([^']+)'/gm)) listed.add(m[1]);
for (const m of catalogue.matchAll(/alsoExports: \[([^\]]*)\]/g)) for (const n of m[1].matchAll(/'([^']+)'/g)) listed.add(n[1]);
for (const m of catalogue.matchAll(/^\s{4}docs: '([^']+)'/gm)) docs.push(m[1]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(name) && !/\.(stories|test)\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

const exported = new Set();
for (const base of ['src/components', 'src/backend']) {
  for (const file of walk(path.join(root, base))) {
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(/export (?:async )?function ([A-Z]\w*)/g)) exported.add(m[1]);
    for (const m of source.matchAll(/export const ([A-Z]\w*)\s*[=:]/g)) exported.add(m[1]);
    for (const m of source.matchAll(/export \{([^}]+)\}/g)) for (const n of m[1].split(',')) if (/^\s*[A-Z]/.test(n)) exported.add(n.trim().split(/\s+as\s+/).pop());
  }
}

const problems = [];
for (const name of [...exported].sort()) if (!listed.has(name)) problems.push(`not in the catalogue: ${name}`);

const indexFile = path.join(root, 'storybook-static/index.json');
if (!existsSync(indexFile)) {
  problems.push('storybook-static/index.json is missing: run npm run build-storybook first');
} else {
  const ids = new Set(Object.keys(JSON.parse(readFileSync(indexFile, 'utf8')).entries));
  for (const id of docs) if (!ids.has(id)) problems.push(`docs id does not exist: ${id}`);
}

if (problems.length) {
  for (const p of problems) console.log(p);
  console.error(`\n${problems.length} problem(s) in the catalogue.`);
  process.exit(1);
}
console.log(`Catalogue is complete: ${exported.size} exports, ${docs.length} pages.`);

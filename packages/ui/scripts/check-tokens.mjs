// Finds values that bypass the tokens: colour literals outside src/styles/tokens.css, Tailwind
// palette classes (bg-zinc-900, text-white) and arbitrary Tailwind values (p-[13px], [font-family:x]).
// Prints file:line for every hit and exits 1, so it can run in CI. Run: npm run check:tokens
// Scans src and .storybook (ts, tsx, css, mdx). Fenced code blocks in mdx are documentation text and
// are skipped; test and story data files are scanned like any other file.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN = ['src', '.storybook'];
const EXT = new Set(['.ts', '.tsx', '.css', '.mdx']);
const SKIP_DIR = new Set(['node_modules', 'generated', 'storybook-static', 'public']);
const TOKEN_FILE = path.join('src', 'styles', 'tokens.css');

const PALETTES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILS = 'bg|text|border|ring|ring-offset|fill|stroke|from|via|to|divide|outline|decoration|accent|caret|shadow|placeholder';
const rules = [
  { name: 'colour literal', re: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g },
  { name: 'colour function', re: /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(/g },
  { name: 'Tailwind palette class', re: new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(?:${UTILS})-(?:${PALETTES})-\\d{2,3}(?:/\\d+)?\\b`, 'g') },
  { name: 'Tailwind white/black class', re: new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(?:${UTILS})-(?:white|black)(?:/\\d+)?(?![\\w-])`, 'g') },
  // [..] arbitrary values and [prop:value] arbitrary properties. Structural variants (data-, aria-, [&...]) are allowed.
  { name: 'arbitrary Tailwind value', re: /(?<![\w-])(?:[\w-]+:)*(?!data-|aria-|group-data-|group-aria-|peer-data-|peer-aria-|has-|supports-|in-)[a-z][\w-]*-\[[^\]\s]+\]/g },
  { name: 'arbitrary Tailwind property', re: /(?<![\w-])(?:[\w-]+:)*\[[a-z-]+:[^\]]+\]/g },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

const hits = [];
for (const base of SCAN) {
  const dir = path.join(root, base);
  try { statSync(dir); } catch { continue; }
  for (const file of walk(dir)) {
    const rel = path.relative(root, file);
    if (rel === TOKEN_FILE) continue;
    let fenced = false;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (rel.endsWith('.mdx') && /^\s*```/.test(line)) { fenced = !fenced; return; }
      if (fenced) return;
      for (const rule of rules) {
        for (const m of line.matchAll(rule.re)) hits.push({ rel, line: i + 1, rule: rule.name, text: m[0] });
      }
    });
  }
}

const byRule = {};
for (const h of hits) {
  console.log(`${h.rel}:${h.line}  ${h.rule}  ${h.text}`);
  byRule[h.rule] = (byRule[h.rule] ?? 0) + 1;
}
if (hits.length) {
  console.error(`\n${hits.length} value(s) outside the tokens: ${Object.entries(byRule).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  process.exit(1);
}
console.log('No values outside the tokens.');

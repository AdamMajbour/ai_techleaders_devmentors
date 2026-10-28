// Measures the contrast of every colour pair the design system uses, in both themes, from the
// values actually saved in src/styles/tokens.css. Writes .storybook/generated/contrast.json
// (read by the Foundations > Color page) and exits 1 when a pair is below its threshold and has no
// documented exception. Run: npm run tokens:contrast
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Comments are stripped first: the header comment mentions the selectors.
const css = readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Thresholds: WCAG 1.4.3 text 4.5:1, WCAG 1.4.11 interface elements 3:1.
const TEXT = 4.5;
const UI = 3;

// [foreground token, background token, threshold, what it is used for, themes it applies to]
const PAIRS = [
  ['foreground', 'background', TEXT, 'Body text on the page'],
  ['foreground', 'card', TEXT, 'Text on a panel'],
  ['foreground', 'muted', TEXT, 'Text on code and file-name surface'],
  ['foreground', 'accent', TEXT, 'Text on a hover surface'],
  ['muted-foreground', 'background', TEXT, 'Secondary text on the page'],
  ['muted-foreground', 'card', TEXT, 'Secondary text on a panel'],
  ['muted-foreground', 'muted', TEXT, 'Secondary text on code surface'],
  ['primary-foreground', 'primary', TEXT, 'Text on the accent fill (primary button)'],
  ['link', 'background', TEXT, 'Link text on the page'],
  ['link', 'card', TEXT, 'Link text on a panel'],
  ['destructive-foreground', 'destructive', TEXT, 'Text on a destructive button'],
  ['destructive', 'background', TEXT, 'Destructive text on the page'],
  ['destructive', 'card', TEXT, 'Destructive text on a panel'],
  ['input', 'background', UI, 'Control outline on the page'],
  ['input', 'card', UI, 'Control outline on a panel'],
  ['input', 'muted', UI, 'Control outline on code surface'],
  ['ring', 'background', UI, 'Focus ring on the page'],
  ['ring', 'card', UI, 'Focus ring on a panel'],
  ['status-success', 'background', TEXT, 'Healthy or running state on the page (dot or text)'],
  ['status-success', 'card', TEXT, 'Healthy or running state on a panel'],
];
// Decorative: measured and shown, never enforced (WCAG 1.4.11 does not cover separators).
const DECORATIVE = [['border', 'background', 'Hairline between rows (R01.1)'], ['border', 'card', 'Hairline on a panel']];
// A failing pair is allowed only with a written reason. Empty on purpose.
const EXCEPTIONS = {};

function block(source, selectorStart) {
  const start = source.indexOf(selectorStart);
  if (start < 0) throw new Error(`tokens.css: block ${selectorStart} not found`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error('unbalanced braces');
}
function declarations(body) {
  const out = {};
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const dark = declarations(block(css, ':root,\n[data-theme=\'dark\']'));
const light = { ...dark, ...declarations(block(css, "\n[data-theme='light'] {")) };

function resolve(vars, name, seen = new Set()) {
  let value = vars[`--${name}`];
  if (value === undefined) throw new Error(`token --${name} is not defined`);
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  if (ref) {
    if (seen.has(ref[1])) throw new Error(`circular token ${ref[1]}`);
    seen.add(ref[1]);
    return resolve(vars, ref[1].slice(2), seen);
  }
  return value;
}
function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return { rgb: [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)), a: 1 };
  const rgba = value.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/);
  if (rgba) return { rgb: [+rgba[1], +rgba[2], +rgba[3]], a: +rgba[4] };
  throw new Error(`unsupported colour ${value}`);
}
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};
function measure(vars, fg, bg) {
  const back = parseColor(resolve(vars, bg));
  const front = parseColor(resolve(vars, fg));
  const blended = front.rgb.map((v, i) => Math.round(front.a * v + (1 - front.a) * back.rgb[i]));
  return { ratio: Math.round(ratio(blended, back.rgb) * 100) / 100, fg: resolve(vars, fg), bg: resolve(vars, bg) };
}

const rows = [];
let failures = 0;
for (const [fg, bg, min, use] of PAIRS) {
  const d = measure(dark, fg, bg);
  const l = measure(light, fg, bg);
  const row = { fg, bg, min, use, enforced: true, dark: d.ratio, light: l.ratio, darkValues: [d.fg, d.bg], lightValues: [l.fg, l.bg] };
  row.pass = { dark: d.ratio >= min, light: l.ratio >= min };
  for (const theme of ['dark', 'light']) {
    if (!row.pass[theme] && !EXCEPTIONS[`${fg}/${bg}/${theme}`]) failures++;
  }
  rows.push(row);
}
for (const [fg, bg, use] of DECORATIVE) {
  const d = measure(dark, fg, bg);
  const l = measure(light, fg, bg);
  rows.push({ fg, bg, min: null, use, enforced: false, dark: d.ratio, light: l.ratio, pass: { dark: true, light: true } });
}

const COLOR_TOKENS = ['background', 'foreground', 'headline', 'soft', 'card', 'card-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'destructive-foreground', 'border', 'input', 'ring', 'link', 'status-success'];
const themeTokens = COLOR_TOKENS.map((name) => ({ name, dark: resolve(dark, name), light: resolve(light, name), darkRef: dark[`--${name}`], lightRef: light[`--${name}`] }));

mkdirSync(path.join(root, '.storybook/generated'), { recursive: true });
writeFileSync(path.join(root, '.storybook/generated/contrast.json'), JSON.stringify({ text: TEXT, ui: UI, rows, themeTokens }, null, 2));

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('pair', 42)} ${pad('min', 5)} ${pad('dark', 7)} light`);
for (const r of rows) {
  const flag = (t) => (r.enforced && !r.pass[t] ? ' FAIL' : '');
  console.log(`${pad(`${r.fg} on ${r.bg}`, 42)} ${pad(r.min ?? '-', 5)} ${pad(r.dark + flag('dark'), 11)} ${r.light}${flag('light')}`);
}
if (failures) {
  console.error(`\n${failures} pair(s) below the threshold. Fix the token or document an exception in EXCEPTIONS.`);
  process.exit(1);
}
console.log('\nAll enforced pairs pass in both themes.');

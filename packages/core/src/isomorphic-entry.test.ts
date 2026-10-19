/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN = [/^bcryptjs$/, /^jose$/, /^awilix$/, /^@devmentor\/db/, /^@mikro-orm\//, /^node:/, /^next/, /^react/];

function importsOf(file: string): string[] {
  // Type-only imports and re-exports are erased at compile time, so they cannot reach a bundle.
  const source = fs.readFileSync(file, 'utf8').replace(/(?:import|export)\s+type\s+[^;]*?from\s+['"][^'"]+['"];?/gs, '');
  return [...source.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function resolveRelative(from: string, specifier: string): string {
  const base = path.resolve(path.dirname(from), specifier);
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Cannot resolve ${specifier} from ${from}`);
}

/** Every external module the isomorphic entry can reach, following relative imports. */
function reachableExternals(entry: string): Set<string> {
  const externals = new Set<string>();
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of importsOf(file)) {
      if (specifier.startsWith('.')) queue.push(resolveRelative(file, specifier));
      else externals.add(specifier);
    }
  }
  return externals;
}

describe('@devmentor/core isomorphic entry', () => {
  it('reaches no server-only module, so client bundles stay free of bcrypt, jose, the DI container and the database', () => {
    const externals = [...reachableExternals(path.resolve(__dirname, 'index.ts'))];

    expect(externals.filter((name) => FORBIDDEN.some((pattern) => pattern.test(name)))).toEqual([]);
    expect(externals).toContain('zod');
  });
});

#!/usr/bin/env node
/**
 * Bundle-size guard for @flowdrop/flowdrop.
 *
 * Walks the *static* import graph of each published entry (from `dist/`, which
 * is what consumers actually resolve via the package `exports` map) and asserts
 * that heavy dependencies are never statically reachable from the "light"
 * entries. This is a stronger guarantee than "tree-shakeable": a heavy dep that
 * is never statically referenced cannot leak into a consumer's bundle even if
 * their bundler shakes poorly.
 *
 * Dynamic `import()` is intentionally ignored — that is how `form/code` and
 * `form/markdown` lazy-load CodeMirror, and that code-splitting is the whole
 * point. Only static `import ... from` / `export ... from` / `import 'x'` edges
 * count.
 *
 * Run after `pnpm build` (needs `dist/`):
 *   node scripts/check-bundle.mjs
 *
 * Exit code 1 on any contract violation, so it doubles as a CI gate.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const distDir = join(pkgRoot, 'dist');

/**
 * Per-entry contracts. `entry` is the dist file a consumer reaches via the
 * package `exports` map; `forbid` lists package specifiers that must NOT appear
 * anywhere in that entry's static import graph.
 *
 * Heavy deps we care about: CodeMirror (the big one, ~300KB), @xyflow/svelte,
 * marked, dompurify, diff.
 */
const HEAVY = {
  codemirror: ['codemirror', '@codemirror/'],
  xyflow: ['@xyflow/svelte'],
  marked: ['marked'],
  dompurify: ['dompurify'],
  diff: ['diff']
};

const CONTRACTS = [
  {
    name: 'core',
    entry: 'core/index.js',
    // "zero heavy dependencies" — types + utils only.
    forbid: [
      ...HEAVY.codemirror,
      ...HEAVY.xyflow,
      ...HEAVY.marked,
      ...HEAVY.dompurify,
      ...HEAVY.diff
    ]
  },
  {
    name: 'form (light)',
    entry: 'form/index.js',
    // Light form fields only; CodeMirror editors are opt-in via form/code|markdown.
    forbid: [...HEAVY.codemirror]
  },
  {
    name: 'editor',
    entry: 'editor/index.js',
    // @xyflow/svelte is expected here; CodeMirror must stay opt-in.
    forbid: [...HEAVY.codemirror]
  }
];

/** Is this specifier a bare package import (vs. a relative path)? */
function isBare(spec) {
  return !spec.startsWith('.') && !spec.startsWith('/');
}

/** Extract static import/export-from specifiers from a JS or Svelte source. */
function staticSpecifiers(code) {
  const specs = [];
  // `import ... from 'x'`, `export ... from 'x'`, `export * from 'x'`.
  // The `(?!\s+type\b)` skips type-only `import type`/`export type` statements:
  // they are erased at compile time and create no runtime edge (relevant for
  // the un-compiled `.svelte` files svelte-package ships verbatim).
  const fromRe = /(?:^|[\s;])(?:import|export)\b(?!\s+type\b)[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g;
  // bare side-effect import: `import 'x'`
  const bareImportRe = /(?:^|[\s;])import\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = fromRe.exec(code))) specs.push(m[1]);
  while ((m = bareImportRe.exec(code))) specs.push(m[1]);
  // NOTE: dynamic `import('x')` is deliberately NOT matched.
  return specs;
}

/** For a `.svelte` file, only the <script> blocks carry imports. */
function svelteScript(code) {
  const blocks = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(code))) blocks.push(m[1]);
  return blocks.join('\n');
}

/** Resolve a relative specifier from `fromFile` to an on-disk file path. */
function resolveRelative(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.svelte`,
    `${base}.svelte.js`,
    join(base, 'index.js')
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/**
 * Walk the static graph from `entryFile`. Returns a Map of forbidden bare
 * specifier -> array of import chains (file paths) that reached it.
 */
function findHeavy(entryFile, forbid) {
  const visited = new Set();
  const hits = new Map();

  function visit(file, chain) {
    if (visited.has(file)) return;
    visited.add(file);

    let code;
    try {
      code = readFileSync(file, 'utf8');
    } catch {
      return;
    }
    const source = file.endsWith('.svelte') ? svelteScript(code) : code;

    for (const spec of staticSpecifiers(source)) {
      if (isBare(spec)) {
        const match = forbid.find((f) => (f.endsWith('/') ? spec.startsWith(f) : spec === f));
        if (match) {
          const key = spec;
          if (!hits.has(key)) hits.set(key, []);
          hits.get(key).push([...chain, file, `<pkg> ${spec}`]);
        }
        // never recurse into node_modules
        continue;
      }
      const target = resolveRelative(file, spec);
      if (target) visit(target, [...chain, file]);
    }
  }

  visit(entryFile, []);
  return hits;
}

/** Pretty-print a file path relative to dist/. */
function rel(p) {
  return p.startsWith(distDir) ? `dist${p.slice(distDir.length)}` : p;
}

function main() {
  if (!existsSync(distDir)) {
    console.error('✗ dist/ not found — run `pnpm build` before the bundle check.');
    process.exit(1);
  }

  let failed = false;
  for (const contract of CONTRACTS) {
    const entryFile = join(distDir, contract.entry);
    if (!existsSync(entryFile)) {
      console.error(`✗ ${contract.name}: entry not found (${rel(entryFile)})`);
      failed = true;
      continue;
    }
    const hits = findHeavy(entryFile, contract.forbid);
    if (hits.size === 0) {
      console.log(`✓ ${contract.name} (${contract.entry}) — no static heavy-dep imports`);
      continue;
    }
    failed = true;
    console.error(`✗ ${contract.name} (${contract.entry}) statically imports forbidden deps:`);
    for (const [spec, chains] of hits) {
      const chain = chains[0];
      console.error(`    • ${spec}`);
      // Show the shortest reaching chain (entry → ... → importer → pkg).
      console.error(`      via ${chain.map(rel).join('\n          → ')}`);
    }
  }

  if (failed) {
    console.error('\nBundle guard FAILED — a light entry can leak a heavy dependency.');
    process.exit(1);
  }
  console.log('\nBundle guard passed — heavy deps stay out of the light entries.');
}

main();

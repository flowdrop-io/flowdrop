#!/usr/bin/env node
/**
 * Import-extension guard for @flowdrop/flowdrop.
 *
 * The package is `"type": "module"`, so Node ESM and webpack resolve relative
 * specifiers literally: `./default` fails, `./default.js` works. svelte-package
 * rewrites `$lib/x` to a relative path but never adds an extension, so source
 * must write `$lib/x.js`. This scans `dist/**\/*.js` and `dist/**\/*.svelte`
 * for relative import/export specifiers with no file extension.
 *
 * Runs in `prepack`, after svelte-package:
 *   node scripts/check-extensions.mjs
 *
 * Exit code 1 when any extensionless relative specifier is found.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

if (!existsSync(distDir)) {
  console.error('check-extensions: dist/ not found — run svelte-package first.');
  process.exit(1);
}

// `from 'x'`, bare `import 'x'` and dynamic `import('x')`, relative only.
const specRe = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]*|\.{1,2})['"]/g;

const bad = [];
let checked = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|svelte)$/.test(entry.name)) scan(full);
  }
}

function scan(file) {
  checked++;
  const code = readFileSync(file, 'utf8');
  for (const [, spec] of code.matchAll(specRe)) {
    if (!extname(spec) || spec.endsWith('/') || spec.endsWith('.')) {
      bad.push(`${relative(distDir, file)}: '${spec}'`);
    }
  }
}

walk(distDir);

if (bad.length) {
  console.error(`✗ ${bad.length} extensionless relative import(s) in dist/ (breaks Node ESM):`);
  for (const b of bad) console.error(`    • ${b}`);
  console.error('\nAdd `.js` to the source specifier (incl. `$lib/...` imports).');
  process.exit(1);
}
console.log(`✓ check-extensions: ${checked} files, all relative imports carry an extension`);

#!/usr/bin/env node
/**
 * Declaration guard for @flowdrop/flowdrop.
 *
 * Asserts that every component in `dist/` has its `.svelte.d.ts`. When
 * svelte-package cannot name a type a component's props use, it prints
 * "d.ts type declaration files ... were likely not generated" and still exits
 * 0, and consumers get an untyped component. That nearly shipped in 2.9.0 for
 * `FormField` / `FormFieldFull`. Stories are not published API and are skipped.
 *
 * Runs in `prepack`, after svelte-package:
 *   node scripts/check-dts.mjs
 *
 * Exit code 1 when any declaration is missing.
 */

import { readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

if (!existsSync(distDir)) {
  console.error('check-dts: dist/ not found — run svelte-package first.');
  process.exit(1);
}

const missing = [];
let checked = 0;

(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
    } else if (entry.name.endsWith('.svelte') && !entry.name.endsWith('.stories.svelte')) {
      checked++;
      if (!existsSync(`${path}.d.ts`)) missing.push(relative(distDir, path));
    }
  }
})(distDir);

if (missing.length > 0) {
  console.error(`check-dts: ${missing.length} component(s) published without types:`);
  for (const file of missing) console.error(`  ✗ ${file}`);
  console.error('See the svelte-package output for the type it could not name.');
  process.exit(1);
}

console.log(`✓ check-dts: all ${checked} components have declarations`);

/**
 * Copy the bundled OpenAPI spec into the package output so it ships with the
 * npm package and is reachable via the `@flowdrop/flowdrop/openapi` export.
 *
 * Runs in `prepack` AFTER `svelte-package` (which wipes/regenerates `dist`),
 * so the destination must be (re)created here on every build.
 *
 * Usage:
 *   node scripts/copy-openapi.mjs
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SRC = resolve(ROOT, 'api/v1/bundled.yaml');
const DEST_DIR = resolve(ROOT, 'dist/openapi/v1');
const DEST = resolve(DEST_DIR, 'openapi.yaml');

const rel = (p) => relative(ROOT, p);

function fail(message, recovery) {
  console.error(`\n[copy-openapi] ERROR: ${message}`);
  console.error(`[copy-openapi] To recover: ${recovery}\n`);
  process.exit(1);
}

// 1. Source spec must exist and be non-empty.
if (!existsSync(SRC) || statSync(SRC).size === 0) {
  fail(
    `bundled OpenAPI spec not found (or empty) at ${rel(SRC)}`,
    'run `pnpm api:bundle` to regenerate it from api/v1/, then rebuild.'
  );
}

// 2. `dist` must exist — this script is meant to run after svelte-package.
if (!existsSync(resolve(ROOT, 'dist'))) {
  fail(
    'dist/ does not exist — copy-openapi must run after `svelte-package`',
    'run the full build with `pnpm build` (prepack runs svelte-package, then this copy).'
  );
}

// 3. Copy, then verify the destination matches the source byte-for-byte.
try {
  mkdirSync(DEST_DIR, { recursive: true });
  copyFileSync(SRC, DEST);
} catch (err) {
  fail(
    `failed to copy ${rel(SRC)} -> ${rel(DEST)}: ${err.message}`,
    'check filesystem permissions and free space, then rebuild with `pnpm build`.'
  );
}

const srcBuf = readFileSync(SRC);
if (!existsSync(DEST) || !readFileSync(DEST).equals(srcBuf)) {
  fail(
    `verification failed — ${rel(DEST)} is missing or differs from the source`,
    'rebuild with `pnpm build`; if it persists, delete dist/ and rebuild from clean.'
  );
}

console.log(`[copy-openapi] OK ${rel(SRC)} -> ${rel(DEST)} (${srcBuf.length} bytes)`);

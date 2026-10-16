#!/usr/bin/env node
// Design-system ratchet: counts style violations per file per rule and compares them with
// style-baseline.json. Counts may only go down, and the baseline must follow them down.
//
//   node scripts/style-ratchet.mjs            check (exit 1 on any increase or stale baseline)
//   node scripts/style-ratchet.mjs --update   rewrite the baseline
//
// Rules: colour, font-size, radius, shadow (stylelint, see stylelint.config.js) and
// button (raw <button> in components/ outside components/primitives/).
// See docs/style-guardrails.md.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import {
  addHit,
  classifyWarning,
  compare,
  normalize,
  RULES,
  totals
} from './style-ratchet-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(root, 'style-baseline.json');
const update = process.argv.includes('--update');

const rel = (p) => relative(root, p).split('\\').join('/');
const counts = {};

// 1. stylelint (colour, font-size, radius, shadow)
const result = await stylelint.lint({
  cwd: root,
  files: ['src/lib/**/*.{css,svelte}'],
  allowEmptyInput: true
});
for (const file of result.results) {
  for (const parseError of file.parseErrors ?? []) {
    console.error(`stylelint could not parse ${rel(file.source)}: ${parseError.text}`);
    process.exit(2);
  }
  for (const warning of file.warnings) {
    const rule = classifyWarning(warning);
    if (rule) addHit(counts, rel(file.source), rule);
  }
}

// 2. raw <button> elements outside the primitives
// (manual walk: fs.globSync needs Node 22, CI runs Node 20)
function walk(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const buttonFiles = walk('src/lib/components').filter(
  (f) => f.endsWith('.svelte') && !f.startsWith('src/lib/components/primitives/')
);
for (const file of buttonFiles) {
  const source = readFileSync(join(root, file), 'utf8')
    // ignore comments so a mention in prose does not count
    .replace(/<!--[\s\S]*?-->/g, '');
  const hits = source.match(/<button(?=[\s>/])/g)?.length ?? 0;
  for (let i = 0; i < hits; i++) addHit(counts, file, 'button');
}

const current = normalize(counts);
const sums = totals(current);
console.log('style ratchet totals:');
for (const rule of RULES) console.log(`  ${rule.padEnd(10)} ${sums[rule]}`);

if (update) {
  writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n');
  console.log(`baseline written: ${rel(baselinePath)}`);
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error('style-baseline.json is missing; run `pnpm run lint:styles:update`.');
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const { increases, decreases } = compare(baseline, current);
const line = (e) => `  ${e.file}  ${e.rule}  ${e.from} -> ${e.to}`;

if (increases.length > 0) {
  console.error('\nNew style violations (use tokens / primitives instead of literals):');
  increases.forEach((e) => console.error(line(e)));
}
if (decreases.length > 0) {
  console.error('\nFewer violations than the baseline:');
  decreases.forEach((e) => console.error(line(e)));
  console.error('\nThe baseline is stale, run `pnpm run lint:styles:update` and commit it.');
}
if (increases.length > 0 || decreases.length > 0) process.exit(1);
console.log('style ratchet: ok');

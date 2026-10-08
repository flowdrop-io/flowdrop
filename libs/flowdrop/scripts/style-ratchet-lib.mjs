// Pure helpers for scripts/style-ratchet.mjs (kept separate so they can be unit-tested).

export const RULES = ['button', 'colour', 'font-size', 'radius', 'shadow'];

const PROPERTY_RULES = [
  [/^font-size$/, 'font-size'],
  [/-radius$/, 'radius'],
  [/^box-shadow$/, 'shadow']
];

/** Map a stylelint warning to a ratchet rule, or null when it is not one we track. */
export function classifyWarning(warning) {
  switch (warning.rule) {
    case 'color-no-hex':
    case 'color-named':
    case 'function-disallowed-list':
      return 'colour';
    case 'declaration-property-value-allowed-list': {
      const property = /for property "([^"]+)"/.exec(warning.text)?.[1] ?? '';
      return PROPERTY_RULES.find(([re]) => re.test(property))?.[1] ?? null;
    }
    default:
      return null;
  }
}

/** Add one hit to a `{ file: { rule: count } }` map. */
export function addHit(counts, file, rule) {
  counts[file] ??= {};
  counts[file][rule] = (counts[file][rule] ?? 0) + 1;
}

/** Deterministic copy: files sorted, rules sorted, zero counts dropped, empty files dropped. */
export function normalize(counts) {
  const out = {};
  for (const file of Object.keys(counts).sort()) {
    const rules = {};
    for (const rule of Object.keys(counts[file]).sort()) {
      if (counts[file][rule] > 0) rules[rule] = counts[file][rule];
    }
    if (Object.keys(rules).length > 0) out[file] = rules;
  }
  return out;
}

/** Sum per rule across all files. */
export function totals(counts) {
  const sums = Object.fromEntries(RULES.map((rule) => [rule, 0]));
  for (const rules of Object.values(counts)) {
    for (const [rule, n] of Object.entries(rules)) sums[rule] = (sums[rule] ?? 0) + n;
  }
  return sums;
}

/**
 * Compare current counts with the baseline.
 * `increases`: new violations (fail). `decreases`: baseline is stale (fail, strict ratchet).
 * Each entry is `{ file, rule, from, to }`.
 */
export function compare(baseline, current) {
  const increases = [];
  const decreases = [];
  const files = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort();
  for (const file of files) {
    const rules = new Set([
      ...Object.keys(baseline[file] ?? {}),
      ...Object.keys(current[file] ?? {})
    ]);
    for (const rule of [...rules].sort()) {
      const from = baseline[file]?.[rule] ?? 0;
      const to = current[file]?.[rule] ?? 0;
      if (to > from) increases.push({ file, rule, from, to });
      else if (to < from) decreases.push({ file, rule, from, to });
    }
  }
  return { increases, decreases };
}

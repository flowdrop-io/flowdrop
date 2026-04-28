/**
 * One-shot deprecation warning helper for the messages migration.
 *
 * Components that previously accepted per-string label props (e.g.
 * `saveLabel`, `cancelLabel`, `placeholder`, `addLabel`) keep accepting them
 * during the v1.x deprecation window. When a consumer passes one explicitly
 * we emit a single console.warn per (component, prop) pair so the noise is
 * bounded even if the prop is rebound on every render.
 *
 * Production builds skip the warning entirely.
 *
 * Removed in v2.0 along with the props themselves.
 */

const warned = new Set<string>();

const isProd =
  typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';

export function warnDeprecatedProp(component: string, prop: string, replacement: string): void {
  if (isProd) return;
  const key = `${component}.${prop}`;
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[flowdrop] <${component}> prop \`${prop}\` is deprecated and will be removed in v2.0. ` +
      `Use \`messages\` on <FlowDrop> instead: ${replacement}`
  );
}

/**
 * Test-only: clear the warned-once cache so subsequent renders re-emit the
 * warning. Storybook stories and Vitest specs that share a module instance
 * need this to assert the warning fires per case.
 */
export function __resetDeprecationWarningsForTests(): void {
  warned.clear();
}

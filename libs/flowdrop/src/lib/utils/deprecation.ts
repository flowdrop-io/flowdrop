/**
 * One-time deprecation warnings.
 *
 * The standalone Playground (`Playground`, `PlaygroundStudio`, `PlaygroundApp`,
 * `PlaygroundModal` and the `mountPlayground*` entries) is deprecated in
 * favour of the editor's Test mode and goes in 3.0. It says so once per page,
 * not once per instance. The flag lives on `globalThis` so two copies of the
 * library on one page (an IIFE next to a bundler build) still warn once.
 *
 * @module utils/deprecation
 */

const STANDALONE_PLAYGROUND_FLAG = Symbol.for('flowdrop.standalonePlaygroundDeprecationWarned');

/** The message the standalone Playground warns with. */
export const STANDALONE_PLAYGROUND_DEPRECATION =
  '[FlowDrop] The standalone Playground (Playground, PlaygroundStudio, PlaygroundApp, ' +
  'PlaygroundModal and mountPlayground*) is deprecated and will be removed in 3.0. ' +
  "Use the editor's Test mode instead.";

/** Warn, once per page, that the standalone Playground is deprecated. */
export function warnStandalonePlaygroundDeprecated(): void {
  const scope = globalThis as unknown as Record<symbol, boolean>;
  if (scope[STANDALONE_PLAYGROUND_FLAG]) return;
  scope[STANDALONE_PLAYGROUND_FLAG] = true;
  // eslint-disable-next-line no-console -- the one-time deprecation notice is the point
  console.warn(STANDALONE_PLAYGROUND_DEPRECATION);
}

/** Forget that the warning was given. For tests. */
export function resetStandalonePlaygroundDeprecation(): void {
  delete (globalThis as unknown as Record<symbol, boolean>)[STANDALONE_PLAYGROUND_FLAG];
}

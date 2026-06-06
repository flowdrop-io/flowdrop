/**
 * Per-component access to the FlowDrop instance container.
 *
 * Components call `getInstance()` during init to resolve the instance
 * provided by the nearest `<App>` / `<WorkflowEditor>` via Svelte context.
 * When no provider exists (legacy single-instance usage), it falls back to
 * the browser-only default instance.
 *
 * @module stores/getInstance
 */

import { getContext, setContext } from 'svelte';
import {
  createFlowDropInstance,
  getDefaultInstance,
  type FlowDropInstance
} from './instanceContainer.svelte.js';

/**
 * Context key under which the FlowDrop instance is provided.
 * A Symbol (matching `messages/context.ts`) so consumer context can't collide.
 */
export const FLOWDROP_INSTANCE_KEY = Symbol('flowdrop.instance');

let warnedAboutFallback = false;

/**
 * Resolve the FlowDrop instance for the current component tree.
 *
 * Must be called during component initialisation (it reads Svelte context).
 *
 * Unlike the messages-context fallback (immutable defaults, silent), this
 * fallback hands out *mutable shared state*, so it warns once in dev and
 * throws during SSR rather than leaking state across server requests.
 */
export function getInstance(): FlowDropInstance {
  const instance = getContext<FlowDropInstance | undefined>(FLOWDROP_INSTANCE_KEY);
  if (instance) {
    return instance;
  }
  if (typeof window === 'undefined') {
    throw new Error(
      '[flowdrop] No FlowDrop instance in context during SSR. Render inside ' +
        '<App> or <WorkflowEditor> (which set context), or provide one with ' +
        'setContext(FLOWDROP_INSTANCE_KEY, createFlowDropInstance()).'
    );
  }
  if (import.meta.env?.DEV && !warnedAboutFallback) {
    warnedAboutFallback = true;
    // eslint-disable-next-line no-console -- intentional one-time dev diagnostic for silent shared-state fallback
    console.warn(
      '[flowdrop] getInstance() fell back to the page-default instance — ' +
        'fine for a single editor, but two editors mounted this way will share state.'
    );
  }
  return getDefaultInstance();
}

/**
 * Resolve and provide the FlowDrop instance for a provider component
 * (`<App>`, `<WorkflowEditor>`, `<Playground>`, `<PlaygroundStudio>`).
 *
 * Must be called during component initialisation. Resolution order:
 * 1. An explicitly passed instance (from a mount function or consumer)
 * 2. An instance already in context (provider nested inside another provider)
 * 3. Browser: the page-default instance (legacy single-instance behavior)
 *    Server: a fresh per-render instance (no cross-request leakage)
 *
 * The resolved instance is (re-)provided via context for all children.
 */
export function provideInstance(explicit?: FlowDropInstance): FlowDropInstance {
  const instance =
    explicit ??
    getContext<FlowDropInstance | undefined>(FLOWDROP_INSTANCE_KEY) ??
    (typeof window === 'undefined' ? createFlowDropInstance() : getDefaultInstance());
  setContext(FLOWDROP_INSTANCE_KEY, instance);
  return instance;
}

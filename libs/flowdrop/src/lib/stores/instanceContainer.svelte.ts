/**
 * FlowDrop Instance Container
 *
 * Holds all per-instance state for one FlowDrop editor: workflow state,
 * undo/redo history, playground sessions, interrupts, port coordinates,
 * categories, and pipeline panel state. Creating one container per mount is
 * what allows multiple FlowDrop editors to coexist on a single page.
 *
 * The container is provided to the component tree via Svelte context (see
 * `getInstance.svelte.ts`). A lazily-created, browser-only default instance
 * backs the legacy module-level store APIs so existing single-instance
 * consumers keep working unchanged.
 *
 * @module stores/instanceContainer
 */

import { HistoryService, historyService } from '../services/historyService.js';
import { WorkflowStore } from './workflowStore.svelte.js';
import { HistoryStore } from './historyStore.svelte.js';
import { PlaygroundStore } from './playgroundStore.svelte.js';
import { InterruptStore } from './interruptStore.svelte.js';
import { CategoriesStore } from './categoriesStore.svelte.js';
import { PortCoordinateStore } from './portCoordinateStore.svelte.js';
import { PipelinePanelStore } from './pipelinePanelStore.svelte.js';
import { ApiContext } from './apiContext.js';
import { PortCompatibilityChecker } from '../utils/connections.js';
import { DEFAULT_PORT_CONFIG } from '../config/defaultPortConfig.js';

/** Storage key prefix shared by the default instance and legacy consumers. */
export const DEFAULT_DRAFT_PREFIX = 'flowdrop:draft';

/**
 * All per-instance FlowDrop state.
 *
 * Store fields are added phase-by-phase as the module-level stores are
 * converted to classes (workflow, history bindings, playground, interrupts,
 * categories, port coordinates, pipeline panel).
 */
export interface FlowDropInstance {
  /** Unique id for this instance (used to scope storage keys). */
  readonly id: string;
  /** Prefix for draft localStorage keys — legacy bare prefix for the default instance. */
  readonly storagePrefix: string;
  /** Whether this is the page-default instance (legacy storage keys, module-API reachable). */
  readonly isDefault: boolean;
  /** Undo/redo engine for this instance. */
  readonly history: HistoryService;
  /** Workflow state with dirty tracking and history integration. */
  readonly workflow: WorkflowStore;
  /** Reactive rune bindings around `history` (undo/redo button state). */
  readonly historyBindings: HistoryStore;
  /** Playground sessions, messages, and execution state. */
  readonly playground: PlaygroundStore;
  /** Pending interrupt/confirmation dialogs. */
  readonly interrupts: InterruptStore;
  /** Endpoint configuration, auth provider, and API client for this instance. */
  readonly api: ApiContext;
  /** Node category definitions. */
  readonly categories: CategoriesStore;
  /**
   * Port-to-port data-type compatibility checker for this instance.
   * Seeded with `DEFAULT_PORT_CONFIG`; re-initialized by mount after the
   * backend's port config is fetched.
   */
  readonly portCompatibility: PortCompatibilityChecker;
  /** Canvas port coordinates. */
  readonly portCoordinates: PortCoordinateStore;
  /** Pipeline panel open/close state (instance-scoped persistence). */
  readonly pipelinePanel: PipelinePanelStore;
  /**
   * Dispose all per-instance resources (subscriptions, effect roots,
   * external callbacks). Safe to call more than once. Must not touch
   * sibling instances.
   */
  destroy(): void;
}

export interface CreateInstanceOptions {
  /** Explicit instance id; auto-generated (`fd-<n>`) when omitted. */
  id?: string;
  /**
   * Marks the page-default instance: it keeps the legacy (unscoped) storage
   * keys and reuses the exported `historyService` singleton so legacy
   * imports keep operating on the same history stack.
   */
  isDefault?: boolean;
}

// Feeds auto-generated ids only (`fd-1`, `fd-2`, …) — cosmetic monotonicity.
// Incrementing across SSR requests is harmless; no state hangs off the value.
let instanceCounter = 0;

/**
 * Create a fully wired FlowDrop instance.
 *
 * Creation order matters: history first, then stores that depend on it
 * (constructor injection — no module-singleton imports).
 */
export function createFlowDropInstance(options: CreateInstanceOptions = {}): FlowDropInstance {
  const isDefault = options.isDefault ?? false;
  const id = options.id ?? (isDefault ? 'default' : `fd-${++instanceCounter}`);
  // Every instance gets an id-scoped prefix — the default instance's 1.x bare
  // keys are migrated on first read (see migrateLegacyDraftKey / PipelinePanelStore.init).
  const storagePrefix = `${DEFAULT_DRAFT_PREFIX}:${id}`;

  // The default instance reuses the exported singleton (public API via
  // `@flowdrop/flowdrop/editor`) so external `historyService.undo()` etc.
  // keep operating on the default editor's history stack.
  const history = isDefault ? historyService : new HistoryService();

  const workflow = new WorkflowStore(history);
  const historyBindings = new HistoryStore(history);
  // Default wiring: undo/redo restores into this instance's workflow store.
  // WorkflowEditor overrides this with a richer callback while mounted.
  historyBindings.setOnRestoreCallback((restored) => workflow.restoreFromHistory(restored));

  const playground = new PlaygroundStore();

  const cleanups: Array<() => void> = [
    () => historyBindings.cleanup(),
    () => historyBindings.setOnRestoreCallback(null),
    () => workflow.setOnDirtyStateChange(null),
    () => workflow.setOnWorkflowChange(null),
    () => playground.dispose()
  ];

  return {
    id,
    storagePrefix,
    isDefault,
    history,
    workflow,
    historyBindings,
    playground,
    interrupts: new InterruptStore(),
    api: new ApiContext(),
    categories: new CategoriesStore(),
    portCoordinates: new PortCoordinateStore(),
    portCompatibility: new PortCompatibilityChecker(DEFAULT_PORT_CONFIG),
    // The default instance keeps the legacy bare localStorage key.
    pipelinePanel: new PipelinePanelStore(id),
    destroy() {
      while (cleanups.length > 0) {
        cleanups.pop()?.();
      }
    }
  };
}

// =========================================================================
// Default instance (backward compatibility)
// =========================================================================

let defaultInstance: FlowDropInstance | null = null;

/**
 * Get the page-default FlowDrop instance, creating it on first access.
 *
 * **Browser-only.** Reactive per-user state must never live at module scope
 * on the server — a module-level default would leak between SvelteKit
 * requests. Server renders must provide an instance via context instead
 * (`<App>` and `<WorkflowEditor>` do this automatically).
 */
export function getDefaultInstance(): FlowDropInstance {
  if (typeof window === 'undefined') {
    throw new Error(
      '[flowdrop] The default FlowDrop instance is browser-only to prevent ' +
        'cross-request state leakage during SSR. Render inside <App> or ' +
        '<WorkflowEditor> (which provide an instance via context), or pass ' +
        'an explicit instance.'
    );
  }
  return (defaultInstance ??= createFlowDropInstance({ isDefault: true }));
}

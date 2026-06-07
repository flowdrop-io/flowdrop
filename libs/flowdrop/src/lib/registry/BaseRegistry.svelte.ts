/**
 * Base Registry
 *
 * Generic base class for all FlowDrop registries. Provides the shared
 * mechanics: Map storage, subscribe/notify, onClear callbacks, and size tracking.
 *
 * Subclasses define their own `register()` method with domain-appropriate
 * signatures, using `this.items`, `this.touch()`, and `this.notifyListeners()`.
 *
 * Reactivity: a `.svelte.ts` module so it can hold a `$state` version counter
 * (`#version`). Every mutating path bumps it via `touch()`; every read method
 * components derive from reads it once at the top. This makes the plain `Map`
 * backing store observable to `$derived`/`$effect`, so registrations made
 * AFTER a component mounts (e.g. `fd.nodes.registerCustom(...)`) invalidate the
 * derived and trigger a re-render. Mirrors WorkflowStore's `#editVersion`
 * monotonic-counter precedent (workflowStore.svelte.ts).
 *
 * @example
 * ```typescript
 * class MyRegistry extends BaseRegistry<string, MyItem> {
 *   register(item: MyItem, overwrite = false): void {
 *     if (this.items.has(item.id) && !overwrite) {
 *       throw new Error(`Already registered: ${item.id}`);
 *     }
 *     this.items.set(item.id, item);
 *     this.touch();
 *     this.notifyListeners();
 *   }
 * }
 * ```
 */
export class BaseRegistry<K, V> {
  /** Internal storage map */
  protected items: Map<K, V> = new Map();

  /**
   * Reactive version counter. Bumped by `touch()` on every mutation; read by
   * every observable read method so Svelte tracks the plain Map as a dependency.
   */
  #version = $state(0);

  /** Change listeners */
  private listeners: Set<() => void> = new Set();

  /** Callbacks invoked when the registry is cleared (for resetting flags) */
  private clearCallbacks: Set<() => void> = new Set();

  /**
   * Bump the reactive version counter. Subclasses MUST call this after any
   * mutation of `this.items` so derived reads invalidate.
   */
  protected touch(): void {
    this.#version++;
  }

  /**
   * Read the reactive version counter. Subclasses that read `this.items`
   * directly (instead of via `get`/`getAll`/etc.) MUST call this so the access
   * is tracked as a reactive dependency.
   */
  protected trackVersion(): void {
    void this.#version; // reactive dependency
  }

  /**
   * Unregister an item by key.
   *
   * @param key - The key to remove
   * @returns true if the key was found and removed, false otherwise
   */
  unregister(key: K): boolean {
    const result = this.items.delete(key);
    if (result) {
      this.touch();
      this.notifyListeners();
    }
    return result;
  }

  /**
   * Get an item by key.
   *
   * @param key - The key to look up
   * @returns The item if found, undefined otherwise
   */
  get(key: K): V | undefined {
    this.trackVersion(); // reactive dependency
    return this.items.get(key);
  }

  /**
   * Check if a key is registered.
   *
   * @param key - The key to check
   * @returns true if the key is registered
   */
  has(key: K): boolean {
    this.trackVersion(); // reactive dependency
    return this.items.has(key);
  }

  /**
   * Get all registered keys.
   *
   * @returns Array of registered keys
   */
  getKeys(): K[] {
    this.trackVersion(); // reactive dependency
    return Array.from(this.items.keys());
  }

  /**
   * Get all registered values.
   *
   * @returns Array of all registered items
   */
  getAll(): V[] {
    this.trackVersion(); // reactive dependency
    return Array.from(this.items.values());
  }

  /**
   * Subscribe to registry changes.
   * Called whenever items are registered, unregistered, or cleared.
   *
   * @param listener - Callback to invoke on changes
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Register a callback invoked when the registry is cleared.
   * Useful for resetting module-level registration flags in tests.
   *
   * @param callback - Function to call on clear
   * @returns Unsubscribe function
   */
  onClear(callback: () => void): () => void {
    this.clearCallbacks.add(callback);
    return () => this.clearCallbacks.delete(callback);
  }

  /**
   * Clear all registrations.
   * Invokes onClear callbacks first, then notifies listeners.
   */
  clear(): void {
    this.items.clear();
    this.touch();
    for (const cb of this.clearCallbacks) {
      cb();
    }
    this.notifyListeners();
  }

  /**
   * Get the count of registered items.
   */
  get size(): number {
    this.trackVersion(); // reactive dependency
    return this.items.size;
  }

  /**
   * Notify all change listeners.
   */
  protected notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

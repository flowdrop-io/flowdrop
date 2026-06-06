/**
 * Categories Store for FlowDrop (Svelte 5 Runes)
 *
 * Manages category definitions with merged defaults and API-provided overrides.
 * Exposes lookup helpers for icon, color, and label resolution.
 *
 * The reactive state lives in the {@link CategoriesStore} class — one per
 * FlowDrop instance, resolved in components via `getInstance().categories`. The
 * module-level functions at the bottom are backward-compatible shims that
 * delegate to the page-default instance.
 *
 * @module stores/categoriesStore
 */

import type { CategoryDefinition, NodeCategory } from '../types/index.js';
import { DEFAULT_CATEGORIES } from '../config/defaultCategories.js';
import { getDefaultInstance } from './instanceContainer.svelte.js';

// =========================================================================
// CategoriesStore (per-instance reactive state)
// =========================================================================

/**
 * Per-instance category definitions with a derived name→definition lookup.
 *
 * Reads go through getters backed by `$state`/`$derived`, so they track
 * reactively in templates and `$derived`, exactly like the legacy
 * module-level functions did.
 */
export class CategoriesStore {
  /**
   * Reactive state holding the category definitions.
   * Initialized with defaults, updated when API data is fetched.
   */
  #categories = $state<CategoryDefinition[]>([...DEFAULT_CATEGORIES]);

  /** Derived lookup map: category name → CategoryDefinition. */
  #categoryMap = $derived(
    (() => {
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- rebuilt whole inside $derived, never mutated afterwards
      const map = new Map<string, CategoryDefinition>();
      for (const cat of this.#categories) {
        map.set(cat.name, cat);
      }
      return map;
    })()
  );

  /** All category definitions, sorted by weight (reactive). */
  get categories(): CategoryDefinition[] {
    return [...this.#categories].sort((a, b) => (a.weight ?? 999) - (b.weight ?? 999));
  }

  /**
   * Initialize categories with API data, merging with defaults.
   * API categories override defaults by name; custom categories are appended.
   */
  initialize(apiCategories: CategoryDefinition[]): void {
    const defaultMap = new Map<string, CategoryDefinition>();
    for (const cat of DEFAULT_CATEGORIES) {
      defaultMap.set(cat.name, cat);
    }

    // API categories override defaults by name
    for (const cat of apiCategories) {
      defaultMap.set(cat.name, {
        ...defaultMap.get(cat.name),
        ...cat
      });
    }

    this.#categories = Array.from(defaultMap.values());
  }

  /** Get the display label for a category. */
  getLabel(category: NodeCategory): string {
    const def = this.#categoryMap.get(category);
    if (def?.label) return def.label;

    // Auto-generate: capitalize each word
    return category
      .split(/[\s_-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /** Get the icon for a category. */
  getIcon(category: NodeCategory): string {
    return this.#categoryMap.get(category)?.icon ?? 'mdi:folder';
  }

  /** Get the color token for a category. */
  getColor(category: NodeCategory): string {
    return this.#categoryMap.get(category)?.color ?? 'var(--fd-node-slate)';
  }

  /** Get the full category definition, or undefined if not found. */
  getDefinition(category: NodeCategory): CategoryDefinition | undefined {
    return this.#categoryMap.get(category);
  }
}

// =========================================================================
// Backward-compatible module API (delegates to the page-default instance)
// =========================================================================

const def = (): CategoriesStore => getDefaultInstance().categories;

/**
 * Get all category definitions, sorted by weight.
 */
export function getCategories(): CategoryDefinition[] {
  return def().categories;
}

/**
 * Initialize categories with API data, merging with defaults.
 * API categories override defaults by name; custom categories are appended.
 */
export function initializeCategories(apiCategories: CategoryDefinition[]): void {
  def().initialize(apiCategories);
}

/**
 * Get the display label for a category.
 */
export function getCategoryLabel(category: NodeCategory): string {
  return def().getLabel(category);
}

/**
 * Get the icon for a category.
 */
export function getCategoryIcon(category: NodeCategory): string {
  return def().getIcon(category);
}

/**
 * Get the color token for a category.
 */
export function getCategoryColor(category: NodeCategory): string {
  return def().getColor(category);
}

/**
 * Get the full category definition, or undefined if not found.
 */
export function getCategoryDefinition(category: NodeCategory): CategoryDefinition | undefined {
  return def().getDefinition(category);
}

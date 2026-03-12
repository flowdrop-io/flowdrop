/**
 * FlowDrop Settings Module
 *
 * Provides settings stores, services, and components for user-configurable
 * preferences with hybrid persistence (localStorage + optional API sync).
 *
 * Theme stores and functions (theme, resolvedTheme, setTheme, toggleTheme,
 * cycleTheme, initializeTheme) are exported from `@flowdrop/flowdrop/core`
 * (sourced from settingsStore).
 *
 * @module settings
 *
 * @example
 * ```typescript
 * import { settingsStore, updateSettings, SettingsPanel } from "@flowdrop/flowdrop/settings";
 * import { theme, setTheme } from "@flowdrop/flowdrop/core";
 * ```
 */

// ============================================================================
// Components
// ============================================================================

export { default as ThemeToggle } from "../components/ThemeToggle.svelte";
export { default as SettingsPanel } from "../components/SettingsPanel.svelte";
export { default as SettingsModal } from "../components/SettingsModal.svelte";

// ============================================================================
// Settings Types
// ============================================================================

// Note: ThemePreference and ResolvedTheme are exported from core (via settingsStore)
export type {
  ThemeSettings,
  EditorSettings,
  UISettings,
  BehaviorSettings,
  ApiSettings,
  FlowDropSettings,
  SettingsCategory,
  PartialSettings,
  DeepPartial,
  SettingsChangeEvent,
  SettingsChangeCallback,
  SyncStatus,
  SettingsStoreState,
} from "../types/settings.js";

export {
  SETTINGS_CATEGORIES,
  SETTINGS_CATEGORY_LABELS,
  SETTINGS_CATEGORY_ICONS,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_UI_SETTINGS,
  DEFAULT_BEHAVIOR_SETTINGS,
  DEFAULT_API_SETTINGS,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
} from "../types/settings.js";

// ============================================================================
// Settings Stores
// ============================================================================

export {
  getSettings as settingsStore,
  getThemeSettings as themeSettings,
  getEditorSettings as editorSettings,
  getUiSettings as uiSettings,
  getBehaviorSettings as behaviorSettings,
  getApiSettings as apiSettings,
  getSyncStatus as syncStatusStore,
  updateSettings,
  resetSettings,
  getSettings,
  initializeSettings,
  setSettingsService,
  syncSettingsToApi,
  loadSettingsFromApi,
  onSettingsChange,
} from "../stores/settingsStore.svelte.js";

// ============================================================================
// Settings Service
// ============================================================================

export {
  settingsApi,
  SettingsService,
  createSettingsService,
  setSettingsEndpointConfig,
  getSettingsEndpointConfig,
} from "../services/settingsService.js";

/**
 * Settings Types for FlowDrop
 *
 * Provides comprehensive type definitions for all user-configurable settings.
 * Supports theme, editor, UI, behavior, and API settings with hybrid persistence.
 *
 * @module types/settings
 */

// =========================================================================
// Theme Settings
// =========================================================================

/**
 * Theme preference options
 * - 'light': Force light theme
 * - 'dark': Force dark theme
 * - 'auto': Follow system preference
 */
export type ThemePreference = "light" | "dark" | "auto";

/**
 * Resolved theme (actual applied theme, never 'auto')
 */
export type ResolvedTheme = "light" | "dark";

/**
 * Theme-related settings
 */
export interface ThemeSettings {
	/** User's theme preference */
	preference: ThemePreference;
}

// =========================================================================
// Editor Settings
// =========================================================================

/**
 * Editor canvas and interaction settings
 */
export interface EditorSettings {
	/** Show grid lines on the canvas */
	showGrid: boolean;
	/** Snap nodes to grid when dragging */
	snapToGrid: boolean;
	/** Grid cell size in pixels */
	gridSize: number;
	/** Show minimap for navigation */
	showMinimap: boolean;
	/** Default zoom level (1 = 100%) */
	defaultZoom: number;
	/** Automatically fit workflow to view on load */
	fitViewOnLoad: boolean;
}

// =========================================================================
// UI Settings
// =========================================================================

/**
 * UI layout and display settings
 */
export interface UISettings {
	/** Width of the node sidebar in pixels */
	sidebarWidth: number;
	/** Whether the sidebar is collapsed */
	sidebarCollapsed: boolean;
	/** Enable compact mode for denser UI */
	compactMode: boolean;
}

// =========================================================================
// Behavior Settings
// =========================================================================

/**
 * Application behavior and automation settings
 */
export interface BehaviorSettings {
	/** Automatically save changes */
	autoSave: boolean;
	/** Auto-save interval in milliseconds */
	autoSaveInterval: number;
	/** Maximum number of undo history entries */
	undoHistoryLimit: number;
	/** Show confirmation dialog before deleting nodes */
	confirmDelete: boolean;
}

// =========================================================================
// API Settings
// =========================================================================

/**
 * API connection and request settings
 */
export interface ApiSettings {
	/** Request timeout in milliseconds */
	timeout: number;
	/** Enable automatic retry on failure */
	retryEnabled: boolean;
	/** Maximum number of retry attempts */
	retryAttempts: number;
	/** Enable response caching */
	cacheEnabled: boolean;
}

// =========================================================================
// Combined Settings
// =========================================================================

/**
 * All FlowDrop settings organized by category
 */
export interface FlowDropSettings {
	/** Theme appearance settings */
	theme: ThemeSettings;
	/** Editor canvas settings */
	editor: EditorSettings;
	/** UI layout settings */
	ui: UISettings;
	/** Application behavior settings */
	behavior: BehaviorSettings;
	/** API connection settings */
	api: ApiSettings;
}

/**
 * Settings category names for iteration and tab rendering
 */
export type SettingsCategory = keyof FlowDropSettings;

/**
 * All available settings categories
 */
export const SETTINGS_CATEGORIES: SettingsCategory[] = [
	"theme",
	"editor",
	"ui",
	"behavior",
	"api"
];

/**
 * Human-readable labels for settings categories
 */
export const SETTINGS_CATEGORY_LABELS: Record<SettingsCategory, string> = {
	theme: "Theme",
	editor: "Editor",
	ui: "UI",
	behavior: "Behavior",
	api: "API"
};

/**
 * Icons for settings categories (Iconify icon names)
 */
export const SETTINGS_CATEGORY_ICONS: Record<SettingsCategory, string> = {
	theme: "mdi:palette",
	editor: "mdi:grid",
	ui: "mdi:view-dashboard",
	behavior: "mdi:cog-play",
	api: "mdi:api"
};

// =========================================================================
// Default Settings
// =========================================================================

/**
 * Default theme settings
 */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
	preference: "auto"
};

/**
 * Default editor settings
 */
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
	showGrid: true,
	snapToGrid: true,
	gridSize: 20,
	showMinimap: true,
	defaultZoom: 1,
	fitViewOnLoad: true
};

/**
 * Default UI settings
 */
export const DEFAULT_UI_SETTINGS: UISettings = {
	sidebarWidth: 280,
	sidebarCollapsed: false,
	compactMode: false
};

/**
 * Default behavior settings
 */
export const DEFAULT_BEHAVIOR_SETTINGS: BehaviorSettings = {
	autoSave: false,
	autoSaveInterval: 30000,
	undoHistoryLimit: 50,
	confirmDelete: true
};

/**
 * Default API settings
 */
export const DEFAULT_API_SETTINGS: ApiSettings = {
	timeout: 30000,
	retryEnabled: true,
	retryAttempts: 3,
	cacheEnabled: true
};

/**
 * Complete default settings object
 */
export const DEFAULT_SETTINGS: FlowDropSettings = {
	theme: DEFAULT_THEME_SETTINGS,
	editor: DEFAULT_EDITOR_SETTINGS,
	ui: DEFAULT_UI_SETTINGS,
	behavior: DEFAULT_BEHAVIOR_SETTINGS,
	api: DEFAULT_API_SETTINGS
};

// =========================================================================
// Partial Settings Types (for updates)
// =========================================================================

/**
 * Deep partial type for nested settings updates
 */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Partial settings for incremental updates
 */
export type PartialSettings = DeepPartial<FlowDropSettings>;

// =========================================================================
// Settings Event Types
// =========================================================================

/**
 * Event payload for settings changes
 */
export interface SettingsChangeEvent {
	/** The category that changed */
	category: SettingsCategory;
	/** The key within the category that changed */
	key: string;
	/** The previous value */
	previousValue: unknown;
	/** The new value */
	newValue: unknown;
}

/**
 * Callback type for settings change listeners
 */
export type SettingsChangeCallback = (event: SettingsChangeEvent) => void;

// =========================================================================
// Settings Persistence Types
// =========================================================================

/**
 * localStorage key for persisting settings
 */
export const SETTINGS_STORAGE_KEY = "flowdrop-settings";

/**
 * API sync status
 */
export type SyncStatus = "idle" | "syncing" | "synced" | "error";

/**
 * Settings store state including sync metadata
 */
export interface SettingsStoreState {
	/** Current settings values */
	settings: FlowDropSettings;
	/** Whether settings have been loaded from storage */
	initialized: boolean;
	/** API sync status */
	syncStatus: SyncStatus;
	/** Last sync timestamp */
	lastSyncedAt: number | null;
	/** Last sync error message */
	syncError: string | null;
}

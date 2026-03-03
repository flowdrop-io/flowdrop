/**
 * Settings Store for FlowDrop (Svelte 5 Runes)
 *
 * Provides unified state management for all user-configurable settings with:
 * - Hybrid persistence (localStorage primary, optional API sync)
 * - Category-specific getter functions for performance
 * - Deep merge support for partial updates
 * - Integrated theme system with system preference detection
 *
 * @module stores/settingsStore
 */

import type {
	FlowDropSettings,
	ThemeSettings,
	EditorSettings,
	UISettings,
	BehaviorSettings,
	ApiSettings,
	PartialSettings,
	SettingsStoreState,
	SyncStatus,
	ResolvedTheme,
	ThemePreference,
	SettingsChangeCallback,
	SettingsChangeEvent,
	SettingsCategory
} from '$lib/types/settings.js';
export type { ThemePreference, ResolvedTheme } from '$lib/types/settings.js';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '$lib/types/settings.js';
import { logger } from '../utils/logger.js';

// =========================================================================
// Internal State
// =========================================================================

/**
 * Settings service reference (set via setSettingsService)
 * Allows API sync without circular dependencies
 */
let settingsService: {
	savePreferences: (settings: FlowDropSettings) => Promise<void>;
	getPreferences: () => Promise<FlowDropSettings>;
} | null = null;

/**
 * Change listeners for external subscribers
 */
const changeListeners: Set<SettingsChangeCallback> = new Set();

// =========================================================================
// localStorage Persistence
// =========================================================================

/**
 * Load settings from localStorage
 *
 * @returns Saved settings or null if not found/invalid
 */
function loadFromStorage(): FlowDropSettings | null {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (saved) {
			const parsed = JSON.parse(saved) as Partial<FlowDropSettings>;
			// Deep merge with defaults to handle missing properties
			return deepMergeSettings(DEFAULT_SETTINGS, parsed);
		}
	} catch (error) {
		logger.warn('Failed to load settings from localStorage:', error);
	}

	return null;
}

/**
 * Save settings to localStorage
 *
 * @param settings - Settings to persist
 */
function saveToStorage(settings: FlowDropSettings): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	} catch (error) {
		logger.warn('Failed to save settings to localStorage:', error);
	}
}

// =========================================================================
// Deep Merge Utility
// =========================================================================

/**
 * Deep merge settings objects
 *
 * @param target - Target object (defaults)
 * @param source - Source object (partial updates)
 * @returns Merged settings
 */
function deepMergeSettings(
	target: FlowDropSettings,
	source: Partial<FlowDropSettings>
): FlowDropSettings {
	const result: FlowDropSettings = {
		theme: { ...target.theme },
		editor: { ...target.editor },
		ui: { ...target.ui },
		behavior: { ...target.behavior },
		api: { ...target.api }
	};

	// Merge theme settings
	if (source.theme) {
		result.theme = { ...result.theme, ...source.theme };
	}

	// Merge editor settings
	if (source.editor) {
		result.editor = { ...result.editor, ...source.editor };
	}

	// Merge UI settings
	if (source.ui) {
		result.ui = { ...result.ui, ...source.ui };
	}

	// Merge behavior settings
	if (source.behavior) {
		result.behavior = { ...result.behavior, ...source.behavior };
	}

	// Merge API settings
	if (source.api) {
		result.api = { ...result.api, ...source.api };
	}

	return result;
}

// =========================================================================
// Main Settings Store (Rune-based)
// =========================================================================

/**
 * Initial state loaded from localStorage or defaults
 */
const initialSettings = loadFromStorage() ?? DEFAULT_SETTINGS;

/**
 * Main settings store state using $state rune
 */
let storeState = $state<SettingsStoreState>({
	settings: initialSettings,
	initialized: true,
	syncStatus: 'idle',
	lastSyncedAt: null,
	syncError: null
});

/**
 * System theme preference using $state rune
 * Updates when system preference changes
 */
let systemThemeState = $state<ResolvedTheme>(
	typeof window !== 'undefined' ? getSystemTheme() : 'light'
);

// =========================================================================
// Getter Functions (replacing derived stores)
// =========================================================================

/**
 * Get current settings (replaces settingsStore derived store)
 */
export function getSettings(): FlowDropSettings {
	return storeState.settings;
}

/**
 * Get sync status (replaces syncStatusStore derived store)
 */
export function getSyncStatus(): { status: SyncStatus; lastSyncedAt: number | null; error: string | null } {
	return {
		status: storeState.syncStatus,
		lastSyncedAt: storeState.lastSyncedAt,
		error: storeState.syncError
	};
}

/**
 * Get theme settings (replaces themeSettings derived store)
 */
export function getThemeSettings(): ThemeSettings {
	return storeState.settings.theme;
}

/**
 * Get editor settings (replaces editorSettings derived store)
 */
export function getEditorSettings(): EditorSettings {
	return storeState.settings.editor;
}

/**
 * Get UI settings (replaces uiSettings derived store)
 */
export function getUiSettings(): UISettings {
	return storeState.settings.ui;
}

/**
 * Get behavior settings (replaces behaviorSettings derived store)
 */
export function getBehaviorSettings(): BehaviorSettings {
	return storeState.settings.behavior;
}

/**
 * Get API settings (replaces apiSettings derived store)
 */
export function getApiSettings(): ApiSettings {
	return storeState.settings.api;
}

/**
 * Get theme preference (replaces theme derived store)
 */
export function getTheme(): ThemePreference {
	return storeState.settings.theme.preference;
}

/**
 * Get resolved theme - the actual theme applied ('light' or 'dark')
 * When preference is 'auto', resolves based on system preference
 * (replaces resolvedTheme derived store)
 */
export function getResolvedTheme(): ResolvedTheme {
	if (storeState.settings.theme.preference === 'auto') {
		return systemThemeState;
	}
	return storeState.settings.theme.preference;
}

/**
 * Get system theme state (for internal use)
 */
export function getSystemThemeState(): ResolvedTheme {
	return systemThemeState;
}

// =========================================================================
// Theme System
// =========================================================================

/**
 * Get the system's color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
	if (typeof window === 'undefined') {
		return 'light';
	}
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Initialize the system theme change listener.
 * Sets up a media query listener for the system color scheme preference.
 *
 * @returns Cleanup function that removes the listener
 */
export function initThemeListener(): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

	const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
		systemThemeState = event.matches ? 'dark' : 'light';
	};

	mediaQuery.addEventListener('change', handleSystemThemeChange);

	return () => {
		mediaQuery.removeEventListener('change', handleSystemThemeChange);
	};
}

// =========================================================================
// Settings Update Functions
// =========================================================================

/**
 * Notify change listeners about a settings change
 */
function notifyChange(
	category: SettingsCategory,
	key: string,
	previousValue: unknown,
	newValue: unknown
): void {
	const event: SettingsChangeEvent = {
		category,
		key,
		previousValue,
		newValue
	};

	changeListeners.forEach((listener) => {
		try {
			listener(event);
		} catch (error) {
			logger.error('Settings change listener error:', error);
		}
	});
}

/**
 * Get category settings as a plain object for comparison
 */
function getCategoryAsRecord(
	settings: FlowDropSettings,
	category: SettingsCategory
): Record<string, unknown> {
	return Object.fromEntries(Object.entries(settings[category]));
}

/**
 * Update settings with partial values
 *
 * @param partial - Partial settings to merge
 */
export function updateSettings(partial: PartialSettings): void {
	const previousSettings = storeState.settings;
	const newSettings = deepMergeSettings(storeState.settings, partial as Partial<FlowDropSettings>);

	// Persist to localStorage immediately
	saveToStorage(newSettings);

	// Notify listeners for each changed category
	for (const category of Object.keys(partial) as SettingsCategory[]) {
		const partialCategory = partial[category];
		if (partialCategory && typeof partialCategory === 'object') {
			for (const key of Object.keys(partialCategory)) {
				const prevCat = getCategoryAsRecord(previousSettings, category);
				const newCat = getCategoryAsRecord(newSettings, category);
				if (prevCat[key] !== newCat[key]) {
					notifyChange(category, key, prevCat[key], newCat[key]);
				}
			}
		}
	}

	storeState = {
		...storeState,
		settings: newSettings
	};
}

/**
 * Reset settings to defaults
 *
 * @param categories - Optional categories to reset (all if not specified)
 */
export function resetSettings(categories?: SettingsCategory[]): void {
	if (categories && categories.length > 0) {
		const partial: PartialSettings = {};
		for (const category of categories) {
			(partial as Record<string, unknown>)[category] = DEFAULT_SETTINGS[category];
		}
		updateSettings(partial);
	} else {
		saveToStorage(DEFAULT_SETTINGS);
		storeState = {
			...storeState,
			settings: DEFAULT_SETTINGS
		};
	}
}

// =========================================================================
// Theme Actions
// =========================================================================

/**
 * Set the theme preference
 *
 * @param newTheme - The new theme preference ('light', 'dark', or 'auto')
 */
export function setTheme(newTheme: ThemePreference): void {
	updateSettings({ theme: { preference: newTheme } });
}

/**
 * Toggle between light and dark themes
 * If currently 'auto', switches to the opposite of system preference
 */
export function toggleTheme(): void {
	const currentTheme = getTheme();
	const currentResolved = getResolvedTheme();

	if (currentTheme === 'auto') {
		setTheme(currentResolved === 'dark' ? 'light' : 'dark');
	} else {
		setTheme(currentTheme === 'dark' ? 'light' : 'dark');
	}
}

/**
 * Cycle through theme options: light -> dark -> auto -> light
 */
export function cycleTheme(): void {
	const currentTheme = getTheme();

	switch (currentTheme) {
		case 'light':
			setTheme('dark');
			break;
		case 'dark':
			setTheme('auto');
			break;
		case 'auto':
			setTheme('light');
			break;
	}
}

/**
 * Apply theme to the document
 *
 * @param resolved - The resolved theme to apply
 */
function applyTheme(resolved: ResolvedTheme): void {
	if (typeof document === 'undefined') {
		return;
	}
	document.documentElement.setAttribute('data-theme', resolved);
}

/**
 * Stored cleanup function for the theme effect.
 * Retained so it can be called by cleanupThemeSubscription().
 */
let themeEffectCleanup: (() => void) | null = null;

/**
 * Clean up the theme subscription created by initializeTheme().
 * Call this when tearing down the settings system (e.g., in tests or
 * component cleanup) to prevent memory leaks.
 */
export function cleanupThemeSubscription(): void {
	if (themeEffectCleanup) {
		themeEffectCleanup();
		themeEffectCleanup = null;
	}
}

/**
 * Initialize the theme system
 * Should be called once on app startup
 *
 * This function:
 * 1. Applies the current resolved theme to the document
 * 2. Sets up reactivity to apply theme changes
 *
 * Note: In Svelte 5, we use $effect for reactivity. Since $effect can only
 * be used in component context or $effect.root, we use $effect.root here
 * to create a standalone reactive scope.
 */
export function initializeTheme(): void {
	const resolved = getResolvedTheme();
	applyTheme(resolved);

	// Create a standalone reactive root to watch for theme changes.
	// $effect.root returns a cleanup function.
	themeEffectCleanup = $effect.root(() => {
		$effect(() => {
			const currentResolved = getResolvedTheme();
			applyTheme(currentResolved);
		});
	});
}

/**
 * Check if theme system is initialized
 * Useful for SSR scenarios
 *
 * @returns true if running in browser and theme is applied
 */
export function isThemeInitialized(): boolean {
	if (typeof document === 'undefined') {
		return false;
	}
	return document.documentElement.hasAttribute('data-theme');
}

// =========================================================================
// API Sync Functions
// =========================================================================

/**
 * Set the settings service for API operations
 *
 * @param service - Settings service instance
 */
export function setSettingsService(
	service: {
		savePreferences: (settings: FlowDropSettings) => Promise<void>;
		getPreferences: () => Promise<FlowDropSettings>;
	} | null
): void {
	settingsService = service;
}

/**
 * Sync current settings to the backend API
 *
 * @returns Promise that resolves when sync is complete
 */
export async function syncSettingsToApi(): Promise<void> {
	if (!settingsService) {
		logger.warn('Settings service not configured for API sync');
		return;
	}

	storeState = {
		...storeState,
		syncStatus: 'syncing' as SyncStatus,
		syncError: null
	};

	try {
		const currentSettings = getSettings();
		await settingsService.savePreferences(currentSettings);

		storeState = {
			...storeState,
			syncStatus: 'synced' as SyncStatus,
			lastSyncedAt: Date.now(),
			syncError: null
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to sync settings';

		storeState = {
			...storeState,
			syncStatus: 'error' as SyncStatus,
			syncError: errorMessage
		};

		throw error;
	}
}

/**
 * Load settings from the backend API
 *
 * @returns Promise that resolves when load is complete
 */
export async function loadSettingsFromApi(): Promise<void> {
	if (!settingsService) {
		logger.warn('Settings service not configured for API sync');
		return;
	}

	storeState = {
		...storeState,
		syncStatus: 'syncing' as SyncStatus,
		syncError: null
	};

	try {
		const apiSettingsData = await settingsService.getPreferences();
		const mergedSettings = deepMergeSettings(DEFAULT_SETTINGS, apiSettingsData);

		storeState = {
			...storeState,
			settings: mergedSettings,
			syncStatus: 'synced' as SyncStatus,
			lastSyncedAt: Date.now(),
			syncError: null
		};

		// Also persist to localStorage
		saveToStorage(mergedSettings);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to load settings from API';

		storeState = {
			...storeState,
			syncStatus: 'error' as SyncStatus,
			syncError: errorMessage
		};

		throw error;
	}
}

// =========================================================================
// Change Listeners
// =========================================================================

/**
 * Subscribe to settings changes
 *
 * @param callback - Function to call when settings change
 * @returns Unsubscribe function
 */
export function onSettingsChange(callback: SettingsChangeCallback): () => void {
	changeListeners.add(callback);
	return () => {
		changeListeners.delete(callback);
	};
}

// =========================================================================
// Initialization
// =========================================================================

/**
 * Initialize the settings system
 *
 * @param options - Initialization options
 */
export async function initializeSettings(options?: {
	/** Custom default settings to merge */
	defaults?: PartialSettings;
	/** Enable API sync on initialization */
	apiSync?: boolean;
}): Promise<void> {
	// Apply custom defaults if provided
	if (options?.defaults) {
		const currentSettings = getSettings();
		const withDefaults = deepMergeSettings(
			currentSettings,
			options.defaults as Partial<FlowDropSettings>
		);
		storeState = {
			...storeState,
			settings: withDefaults
		};
		saveToStorage(withDefaults);
	}

	// Initialize theme system
	initializeTheme();

	// Optionally sync with API
	if (options?.apiSync && settingsService) {
		try {
			await loadSettingsFromApi();
		} catch {
			// Silently fail - local settings are still available
			logger.warn('Failed to sync settings from API on initialization');
		}
	}
}

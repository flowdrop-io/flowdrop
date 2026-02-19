/**
 * Settings Store for FlowDrop
 *
 * Provides unified state management for all user-configurable settings with:
 * - Hybrid persistence (localStorage primary, optional API sync)
 * - Category-specific derived stores for performance
 * - Deep merge support for partial updates
 * - Integrated theme system with system preference detection
 *
 * @module stores/settingsStore
 */

import { writable, derived, get } from 'svelte/store';
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
		console.warn('Failed to load settings from localStorage:', error);
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
		console.warn('Failed to save settings to localStorage:', error);
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
// Main Settings Store
// =========================================================================

/**
 * Initial state loaded from localStorage or defaults
 */
const initialSettings = loadFromStorage() ?? DEFAULT_SETTINGS;

/**
 * Main settings store state
 */
const storeState = writable<SettingsStoreState>({
	settings: initialSettings,
	initialized: true,
	syncStatus: 'idle',
	lastSyncedAt: null,
	syncError: null
});

/**
 * Main settings store (read-only access to current settings)
 */
export const settingsStore = derived(storeState, ($state) => $state.settings);

/**
 * Sync status store for UI indicators
 */
export const syncStatusStore = derived(storeState, ($state) => ({
	status: $state.syncStatus,
	lastSyncedAt: $state.lastSyncedAt,
	error: $state.syncError
}));

// =========================================================================
// Category-Specific Derived Stores
// =========================================================================

/**
 * Theme settings store
 */
export const themeSettings = derived(settingsStore, ($settings) => $settings.theme);

/**
 * Editor settings store
 */
export const editorSettings = derived(settingsStore, ($settings) => $settings.editor);

/**
 * UI settings store
 */
export const uiSettings = derived(settingsStore, ($settings) => $settings.ui);

/**
 * Behavior settings store
 */
export const behaviorSettings = derived(settingsStore, ($settings) => $settings.behavior);

/**
 * API settings store
 */
export const apiSettings = derived(settingsStore, ($settings) => $settings.api);

// =========================================================================
// Theme System
// =========================================================================

/**
 * System theme preference store
 * Updates when system preference changes
 */
const systemTheme = writable<ResolvedTheme>(
	typeof window !== 'undefined' ? getSystemTheme() : 'light'
);

/**
 * Get the system's color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
	if (typeof window === 'undefined') {
		return 'light';
	}
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

	const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
		systemTheme.set(event.matches ? 'dark' : 'light');
	};

	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener('change', handleSystemThemeChange);
	} else {
		// Fallback for older browsers
		mediaQuery.addListener(handleSystemThemeChange);
	}
}

/**
 * Theme preference store
 * Derived from themeSettings for convenient access
 */
export const theme = derived(themeSettings, ($theme) => $theme.preference);

/**
 * Resolved theme - the actual theme applied ('light' or 'dark')
 * When preference is 'auto', resolves based on system preference
 */
export const resolvedTheme = derived([themeSettings, systemTheme], ([$themeSettings, $systemTheme]) => {
	if ($themeSettings.preference === 'auto') {
		return $systemTheme;
	}
	return $themeSettings.preference;
});

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
			console.error('Settings change listener error:', error);
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
	storeState.update((state) => {
		const previousSettings = state.settings;
		const newSettings = deepMergeSettings(state.settings, partial as Partial<FlowDropSettings>);

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

		return {
			...state,
			settings: newSettings
		};
	});
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
		storeState.update((state) => {
			saveToStorage(DEFAULT_SETTINGS);
			return {
				...state,
				settings: DEFAULT_SETTINGS
			};
		});
	}
}

/**
 * Get current settings synchronously
 */
export function getSettings(): FlowDropSettings {
	return get(settingsStore);
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
	const currentTheme = get(theme);
	const currentResolved = get(resolvedTheme);

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
	const currentTheme = get(theme);

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
 * Initialize the theme system
 * Should be called once on app startup
 *
 * This function:
 * 1. Applies the current resolved theme to the document
 * 2. Sets up reactivity to apply theme changes
 */
export function initializeTheme(): void {
	const resolved = get(resolvedTheme);
	applyTheme(resolved);

	// Subscribe to resolved theme changes and apply them
	resolvedTheme.subscribe((theme) => {
		applyTheme(theme);
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
		console.warn('Settings service not configured for API sync');
		return;
	}

	storeState.update((state) => ({
		...state,
		syncStatus: 'syncing' as SyncStatus,
		syncError: null
	}));

	try {
		const currentSettings = get(settingsStore);
		await settingsService.savePreferences(currentSettings);

		storeState.update((state) => ({
			...state,
			syncStatus: 'synced' as SyncStatus,
			lastSyncedAt: Date.now(),
			syncError: null
		}));
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to sync settings';

		storeState.update((state) => ({
			...state,
			syncStatus: 'error' as SyncStatus,
			syncError: errorMessage
		}));

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
		console.warn('Settings service not configured for API sync');
		return;
	}

	storeState.update((state) => ({
		...state,
		syncStatus: 'syncing' as SyncStatus,
		syncError: null
	}));

	try {
		const apiSettings = await settingsService.getPreferences();
		const mergedSettings = deepMergeSettings(DEFAULT_SETTINGS, apiSettings);

		storeState.update((state) => ({
			...state,
			settings: mergedSettings,
			syncStatus: 'synced' as SyncStatus,
			lastSyncedAt: Date.now(),
			syncError: null
		}));

		// Also persist to localStorage
		saveToStorage(mergedSettings);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to load settings from API';

		storeState.update((state) => ({
			...state,
			syncStatus: 'error' as SyncStatus,
			syncError: errorMessage
		}));

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
		const currentSettings = get(settingsStore);
		const withDefaults = deepMergeSettings(
			currentSettings,
			options.defaults as Partial<FlowDropSettings>
		);
		storeState.update((state) => ({
			...state,
			settings: withDefaults
		}));
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
			console.warn('Failed to sync settings from API on initialization');
		}
	}
}

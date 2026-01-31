/**
 * Theme Store for FlowDrop
 *
 * @deprecated This module is deprecated. Use `settingsStore` instead.
 *
 * The theme functionality has been moved to the unified settings system.
 * Import from settingsStore for new code:
 *
 * ```typescript
 * import { theme, resolvedTheme, setTheme, toggleTheme, cycleTheme } from "./settingsStore.js";
 * ```
 *
 * This module re-exports from settingsStore for backward compatibility.
 *
 * Provides reactive theme state management with:
 * - Three theme modes: 'light', 'dark', 'auto' (follows system preference)
 * - localStorage persistence
 * - System preference detection via matchMedia
 * - Automatic data-theme attribute application
 *
 * @module stores/themeStore
 */

import { writable, derived, get } from "svelte/store";

/** Theme preference options */
export type ThemePreference = "light" | "dark" | "auto";

/** Resolved theme (actual applied theme, never 'auto') */
export type ResolvedTheme = "light" | "dark";

/** localStorage key for persisting theme preference */
const STORAGE_KEY = "flowdrop-theme";

/** Default theme preference when none is stored */
const DEFAULT_THEME: ThemePreference = "auto";

// =========================================================================
// System Preference Detection
// =========================================================================

/**
 * Get the system's color scheme preference
 *
 * @returns 'dark' if system prefers dark mode, 'light' otherwise
 */
function getSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined") {
		return "light";
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

/**
 * Store for system theme preference
 * Updates when system preference changes
 */
const systemTheme = writable<ResolvedTheme>(
	typeof window !== "undefined" ? getSystemTheme() : "light"
);

// Listen for system theme changes
if (typeof window !== "undefined") {
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	/**
	 * Handler for system theme preference changes
	 */
	const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
		systemTheme.set(event.matches ? "dark" : "light");
	};

	// Modern browsers use addEventListener
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener("change", handleSystemThemeChange);
	} else {
		// Fallback for older browsers
		mediaQuery.addListener(handleSystemThemeChange);
	}
}

// =========================================================================
// Theme Preference Store
// =========================================================================

/**
 * Load saved theme preference from localStorage
 *
 * @returns Saved theme preference or default
 */
function loadSavedTheme(): ThemePreference {
	if (typeof window === "undefined") {
		return DEFAULT_THEME;
	}

	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === "light" || saved === "dark" || saved === "auto") {
			return saved;
		}
	} catch {
		// localStorage may be unavailable (e.g., private browsing)
		console.warn("Failed to load theme from localStorage");
	}

	return DEFAULT_THEME;
}

/**
 * Save theme preference to localStorage
 *
 * @param theme - Theme preference to save
 */
function saveTheme(theme: ThemePreference): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// localStorage may be unavailable
		console.warn("Failed to save theme to localStorage");
	}
}

/**
 * User's theme preference store
 * Can be 'light', 'dark', or 'auto'
 */
export const theme = writable<ThemePreference>(loadSavedTheme());

// =========================================================================
// Resolved Theme Store
// =========================================================================

/**
 * Resolved theme store
 * Always returns the actual theme being applied ('light' or 'dark')
 * When theme is 'auto', this reflects the system preference
 */
export const resolvedTheme = derived(
	[theme, systemTheme],
	([$theme, $systemTheme]) => {
		if ($theme === "auto") {
			return $systemTheme;
		}
		return $theme;
	}
);

// =========================================================================
// Theme Actions
// =========================================================================

/**
 * Apply theme to the document
 * Sets the data-theme attribute on the document element
 *
 * @param resolved - The resolved theme to apply
 */
function applyTheme(resolved: ResolvedTheme): void {
	if (typeof document === "undefined") {
		return;
	}

	document.documentElement.setAttribute("data-theme", resolved);
}

/**
 * Set the theme preference
 *
 * @param newTheme - The new theme preference ('light', 'dark', or 'auto')
 */
export function setTheme(newTheme: ThemePreference): void {
	theme.set(newTheme);
	saveTheme(newTheme);
}

/**
 * Toggle between light and dark themes
 * If currently 'auto', switches to the opposite of system preference
 */
export function toggleTheme(): void {
	const currentTheme = get(theme);
	const currentResolved = get(resolvedTheme);

	if (currentTheme === "auto") {
		// Switch to opposite of system preference
		setTheme(currentResolved === "dark" ? "light" : "dark");
	} else {
		// Toggle between light and dark
		setTheme(currentTheme === "dark" ? "light" : "dark");
	}
}

/**
 * Cycle through theme options: light -> dark -> auto -> light
 */
export function cycleTheme(): void {
	const currentTheme = get(theme);

	switch (currentTheme) {
		case "light":
			setTheme("dark");
			break;
		case "dark":
			setTheme("auto");
			break;
		case "auto":
			setTheme("light");
			break;
	}
}

// =========================================================================
// Initialization
// =========================================================================

/**
 * Initialize the theme system
 * Should be called once on app startup
 *
 * This function:
 * 1. Applies the current resolved theme to the document
 * 2. Sets up reactivity to apply theme changes
 */
export function initializeTheme(): void {
	// Apply initial theme
	const resolved = get(resolvedTheme);
	applyTheme(resolved);

	// Subscribe to resolved theme changes and apply them
	resolvedTheme.subscribe((resolved) => {
		applyTheme(resolved);
	});
}

/**
 * Check if theme system is initialized
 * Useful for SSR scenarios
 *
 * @returns true if running in browser and theme is applied
 */
export function isThemeInitialized(): boolean {
	if (typeof document === "undefined") {
		return false;
	}

	return document.documentElement.hasAttribute("data-theme");
}

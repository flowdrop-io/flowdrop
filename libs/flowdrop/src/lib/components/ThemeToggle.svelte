<!--
  Theme Toggle Component
  A button that cycles through light, dark, and auto theme modes
  Displays appropriate icon for current theme state
  Styled with BEM syntax
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { theme, resolvedTheme, cycleTheme } from '../stores/settingsStore.js';
	import type { ThemePreference } from '../types/settings.js';

	/**
	 * Props interface for ThemeToggle component
	 */
	interface Props {
		/** Size variant of the toggle button */
		size?: 'sm' | 'md' | 'lg';
		/** Whether to show the theme label text */
		showLabel?: boolean;
		/** Custom class name for styling */
		class?: string;
	}

	const { size = 'md', showLabel = false, class: className = '' }: Props = $props();

	/**
	 * Get the icon for the current theme
	 * - light: sun icon
	 * - dark: moon icon
	 * - auto: computer/system icon
	 */
	const themeIcon = $derived(getThemeIcon($theme));

	/**
	 * Get icon name based on theme preference
	 */
	function getThemeIcon(currentTheme: ThemePreference): string {
		switch (currentTheme) {
			case 'light':
				return 'mdi:white-balance-sunny';
			case 'dark':
				return 'mdi:moon-waning-crescent';
			case 'auto':
				return 'mdi:desktop-mac';
		}
	}

	/**
	 * Get accessible label for the current theme
	 */
	const themeLabel = $derived(getThemeLabel($theme));

	/**
	 * Get label text based on theme preference
	 */
	function getThemeLabel(currentTheme: ThemePreference): string {
		switch (currentTheme) {
			case 'light':
				return 'Light';
			case 'dark':
				return 'Dark';
			case 'auto':
				return 'Auto';
		}
	}

	/**
	 * Get tooltip text describing current state and next action
	 */
	const tooltipText = $derived(getTooltipText($theme, $resolvedTheme));

	/**
	 * Get tooltip text based on theme preference
	 */
	function getTooltipText(currentTheme: ThemePreference, resolved: 'light' | 'dark'): string {
		if (currentTheme === 'auto') {
			return `Theme: Auto (${resolved}). Click to switch to Light`;
		}
		const next = currentTheme === 'light' ? 'Dark' : 'Auto';
		return `Theme: ${currentTheme === 'light' ? 'Light' : 'Dark'}. Click to switch to ${next}`;
	}

	/**
	 * Handle click to cycle theme
	 */
	function handleClick(): void {
		cycleTheme();
	}

	/**
	 * Handle keyboard events for accessibility
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			cycleTheme();
		}
	}
</script>

<button
	class="flowdrop-theme-toggle flowdrop-theme-toggle--{size} {className}"
	onclick={handleClick}
	onkeydown={handleKeydown}
	title={tooltipText}
	aria-label={tooltipText}
	type="button"
>
	<span class="flowdrop-theme-toggle__icon">
		<Icon icon={themeIcon} />
	</span>
	{#if showLabel}
		<span class="flowdrop-theme-toggle__label">{themeLabel}</span>
	{/if}
</button>

<style>
	.flowdrop-theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--fd-space-xs);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		background-color: var(--fd-background);
		color: var(--fd-foreground);
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		font-family: inherit;
	}

	.flowdrop-theme-toggle:hover {
		background-color: var(--fd-muted);
		border-color: var(--fd-border-strong);
	}

	.flowdrop-theme-toggle:focus {
		outline: none;
		box-shadow: 0 0 0 2px var(--fd-ring);
	}

	.flowdrop-theme-toggle:active {
		transform: scale(0.98);
	}

	/* Size variants */
	.flowdrop-theme-toggle--sm {
		padding: var(--fd-space-3xs) var(--fd-space-xs);
		font-size: var(--fd-text-xs);
	}

	.flowdrop-theme-toggle--sm .flowdrop-theme-toggle__icon {
		font-size: var(--fd-text-sm);
	}

	.flowdrop-theme-toggle--md {
		padding: var(--fd-space-xs) var(--fd-space-md);
		font-size: var(--fd-text-sm);
	}

	.flowdrop-theme-toggle--md .flowdrop-theme-toggle__icon {
		font-size: var(--fd-text-base);
	}

	.flowdrop-theme-toggle--lg {
		padding: var(--fd-space-md) var(--fd-space-xl);
		font-size: var(--fd-text-base);
	}

	.flowdrop-theme-toggle--lg .flowdrop-theme-toggle__icon {
		font-size: var(--fd-text-lg);
	}

	.flowdrop-theme-toggle__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.flowdrop-theme-toggle__label {
		font-weight: 500;
	}
</style>

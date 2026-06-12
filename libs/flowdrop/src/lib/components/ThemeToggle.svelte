<!--
  Theme Toggle Component
  A button that cycles through light, dark, and auto theme modes.
  Displays the icon for the current theme state.

  Built on the shared Button primitive so it stays visually and dimensionally
  aligned with every other control (height, focus ring, hover) for free.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from './Button.svelte';
  import { getTheme, getResolvedTheme, cycleTheme } from '../stores/settingsStore.svelte.js';
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
  const themeIcon = $derived(getThemeIcon(getTheme()));

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
   * Get the label text for the current theme
   */
  const themeLabel = $derived(getThemeLabel(getTheme()));

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
  const tooltipText = $derived(getTooltipText(getTheme(), getResolvedTheme()));

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
</script>

<Button
  variant="outline"
  {size}
  class={className}
  title={tooltipText}
  ariaLabel={tooltipText}
  onclick={cycleTheme}
>
  <Icon icon={themeIcon} />
  {#if showLabel}
    <span class="flowdrop-theme-toggle__label">{themeLabel}</span>
  {/if}
</Button>

<style>
  .flowdrop-theme-toggle__label {
    font-weight: 500;
  }
</style>

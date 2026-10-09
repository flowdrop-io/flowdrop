<!--
  FlowDrop Navbar Component
  Reusable navigation bar with customizable primary actions
  - Logo and branding on the left
  - Primary actions in the center
  - Status indicator on the right
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '@iconify/svelte';
  import LogoWordmark from './LogoWordmark.svelte';
  import SettingsModal from './SettingsModal.svelte';
  import Menu from './primitives/Menu.svelte';
  import Button from './primitives/Button.svelte';
  import type { SettingsCategory } from '$lib/types/settings.js';
  import type { NavbarAction, NavbarBranding } from '$lib/types/navbar.js';
  import { m } from '$lib/messages/index.js';
  import {
    getTheme,
    getResolvedTheme,
    getHostColorScheme,
    setTheme
  } from '$lib/stores/settingsStore.svelte.js';
  import { appearanceChoices } from '$lib/utils/appearance.js';

  interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: string;
  }

  interface Props {
    /** Primary action buttons */
    primaryActions?: NavbarAction[];
    /** Show connection status indicator */
    showStatus?: boolean;
    /** Page title */
    title?: string;
    /** Breadcrumb navigation items */
    breadcrumbs?: BreadcrumbItem[];
    /** Show settings gear icon */
    showSettings?: boolean;
    /** Which settings tabs to show in the modal */
    settingsCategories?: SettingsCategory[];
    /** Show the "Sync to Cloud" button in the settings modal */
    showSettingsSyncButton?: boolean;
    /** Show the reset buttons in the settings modal */
    showSettingsResetButton?: boolean;
    /** Custom content rendered in the trailing (right) region, before the settings gear */
    end?: Snippet;
    /** White-label logo and name; replaces the FlowDrop wordmark when it carries a logo */
    branding?: NavbarBranding;
    /**
     * Shows the ghost "Workflow" button before the primary actions and runs this
     * when it is pressed. Without it the button is not rendered.
     */
    onWorkflowSettings?: () => void;
    /** The workflow-settings panel is open: the Workflow button reads as pressed. */
    workflowSettingsOpen?: boolean;
    /**
     * Binds Ctrl/Cmd+S to the first action (Save) and shows the shortcut beside
     * it in the menu. Off by default: a host page may have its own Save shortcut.
     */
    saveShortcut?: boolean;
  }

  let {
    primaryActions = [],
    showStatus = true,
    title,
    breadcrumbs = [],
    showSettings = true,
    settingsCategories,
    showSettingsSyncButton,
    showSettingsResetButton,
    end,
    branding,
    onWorkflowSettings,
    workflowSettingsOpen = false,
    saveShortcut = false
  }: Props = $props();

  // Settings modal state
  let isSettingsOpen = $state(false);
  let gearMenuOpen = $state(false);

  // Appearance: the colour-scheme choices (the host's, Light, Dark; or Light,
  // Dark, System) and a hint saying what the preference resolves to right now.
  const appearance = $derived(m().navigation.appearance);
  const hostScheme = $derived(getHostColorScheme());
  const appearanceOptions = $derived(appearanceChoices(hostScheme, appearance));
  const currentTheme = $derived(getTheme());
  const schemeName = (resolved: 'light' | 'dark') =>
    resolved === 'dark' ? appearance.dark : appearance.light;
  const appearanceHint = $derived(
    hostScheme
      ? appearance.hostHint({ label: hostScheme.label, scheme: schemeName(hostScheme.resolved) })
      : currentTheme === 'auto'
        ? appearance.systemHint({ scheme: schemeName(getResolvedTheme()) })
        : ''
  );

  // Left / Right move between the three choices (Up / Down already do, as the
  // Menu walks its items in order).
  function onAppearanceKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const group = event.currentTarget as HTMLElement;
    const items = Array.from(group.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    items[(at + step + items.length) % items.length]?.focus();
  }

  // Hoist the navigation branch — six reads in the template.
  const nav = $derived(m().navigation);

  // Accessible name of the logo: alt text, else the branded name, else the app name.
  const logoName = $derived(branding?.logoAlt ?? branding?.name ?? nav.appName);

  // Navigation actions (`navigation: true`: dashboard, back to workflows) live
  // in the wordmark menu, not in the Save menu. When the wordmark is already a
  // link (`branding.href`) they stay with the other actions, as before.
  const navigationActions = $derived(
    branding?.href ? [] : primaryActions.filter((a) => a.navigation)
  );
  const taskActions = $derived(primaryActions.filter((a) => !navigationActions.includes(a)));

  // Flyout structure: actions after the first split into ungrouped (rendered
  // flat at the top) and groups (rendered as labeled sections). Group order
  // follows first occurrence in the source array.
  const dropdownActions = $derived(taskActions.slice(1));
  const ungroupedActions = $derived(dropdownActions.filter((a) => !a.group));
  const groupedActions = $derived.by(() => {
    const groups = new Map<string, NavbarAction[]>();
    for (const action of dropdownActions) {
      if (!action.group) continue;
      let bucket = groups.get(action.group);
      if (!bucket) {
        bucket = [];
        groups.set(action.group, bucket);
      }
      bucket.push(action);
    }
    return Array.from(groups, ([label, items]) => ({ label, items }));
  });

  // The shortcut's hint, in the platform's words.
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const saveHint = $derived(saveShortcut ? (isMac ? '⌘S' : 'Ctrl+S') : undefined);
  const settingsHint = isMac ? '⌘,' : 'Ctrl+,';

  $effect(() => {
    if (!saveShortcut) return;
    function onKeydown(event: KeyboardEvent): void {
      // A host that binds the shortcut itself (fddo's editor.js does, on document) has
      // already handled it and called preventDefault; saving again would save twice.
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 's') {
        return;
      }
      const save = taskActions[0];
      if (!save?.onclick) return;
      event.preventDefault();
      save.onclick(event);
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  // Cmd/Ctrl+, opens the full settings dialog, as in most desktop apps.
  $effect(() => {
    if (!showSettings) return;
    function onKeydown(event: KeyboardEvent): void {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key !== ',') return;
      event.preventDefault();
      isSettingsOpen = true;
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  // Icons on every item of a menu or on none: a half-iconed list reads as noise.
  const saveMenuIcons = $derived(dropdownActions.length > 0 && taskActions.every((a) => a.icon));
  const navMenuIcons = $derived(
    navigationActions.length > 0 && navigationActions.every((a) => a.icon)
  );
</script>

{#snippet menuLink(action: NavbarAction, close: () => void, icons: boolean, hint?: string)}
  <a
    href={action.href}
    role="menuitem"
    class="flowdrop-navbar__dropdown-item"
    onclick={(e) => {
      action.onclick?.(e);
      close();
    }}
    target={action.external ? '_blank' : undefined}
    rel={action.external ? 'noopener noreferrer' : undefined}
  >
    {#if icons && action.icon}
      <Icon icon={action.icon} class="flowdrop-navbar__dropdown-icon" aria-hidden="true" />
    {/if}
    <span class="flowdrop-navbar__dropdown-label">{action.label}</span>
    {#if hint}
      <kbd class="flowdrop-navbar__dropdown-hint">{hint}</kbd>
    {/if}
    {#if action.external}
      <Icon icon="mdi:open-in-new" class="flowdrop-navbar__dropdown-external" aria-hidden="true" />
    {/if}
  </a>
{/snippet}

<div class="flowdrop-navbar">
  <div class="flowdrop-navbar__start">
    <!-- Logo: the consumer's branding when set, else the rocket + FlowDrop wordmark -->
    <div class="flowdrop-logo--container">
      {#snippet logoContent()}
        {#if typeof branding?.logo === 'string'}
          <img class="flowdrop-logo--image" src={branding.logo} alt={logoName} />
        {:else if branding?.logo}
          {@const Logo = branding.logo}
          <span class="flowdrop-logo--header" role="img" aria-label={logoName} title={logoName}>
            <Logo />
          </span>
        {:else}
          <span class="flowdrop-logo--header" role="img" aria-label={logoName} title={logoName}>
            <LogoWordmark />
          </span>
        {/if}
      {/snippet}
      {#if branding?.href}
        <a class="flowdrop-logo--link" href={branding.href} title={logoName}>
          {@render logoContent()}
        </a>
      {:else if navigationActions.length > 0}
        <!-- The wordmark opens the places this editor can go: dashboard, workflow list -->
        <Menu
          label={logoName}
          testId="navbar-wordmark-menu"
          triggerClass="flowdrop-logo--menu-trigger"
          minWidth={200}
        >
          {#snippet trigger()}
            {@render logoContent()}
            <Icon icon="mdi:chevron-down" class="flowdrop-logo--menu-chevron" aria-hidden="true" />
          {/snippet}
          {#snippet children({ close })}
            {#each navigationActions as action (action.label)}
              {@render menuLink(action, close, navMenuIcons)}
            {/each}
          {/snippet}
        </Menu>
      {:else}
        {@render logoContent()}
      {/if}
    </div>
  </div>

  <div class="flowdrop-navbar__center">
    <div class="flowdrop-navbar__center-content">
      <!-- Status Indicator on top -->
      {#if showStatus}
        <div class="flowdrop-navbar__status-container">
          <div class="flowdrop-navbar__status">
            <div class="flowdrop-navbar__status-indicator"></div>
            <span class="flowdrop-navbar__status-text">{nav.connected}</span>
          </div>
        </div>
      {/if}

      <!-- Title or Breadcrumbs on bottom -->
      {#if breadcrumbs.length > 0}
        <div class="flowdrop-navbar__breadcrumb-container">
          <nav class="flowdrop-navbar__breadcrumb" aria-label={nav.breadcrumbAriaLabel}>
            <ol class="flowdrop-navbar__breadcrumb-list">
              {#each breadcrumbs as breadcrumb, index (index)}
                <li class="flowdrop-navbar__breadcrumb-item">
                  {#if breadcrumb.href && index < breadcrumbs.length - 1}
                    <a href={breadcrumb.href} class="flowdrop-navbar__breadcrumb-link">
                      {#if breadcrumb.icon}
                        <Icon icon={breadcrumb.icon} class="flowdrop-navbar__breadcrumb-icon" />
                      {/if}
                      <span class="flowdrop-navbar__breadcrumb-text">{breadcrumb.label}</span>
                    </a>
                  {:else}
                    <span class="flowdrop-navbar__breadcrumb-current">
                      {#if breadcrumb.icon}
                        <Icon icon={breadcrumb.icon} class="flowdrop-navbar__breadcrumb-icon" />
                      {/if}
                      <span class="flowdrop-navbar__breadcrumb-text">{breadcrumb.label}</span>
                    </span>
                  {/if}
                </li>
                {#if index < breadcrumbs.length - 1}
                  <li class="flowdrop-navbar__breadcrumb-separator">
                    <Icon icon="mdi:chevron-right" class="flowdrop-navbar__breadcrumb-chevron" />
                  </li>
                {/if}
              {/each}
            </ol>
          </nav>
        </div>
      {:else if title}
        <div class="flowdrop-navbar__title-container">
          <div class="flowdrop-navbar__title">
            <h2 class="flowdrop-navbar__title-text">{title}</h2>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="flowdrop-navbar__actions">
    {#if onWorkflowSettings}
      <Button
        variant="ghost"
        class="flowdrop-navbar__workflow-btn"
        aria-pressed={workflowSettingsOpen}
        data-testid="navbar-workflow-button"
        title={nav.workflowButtonTitle}
        onclick={onWorkflowSettings}
      >
        {#snippet leadingIcon()}<Icon icon="heroicons:adjustments-horizontal" />{/snippet}
        {nav.workflowButton}
      </Button>
    {/if}
    {#if taskActions.length > 0}
      <!-- Split mode: all actions as individual side-by-side buttons -->
      <div class="flowdrop-navbar__split-actions">
        {#each taskActions as action (action.label)}
          <a
            href={action.href}
            class="flowdrop-navbar__action flowdrop-navbar__action--{action.variant || 'primary'}"
            onclick={action.onclick}
            target={action.external ? '_blank' : undefined}
            rel={action.external ? 'noopener noreferrer' : undefined}
          >
            {#if action.icon}
              <span class="flowdrop-navbar__action-icon">
                <Icon icon={action.icon} class="w-4 h-4" />
              </span>
            {/if}
            <span class="flowdrop-navbar__action-label">{action.label}</span>
          </a>
        {/each}
      </div>

      <!-- Dropdown mode: first action + chevron menu for the rest -->
      <div class="flowdrop-navbar__dropdown-mode">
        {#if taskActions[0]}
          {@const primaryAction = taskActions[0]}
          <a
            href={primaryAction.href}
            class="flowdrop-navbar__primary-action flowdrop-navbar__action--{primaryAction.variant ||
              'primary'}"
            onclick={primaryAction.onclick}
            target={primaryAction.external ? '_blank' : undefined}
            rel={primaryAction.external ? 'noopener noreferrer' : undefined}
          >
            {#if primaryAction.icon}
              <span class="flowdrop-navbar__action-icon">
                <Icon icon={primaryAction.icon} class="w-4 h-4" />
              </span>
            {/if}
            <span class="flowdrop-navbar__action-label">{primaryAction.label}</span>
          </a>
        {/if}

        {#if taskActions.length > 1}
          <Menu
            class="flowdrop-navbar__dropdown"
            triggerClass="flowdrop-navbar__dropdown-trigger"
            label={nav.moreActions}
            align="end"
            minWidth={200}
          >
            {#snippet trigger()}
              <Icon icon="heroicons:chevron-down" class="w-4 h-4" />
            {/snippet}
            {#snippet children({ close })}
              <!-- The main button's own action comes first, so the menu reads Save,
                   then the rest; rules, not boxes, between the groups. -->
              {@render menuLink(taskActions[0], close, saveMenuIcons, saveHint)}
              {#if ungroupedActions.length > 0}
                <div class="flowdrop-navbar__dropdown-divider" role="separator"></div>
              {/if}
              {#each ungroupedActions as action (action.label)}
                {@render menuLink(action, close, saveMenuIcons)}
              {/each}
              {#each groupedActions as group (group.label)}
                <div class="flowdrop-navbar__dropdown-divider" role="separator"></div>
                <div class="flowdrop-navbar__dropdown-group-header" role="presentation">
                  {group.label}
                </div>
                {#each group.items as action (action.label)}
                  {@render menuLink(action, close, saveMenuIcons)}
                {/each}
              {/each}
            {/snippet}
          </Menu>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flowdrop-navbar__end">
    {@render end?.()}
    {#if showSettings}
      <Menu
        bind:open={gearMenuOpen}
        label={nav.settingsTitle}
        testId="navbar-settings-menu"
        triggerClass="flowdrop-navbar__settings-btn"
        align="end"
        minWidth={240}
      >
        {#snippet trigger()}
          <Icon icon="mdi:cog" aria-hidden="true" />
        {/snippet}
        {#snippet children({ close })}
          <div class="flowdrop-navbar__dropdown-group-header" role="presentation">
            {appearance.label}
          </div>
          <!-- Three choices drawn as a segmented switch, each a menu radio so the
               menu's keyboard walk reaches them. -->
          <div
            class="flowdrop-navbar__appearance"
            role="presentation"
            data-testid="navbar-appearance"
            onkeydown={onAppearanceKeydown}
          >
            {#each appearanceOptions as option (option.value)}
              <button
                type="button"
                role="menuitemradio"
                aria-checked={currentTheme === option.value}
                class="flowdrop-navbar__appearance-item"
                class:flowdrop-navbar__appearance-item--selected={currentTheme === option.value}
                data-value={option.value}
                onclick={() => setTheme(option.value)}
              >
                {option.label}
              </button>
            {/each}
          </div>
          {#if appearanceHint}
            <p class="flowdrop-navbar__appearance-hint" data-testid="navbar-appearance-hint">
              {appearanceHint}
            </p>
          {/if}
          <div class="flowdrop-navbar__dropdown-divider" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            class="flowdrop-navbar__dropdown-item flowdrop-navbar__dropdown-item--button"
            data-testid="navbar-all-settings"
            onclick={() => {
              close();
              isSettingsOpen = true;
            }}
          >
            <span class="flowdrop-navbar__dropdown-label">{appearance.allSettings}</span>
            <kbd class="flowdrop-navbar__dropdown-hint">{settingsHint}</kbd>
          </button>
        {/snippet}
      </Menu>
    {/if}
  </div>
</div>

<!-- Settings Modal -->
{#if showSettings}
  {@const settingsModalProps = {
    ...(settingsCategories !== undefined && { categories: settingsCategories }),
    ...(showSettingsSyncButton !== undefined && {
      showSyncButton: showSettingsSyncButton
    }),
    ...(showSettingsResetButton !== undefined && {
      showResetButton: showSettingsResetButton
    })
  }}
  <SettingsModal bind:open={isSettingsOpen} {...settingsModalProps} />
{/if}

<style>
  .flowdrop-navbar {
    height: var(--fd-navbar-height);
    width: 100%;
    max-width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    background-color: var(--fd-background);
    border-bottom: 1px solid var(--fd-border);
    z-index: 10;
  }

  .flowdrop-navbar__start {
    display: flex;
    align-items: center;
    width: var(--fd-navbar-start-width);
    min-width: var(--fd-navbar-start-width);
    flex-shrink: 0;
  }

  .flowdrop-logo--container {
    color: var(--fd-foreground);
    max-width: 100%;
    min-width: 0;
  }

  .flowdrop-logo--header {
    /* Wordmark lockup is 5:1; keep it within the start column. */
    display: block;
    height: var(--fd-navbar-logo-height);
    width: calc(var(--fd-navbar-logo-height) * 5);
  }

  .flowdrop-logo--link {
    display: inline-block;
    max-width: 100%;
    color: inherit;
    text-decoration: none;
  }

  /* The wordmark as a menu trigger: hover tint and a chevron that only appears on demand. */
  :global(.flowdrop-logo--menu-trigger) {
    gap: var(--fd-space-2xs);
    margin-left: calc(var(--fd-space-xs) * -1);
    padding: var(--fd-space-2xs) var(--fd-space-xs);
    border-radius: var(--fd-control-radius);
    color: var(--fd-foreground);
    transition: background-color var(--fd-transition-fast);
  }

  :global(.flowdrop-logo--menu-trigger:hover),
  :global(.flowdrop-logo--menu-trigger--open) {
    background-color: var(--fd-muted);
  }

  :global(.flowdrop-logo--menu-chevron) {
    flex: none;
    width: 0.875rem;
    height: 0.875rem;
    color: var(--fd-muted-foreground);
    opacity: 0;
    transition: opacity var(--fd-transition-fast);
  }

  :global(.flowdrop-logo--menu-trigger:hover .flowdrop-logo--menu-chevron),
  :global(.flowdrop-logo--menu-trigger:focus-visible .flowdrop-logo--menu-chevron),
  :global(.flowdrop-logo--menu-trigger--open .flowdrop-logo--menu-chevron) {
    opacity: 1;
  }

  /* Consumer logos are clamped so a wide one cannot push the bar into wrapping. */
  .flowdrop-logo--image {
    display: block;
    max-height: 24px;
    max-width: 100%;
    width: auto;
    object-fit: contain;
  }

  .flowdrop-navbar__center {
    flex: 1;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding-left: 1rem;
  }

  /* Graphite: a 1px x 16px rule between the logo and the workflow name. */
  .flowdrop-navbar__center::before {
    content: '';
    display: var(--fd-navbar-rule-display);
    flex: none;
    width: 1px;
    height: 16px;
    margin-right: var(--fd-space-md);
    background: var(--fd-border-strong);
  }

  /* One row: the 48px bar has no room to stack the status chip over the title. */
  .flowdrop-navbar__center-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: var(--fd-space-md);
    min-width: 0;
  }

  .flowdrop-navbar__title-container {
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  .flowdrop-navbar__title {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
  }

  .flowdrop-navbar__title-text {
    margin: 0;
    font-size: var(--fd-navbar-title-size);
    font-weight: 600;
    color: var(--fd-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 500px;
    text-align: left;
    line-height: 1.2;
  }

  /* Breadcrumb Styles */
  .flowdrop-navbar__breadcrumb-container {
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  .flowdrop-navbar__breadcrumb {
    display: flex;
    align-items: center;
  }

  .flowdrop-navbar__breadcrumb-list {
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0.25rem;
  }

  .flowdrop-navbar__breadcrumb-item {
    display: flex;
    align-items: center;
  }

  .flowdrop-navbar__breadcrumb-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--fd-radius-md);
    text-decoration: none;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-navbar__breadcrumb-link:hover {
    color: var(--fd-foreground);
    background-color: var(--fd-muted);
  }

  .flowdrop-navbar__breadcrumb-current {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    color: var(--fd-foreground);
    font-size: var(--fd-navbar-title-size);
    font-weight: 600;
  }

  .flowdrop-navbar__breadcrumb-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .flowdrop-navbar__breadcrumb-text {
    white-space: nowrap;
  }

  .flowdrop-navbar__breadcrumb-separator {
    display: flex;
    align-items: center;
    color: var(--fd-muted-foreground);
  }

  .flowdrop-navbar__breadcrumb-chevron {
    width: 0.875rem;
    height: 0.875rem;
  }

  .flowdrop-navbar__status-container {
    order: var(--fd-navbar-status-order, 0);
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  .flowdrop-navbar__status {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: var(--fd-space-3xs) var(--fd-space-xs);
    background-color: var(--fd-navbar-status-bg);
    border-radius: var(--fd-radius-md);
    font-size: var(--fd-text-xs);
    font-weight: 500;
  }

  .flowdrop-navbar__status-indicator {
    width: 0.375rem;
    height: 0.375rem;
    background-color: var(--fd-success-hover);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .flowdrop-navbar__status-text {
    color: var(--fd-navbar-status-fg);
    font-size: var(--fd-text-xs);
    font-weight: 500;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .flowdrop-navbar__actions {
    display: flex;
    align-items: center;
    gap: 0;
    margin-left: auto;
    position: relative;
  }

  .flowdrop-navbar__split-actions {
    display: var(--fd-navbar-split-display, none);
    align-items: center;
    gap: 0.5rem;
  }

  .flowdrop-navbar__dropdown-mode {
    display: var(--fd-navbar-dropdown-display, flex);
    align-items: center;
  }

  .flowdrop-navbar__primary-action {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    border: 1px solid var(--fd-navbar-action-border);
    border-radius: var(--fd-radius-md) 0 0 var(--fd-radius-md);
    transition: all var(--fd-transition-normal);
    font-weight: 500;
    font-size: var(--fd-text-sm);
    height: var(--fd-navbar-action-height);
    box-sizing: border-box;
    background-color: var(--fd-navbar-action-bg);
    color: var(--fd-navbar-action-fg);
    border-right: none;
  }

  .flowdrop-navbar__primary-action:hover {
    background-color: var(--fd-navbar-action-hover-bg);
    color: var(--fd-navbar-action-fg);
  }

  /* The Menu primitive renders these two inside its own scope, hence :global. */
  :global(.flowdrop-navbar__dropdown) {
    align-items: center;
    height: var(--fd-navbar-action-height);
  }

  :global(.flowdrop-navbar__dropdown-trigger) {
    justify-content: center;
    gap: 0;
    width: var(--fd-navbar-chevron-width);
    height: var(--fd-navbar-action-height);
    border: 1px solid var(--fd-navbar-action-border);
    border-left: none;
    border-radius: 0 var(--fd-radius-md) var(--fd-radius-md) 0;
    background-color: var(--fd-navbar-action-bg);
    color: var(--fd-navbar-action-fg);
    position: relative;
    transition: all var(--fd-transition-normal);
    box-sizing: border-box;
  }

  /* Graphite: the 1px inner divider that makes the split read as one button. */
  :global(.flowdrop-navbar__dropdown-trigger)::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 1px;
    background: var(--fd-navbar-action-divider);
  }

  :global(.flowdrop-navbar__dropdown-trigger:hover),
  :global(.flowdrop-navbar__dropdown-trigger[aria-expanded='true']) {
    background-color: var(--fd-navbar-action-hover-bg);
    color: var(--fd-navbar-action-fg);
  }

  /* The menu items, as the Menu primitive draws its own: one row, no rules between them. */
  .flowdrop-navbar__dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    box-sizing: border-box;
    width: 100%;
    min-height: var(--fd-menu-item-height);
    padding: var(--fd-space-sm);
    border-radius: var(--fd-menu-item-radius);
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    text-align: left;
    text-decoration: none;
    transition: background-color var(--fd-transition-fast);
  }

  .flowdrop-navbar__dropdown-item:hover,
  .flowdrop-navbar__dropdown-item:focus-visible {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    outline: none;
  }

  .flowdrop-navbar__dropdown-item :global(.flowdrop-navbar__dropdown-icon) {
    flex: none;
    width: 1em;
    height: 1em;
    color: var(--fd-muted-foreground);
  }

  .flowdrop-navbar__dropdown-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flowdrop-navbar__dropdown-item :global(.flowdrop-navbar__dropdown-external) {
    flex: none;
    width: 0.75rem;
    height: 0.75rem;
    color: var(--fd-muted-foreground);
  }

  .flowdrop-navbar__dropdown-hint {
    flex: none;
    margin-left: auto;
    padding-left: var(--fd-space-md);
    color: var(--fd-muted-foreground);
    font-family: inherit;
    font-size: var(--fd-text-xs);
  }

  /* The same row as a link, on a <button>. */
  .flowdrop-navbar__dropdown-item--button {
    border: none;
    background: transparent;
    font-family: inherit;
    cursor: pointer;
  }

  /* Appearance: a segmented switch (as the Segmented primitive draws it). */
  .flowdrop-navbar__appearance {
    display: flex;
    gap: var(--fd-space-3xs);
    margin: var(--fd-space-3xs) var(--fd-space-sm) 0;
    padding: var(--fd-space-3xs);
    background-color: var(--fd-muted);
    border: 1px solid var(--fd-border-muted);
    border-radius: var(--fd-control-radius);
  }

  .flowdrop-navbar__appearance-item {
    flex: 1 1 0;
    min-width: 0;
    height: calc(var(--fd-control-sm) - var(--fd-space-2xs) - 2px);
    padding: 0 var(--fd-space-xs);
    border: 0;
    border-radius: var(--fd-radius-md);
    background: transparent;
    color: var(--fd-muted-foreground);
    font-family: inherit;
    font-size: var(--fd-text-xs);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    transition:
      background-color var(--fd-transition-fast),
      color var(--fd-transition-fast);
  }

  .flowdrop-navbar__appearance-item:hover:not(.flowdrop-navbar__appearance-item--selected),
  .flowdrop-navbar__appearance-item:focus-visible {
    color: var(--fd-foreground);
  }

  .flowdrop-navbar__appearance-item--selected {
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    box-shadow: var(--fd-shadow-sm);
  }

  .flowdrop-navbar__appearance-hint {
    margin: var(--fd-space-xs) var(--fd-space-sm) var(--fd-space-3xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    line-height: 1.4;
  }

  .flowdrop-navbar__dropdown-divider {
    height: 1px;
    margin: var(--fd-space-xs) 0;
    background-color: var(--fd-border);
  }

  /* Sentence case, small and muted: a label, not a heading. */
  .flowdrop-navbar__dropdown-group-header {
    padding: var(--fd-space-xs) var(--fd-space-sm) var(--fd-space-3xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 500;
  }

  /* The ghost Workflow button; pressed while the panel it opens is open. */
  :global(.flowdrop-navbar__workflow-btn) {
    margin-right: var(--fd-space-sm);
    color: var(--fd-muted-foreground);
  }

  :global(.flowdrop-navbar__workflow-btn:hover),
  :global(.flowdrop-navbar__workflow-btn[aria-pressed='true']) {
    color: var(--fd-foreground);
  }

  :global(.flowdrop-navbar__workflow-btn[aria-pressed='true']) {
    background-color: var(--fd-muted);
  }

  .flowdrop-navbar__action {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    border-radius: var(--fd-radius-md);
    transition: all var(--fd-transition-normal);
    font-weight: 500;
    font-size: var(--fd-text-sm);
    border: 1px solid transparent;
  }

  .flowdrop-navbar__action--primary {
    background-color: var(--fd-primary);
    color: var(--fd-primary-foreground);
    border-color: var(--fd-primary);
  }

  .flowdrop-navbar__action--primary:hover {
    background-color: var(--fd-primary-hover);
    border-color: var(--fd-primary-hover);
    color: var(--fd-primary-foreground);
  }

  .flowdrop-navbar__action--secondary {
    background-color: var(--fd-secondary);
    color: var(--fd-secondary-foreground);
    border-color: var(--fd-border-strong);
  }

  .flowdrop-navbar__action--secondary:hover {
    background-color: var(--fd-secondary-hover);
    color: var(--fd-foreground);
  }

  .flowdrop-navbar__action--outline {
    background-color: transparent;
    color: var(--fd-foreground);
    border-color: var(--fd-border-strong);
  }

  .flowdrop-navbar__action--outline:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    border-color: var(--fd-muted-foreground);
  }

  .flowdrop-navbar__action--active {
    background-color: var(--fd-primary-muted);
    color: var(--fd-primary);
    border-color: var(--fd-primary);
  }

  .flowdrop-navbar__action-icon {
    display: flex;
    align-items: center;
  }

  .flowdrop-navbar__action-icon :global(svg) {
    width: 1rem;
    height: 1rem;
  }

  .flowdrop-navbar__action-label {
    font-weight: 500;
  }

  .flowdrop-navbar__end {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin-left: var(--fd-space-md);
  }

  :global(.flowdrop-navbar__settings-btn) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--fd-navbar-icon-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-navbar-icon-bg);
    color: var(--fd-muted-foreground);
    font-size: 1.25rem;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
  }

  :global(.flowdrop-navbar__settings-btn:hover),
  :global(.flowdrop-navbar__settings-btn[aria-expanded='true']) {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    border-color: var(--fd-navbar-icon-border-hover);
  }

  :global(.flowdrop-navbar__settings-btn:active) {
    transform: scale(0.95);
  }

  .flowdrop-api-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-muted);
  }

  .flowdrop-api-status__indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    transition: background-color var(--fd-transition-normal);
  }

  .flowdrop-api-status__indicator--connected {
    background-color: var(--fd-success);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .flowdrop-navbar {
      padding: 0 0.5rem;
    }

    .flowdrop-navbar__start {
      width: auto;
      min-width: auto;
      flex-shrink: 0;
    }

    .flowdrop-navbar__center {
      min-width: 0;
      overflow: hidden;
    }

    .flowdrop-navbar__breadcrumb-list {
      overflow: hidden;
    }

    /* Show only icons for non-current breadcrumb items */
    .flowdrop-navbar__breadcrumb-link .flowdrop-navbar__breadcrumb-text {
      display: none;
    }

    .flowdrop-navbar__breadcrumb-current .flowdrop-navbar__breadcrumb-text {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Force dropdown mode on small screens regardless of theme */
    .flowdrop-navbar__split-actions {
      display: none;
    }

    .flowdrop-navbar__dropdown-mode {
      display: flex;
    }

    .flowdrop-navbar__action-label {
      display: none;
    }

    .flowdrop-navbar__primary-action {
      padding: 0.5rem;
      border-radius: var(--fd-radius-md) 0 0 var(--fd-radius-md);
    }

    .flowdrop-navbar__title-text {
      font-size: 0.875rem;
      max-width: 300px;
    }

    .flowdrop-navbar__status {
      font-size: var(--fd-text-xs);
      padding: var(--fd-space-3xs) var(--fd-space-xs);
    }
  }

  @media (max-width: 480px) {
    .flowdrop-navbar__title-text {
      font-size: 0.75rem;
      max-width: 200px;
    }
  }
</style>

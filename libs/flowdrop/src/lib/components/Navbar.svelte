<!--
  FlowDrop Navbar Component
  Reusable navigation bar with customizable primary actions
  - Logo and branding on the left
  - Primary actions in the center
  - Status indicator on the right
-->

<script lang="ts">
  import Icon from "@iconify/svelte";
  import Logo from "./Logo.svelte";
  import SettingsModal from "./SettingsModal.svelte";
  import type { SettingsCategory } from "$lib/types/settings.js";

  interface NavbarAction {
    label: string;
    href: string;
    icon?: string;
    variant?: "primary" | "secondary" | "outline";
    onclick?: (event: Event) => void;
    /** If true, opens link in new tab with proper security attributes */
    external?: boolean;
  }

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
  }: Props = $props();

  // Dropdown state
  let isDropdownOpen = $state(false);

  // Settings modal state
  let isSettingsOpen = $state(false);

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".flowdrop-navbar__dropdown")) {
      isDropdownOpen = false;
    }
  }

  // Add event listener for click outside with proper cleanup
  $effect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });
</script>

<div class="flowdrop-navbar">
  <div class="flowdrop-navbar__start">
    <!-- Logo and Title -->
    <div class="flowdrop-logo--container">
      <div class="flowdrop-flex flowdrop-gap--3">
        <div class="flowdrop-logo--header">
          <Logo />
        </div>
        <div>
          <h1 class="flowdrop-text--logo flowdrop-font--bold">FlowDrop</h1>
          <p class="flowdrop-text--tagline flowdrop-text--gray">
            Visual Workflow Manager
          </p>
        </div>
      </div>
    </div>
  </div>

  <div class="flowdrop-navbar__center">
    <div class="flowdrop-navbar__center-content">
      <!-- Status Indicator on top -->
      {#if showStatus}
        <div class="flowdrop-navbar__status-container">
          <div class="flowdrop-navbar__status">
            <div class="flowdrop-navbar__status-indicator"></div>
            <span class="flowdrop-navbar__status-text">Connected</span>
          </div>
        </div>
      {/if}

      <!-- Title or Breadcrumbs on bottom -->
      {#if breadcrumbs.length > 0}
        <div class="flowdrop-navbar__breadcrumb-container">
          <nav class="flowdrop-navbar__breadcrumb" aria-label="Breadcrumb">
            <ol class="flowdrop-navbar__breadcrumb-list">
              {#each breadcrumbs as breadcrumb, index (index)}
                <li class="flowdrop-navbar__breadcrumb-item">
                  {#if breadcrumb.href && index < breadcrumbs.length - 1}
                    <a
                      href={breadcrumb.href}
                      class="flowdrop-navbar__breadcrumb-link"
                    >
                      {#if breadcrumb.icon}
                        <Icon
                          icon={breadcrumb.icon}
                          class="flowdrop-navbar__breadcrumb-icon"
                        />
                      {/if}
                      <span class="flowdrop-navbar__breadcrumb-text"
                        >{breadcrumb.label}</span
                      >
                    </a>
                  {:else}
                    <span class="flowdrop-navbar__breadcrumb-current">
                      {#if breadcrumb.icon}
                        <Icon
                          icon={breadcrumb.icon}
                          class="flowdrop-navbar__breadcrumb-icon"
                        />
                      {/if}
                      <span class="flowdrop-navbar__breadcrumb-text"
                        >{breadcrumb.label}</span
                      >
                    </span>
                  {/if}
                </li>
                {#if index < breadcrumbs.length - 1}
                  <li class="flowdrop-navbar__breadcrumb-separator">
                    <Icon
                      icon="mdi:chevron-right"
                      class="flowdrop-navbar__breadcrumb-chevron"
                    />
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
    {#if primaryActions.length > 0}
      <!-- Split mode: all actions as individual side-by-side buttons -->
      <div class="flowdrop-navbar__split-actions">
        {#each primaryActions as action (action.label)}
          <a
            href={action.href}
            class="flowdrop-navbar__action flowdrop-navbar__action--{action.variant ||
              'primary'}"
            onclick={action.onclick}
            target={action.external ? "_blank" : undefined}
            rel={action.external ? "noopener noreferrer" : undefined}
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

      <!-- Dropdown mode: first action + chevron dropdown for rest -->
      <div class="flowdrop-navbar__dropdown-mode">
        {#if primaryActions[0]}
          {@const primaryAction = primaryActions[0]}
          <a
            href={primaryAction.href}
            class="flowdrop-navbar__primary-action flowdrop-navbar__action--{primaryAction.variant ||
              'primary'}"
            onclick={primaryAction.onclick}
            target={primaryAction.external ? "_blank" : undefined}
            rel={primaryAction.external ? "noopener noreferrer" : undefined}
          >
            {#if primaryAction.icon}
              <span class="flowdrop-navbar__action-icon">
                <Icon icon={primaryAction.icon} class="w-4 h-4" />
              </span>
            {/if}
            <span class="flowdrop-navbar__action-label"
              >{primaryAction.label}</span
            >
          </a>
        {/if}

        <!-- Dropdown for Additional Actions -->
        {#if primaryActions.length > 1}
          <div class="flowdrop-navbar__dropdown">
            <button
              class="flowdrop-navbar__dropdown-trigger"
              onclick={() => (isDropdownOpen = !isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <Icon icon="heroicons:chevron-down" class="w-4 h-4" />
            </button>

            {#if isDropdownOpen}
              <div class="flowdrop-navbar__dropdown-menu">
                {#each primaryActions.slice(1) as action (action.label)}
                  <a
                    href={action.href}
                    class="flowdrop-navbar__dropdown-item"
                    onclick={(e) => {
                      action.onclick?.(e);
                      isDropdownOpen = false;
                    }}
                    target={action.external ? "_blank" : undefined}
                    rel={action.external ? "noopener noreferrer" : undefined}
                  >
                    {#if action.icon}
                      <Icon icon={action.icon} class="w-4 h-4" />
                    {/if}
                    <span>{action.label}</span>
                    {#if action.external}
                      <Icon icon="mdi:open-in-new" class="w-3 h-3" />
                    {/if}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flowdrop-navbar__end">
    {#if showSettings}
      <button
        class="flowdrop-navbar__settings-btn"
        onclick={() => (isSettingsOpen = true)}
        title="Settings"
        aria-label="Open settings"
      >
        <Icon icon="mdi:cog" />
      </button>
    {/if}
  </div>
</div>

<!-- Settings Modal -->
{#if showSettings}
  {@const settingsModalProps = {
    ...(settingsCategories !== undefined && { categories: settingsCategories }),
    ...(showSettingsSyncButton !== undefined && { showSyncButton: showSettingsSyncButton }),
    ...(showSettingsResetButton !== undefined && { showResetButton: showSettingsResetButton }),
  }}
  <SettingsModal
    bind:open={isSettingsOpen}
    {...settingsModalProps}
  />
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
    width: 320px;
    min-width: 320px;
    flex-shrink: 0;
  }

  .flowdrop-logo--container {
    color: var(--fd-foreground);
  }

  .flowdrop-logo--header {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
    padding: 2px;
  }

  .flowdrop-navbar__center {
    flex: 1;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding-left: 1rem;
  }

  .flowdrop-navbar__center-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.25rem;
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
    font-size: 1rem;
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
    font-size: var(--fd-text-sm);
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
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  .flowdrop-navbar__status {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: var(--fd-space-3xs) var(--fd-space-xs);
    background-color: var(--fd-success-muted);
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
    color: var(--fd-success-hover);
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
    border: 1px solid var(--fd-border-strong);
    border-radius: var(--fd-radius-md) 0 0 var(--fd-radius-md);
    transition: all var(--fd-transition-normal);
    font-weight: 500;
    font-size: var(--fd-text-sm);
    height: 2.5rem;
    box-sizing: border-box;
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    border-right: none;
  }

  .flowdrop-navbar__primary-action:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }

  .flowdrop-navbar__dropdown {
    position: relative;
    display: flex;
    align-items: center;
    height: 2.5rem;
  }

  .flowdrop-navbar__dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2.5rem;
    border: 1px solid var(--fd-border-strong);
    border-left: none;
    border-radius: 0 var(--fd-radius-md) var(--fd-radius-md) 0;
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    cursor: pointer;
    transition: all var(--fd-transition-normal);
    box-sizing: border-box;
  }

  .flowdrop-navbar__dropdown-trigger:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }

  .flowdrop-navbar__dropdown-trigger[aria-expanded="true"] {
    background-color: var(--fd-subtle);
    color: var(--fd-foreground);
  }

  .flowdrop-navbar__dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 50;
    margin-top: 0.25rem;
    min-width: 12rem;
    background-color: var(--fd-card);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    box-shadow: var(--fd-shadow-lg);
    overflow: hidden;
  }

  .flowdrop-navbar__dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    transition: background-color var(--fd-transition-normal);
    border: none;
    width: 100%;
    text-align: left;
    background-color: transparent;
  }

  .flowdrop-navbar__dropdown-item:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }

  .flowdrop-navbar__dropdown-item:first-child {
    border-top: none;
  }

  .flowdrop-navbar__dropdown-item:last-child {
    border-bottom: none;
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

  .flowdrop-navbar__settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-background);
    color: var(--fd-muted-foreground);
    font-size: 1.25rem;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
  }

  .flowdrop-navbar__settings-btn:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    border-color: var(--fd-border-strong);
  }

  .flowdrop-navbar__settings-btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--fd-ring);
  }

  .flowdrop-navbar__settings-btn:active {
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

  /* Utility classes */
  .flowdrop-flex {
    display: flex;
  }

  .flowdrop-gap--3 {
    gap: 0.75rem;
  }

  .flowdrop-text--logo {
    font-size: 1.125rem;
    line-height: 0;
  }

  .flowdrop-text--tagline {
    font-size: var(--fd-text-xs);
    line-height: 0.5rem;
  }

  .flowdrop-text--xs {
    font-size: var(--fd-text-xs);
    line-height: 1rem;
  }

  .flowdrop-text--gray {
    color: var(--fd-muted-foreground);
  }

  .flowdrop-font--bold {
    font-weight: 700;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .flowdrop-navbar {
      padding: 0 0.5rem;
    }

    .flowdrop-navbar__start {
      width: 280px;
      min-width: 280px;
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

    .flowdrop-text--logo {
      font-size: 1rem;
    }

    .flowdrop-text--tagline {
      display: none;
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
    .flowdrop-navbar__start {
      width: 240px;
      min-width: 240px;
    }

    .flowdrop-navbar__title-text {
      font-size: 0.75rem;
      max-width: 200px;
    }
  }
</style>

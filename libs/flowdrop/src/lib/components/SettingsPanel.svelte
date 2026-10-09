<!--
  Settings Panel Component

  A comprehensive settings panel with tabbed categories for configuring
  FlowDrop preferences. Uses SchemaForm for dynamic form generation.

  Features:
  - Tabbed interface for settings categories (Theme, Editor, UI, Behavior, API)
  - Real-time settings updates via settingsStore
  - Optional API sync with "Sync to Cloud" button
  - Reset to defaults functionality

  @example
  ```svelte
  <script>
    import { SettingsPanel } from "@flowdrop/flowdrop";

    function handleClose() {
      // Handle settings panel close
    }
  </script>

  <SettingsPanel
    showSyncButton={true}
    onClose={handleClose}
  />
  ```
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Tabs from './primitives/Tabs.svelte';
  import Button from './primitives/Button.svelte';
  import Switch from './primitives/Switch.svelte';
  import Select from './primitives/Select.svelte';
  import Segmented from './primitives/Segmented.svelte';
  import Input from './Input.svelte';
  import { resolveTheme } from '$lib/themes/index.js';
  import type { FlowDropThemeName } from '$lib/types/theme.js';
  import { m } from '$lib/messages/index.js';
  import type { ConfigSchema } from '$lib/types/index.js';
  import type { SettingsCategory } from '$lib/types/settings.js';
  import { SETTINGS_CATEGORIES, SETTINGS_CATEGORY_LABELS } from '$lib/types/settings.js';
  import {
    getSettings,
    updateSettings,
    resetSettings,
    syncSettingsToApi,
    getSyncStatus,
    getResolvedTheme
  } from '$lib/stores/settingsStore.svelte.js';
  import { logger } from '../utils/logger.js';

  /**
   * Props interface for SettingsPanel component
   */
  interface Props {
    /** Categories to display (defaults to all) */
    categories?: SettingsCategory[];
    /** Show the "Sync to Cloud" button */
    showSyncButton?: boolean;
    /** Show the reset button */
    showResetButton?: boolean;
    /** Callback when settings change */
    onSettingsChange?: (category: SettingsCategory, values: Record<string, unknown>) => void;
    /** Callback when close is requested */
    onClose?: () => void;
    /** Custom CSS class */
    class?: string;
  }

  const {
    categories = SETTINGS_CATEGORIES,
    showSyncButton = true,
    showResetButton = true,
    onSettingsChange,
    onClose,
    class: className = ''
  }: Props = $props();

  // Unique per component instance so two FlowDrop editors on one page
  // don't render colliding tab/panel DOM ids (a11y).
  const uid = $props.id();

  /**
   * Currently active tab
   */
  // initial default, user switches tabs
  // svelte-ignore state_referenced_locally
  let activeTab = $state<SettingsCategory>(categories[0] ?? 'theme');

  /**
   * Whether sync is in progress
   */
  let isSyncing = $derived(getSyncStatus().status === 'syncing');

  /**
   * JSON Schema definitions for each settings category
   */
  const schemas: Record<SettingsCategory, ConfigSchema> = {
    theme: {
      type: 'object',
      properties: {
        preference: {
          type: 'string',
          title: 'Color scheme',
          description: 'Choose your preferred color scheme',
          oneOf: [
            { const: 'light', title: 'Light' },
            { const: 'dark', title: 'Dark' },
            { const: 'auto', title: 'System' }
          ],
          default: 'auto'
        }
      }
    },
    editor: {
      type: 'object',
      properties: {
        showGrid: {
          type: 'boolean',
          title: 'Show grid',
          description: 'Display grid lines on the canvas',
          default: true
        },
        snapToGrid: {
          type: 'boolean',
          title: 'Snap to grid',
          description: 'Snap nodes to grid when dragging',
          default: true
        },
        gridSize: {
          type: 'number',
          title: 'Grid size',
          description: 'Grid cell size in pixels',
          minimum: 5,
          maximum: 50,
          default: 20
        },
        showMinimap: {
          type: 'boolean',
          title: 'Show minimap',
          description: 'Display navigation minimap',
          default: true
        },
        defaultZoom: {
          type: 'number',
          title: 'Default zoom',
          description: 'Initial zoom level (1 = 100%)',
          minimum: 0.25,
          maximum: 2,
          default: 1
        },
        fitViewOnLoad: {
          type: 'boolean',
          title: 'Fit view on load',
          description: 'Automatically fit workflow to view when loading',
          default: true
        },
        proximityConnect: {
          type: 'boolean',
          title: 'Proximity connect',
          description: 'Auto-connect compatible ports when dragging nodes near each other',
          default: false
        },
        proximityConnectDistance: {
          type: 'number',
          title: 'Proximity distance',
          description: 'Distance threshold in pixels for proximity connect',
          minimum: 50,
          maximum: 500,
          default: 150
        }
      }
    },
    ui: {
      type: 'object',
      properties: {
        sidebarCollapsed: {
          type: 'boolean',
          title: 'Start with sidebar collapsed',
          description: 'Start with the node library collapsed. Drag its edge to resize it.',
          default: false
        },
        compactMode: {
          type: 'boolean',
          title: 'Compact mode',
          description: 'Use compact UI with smaller spacing',
          default: false
        },
        theme: {
          type: 'string',
          title: 'Theme',
          description: 'Visual style and layout of the editor',
          oneOf: [
            { const: 'default', title: 'Default' },
            { const: 'minimal', title: 'Minimal' },
            { const: 'drafter', title: 'Drafter' },
            { const: 'graphite', title: 'Graphite' }
          ],
          default: 'default'
        },
        configPlacement: {
          type: 'string',
          title: 'Configuration panel',
          description: 'Where the node/workflow configuration panel opens',
          oneOf: [
            { const: 'sidebar', title: 'Right sidebar' },
            { const: 'modal', title: 'Modal window' },
            { const: 'below', title: 'Bottom panel' }
          ],
          default: 'sidebar'
        },
        consolePlacement: {
          type: 'string',
          title: 'Console',
          description: 'Where the console opens',
          oneOf: [
            { const: 'sidebar', title: 'Right sidebar' },
            { const: 'modal', title: 'Modal window' },
            { const: 'below', title: 'Bottom panel' }
          ],
          default: 'below'
        }
      }
    },
    behavior: {
      type: 'object',
      properties: {
        autoSave: {
          type: 'boolean',
          title: 'Auto-save',
          description: 'Automatically save changes',
          default: false
        },
        autoSaveInterval: {
          type: 'number',
          title: 'Auto-save interval',
          description: 'Time between auto-saves in milliseconds',
          minimum: 5000,
          maximum: 300000,
          default: 30000
        },
        storeDraftsInBrowser: {
          type: 'boolean',
          title: 'Keep drafts in this browser',
          description:
            'Keep unsaved workflow drafts in browser storage so they survive page reloads. ' +
            'Warning: drafts (including node configuration values) may stay stored on this ' +
            'device even after the tab or browser is closed, until they are saved or cleared. ' +
            'Turn off on shared devices.',
          default: true
        },
        undoHistoryLimit: {
          type: 'number',
          title: 'Undo history limit',
          description: 'Maximum number of undo steps (0 to disable)',
          minimum: 0,
          maximum: 200,
          default: 0
        },
        confirmDelete: {
          type: 'boolean',
          title: 'Confirm before deleting',
          description: 'Show confirmation before deleting nodes',
          default: true
        },
        chatMode: {
          type: 'string',
          title: 'AI Assistant mode',
          description:
            'Tools: the assistant calls the editor tools in a loop and asks before changing the workflow. ' +
            'Text (legacy): one reply with a command block you apply by hand. ' +
            'Tools needs a backend that supports tool-calling turns; otherwise the panel falls back to Text.',
          oneOf: [
            { const: 'tools', title: 'Tools' },
            { const: 'dsl', title: 'Text (legacy)' }
          ],
          default: 'tools'
        },
        chatAutoRetry: {
          type: 'boolean',
          title: 'AI Assistant auto-retry',
          description: 'Automatically ask the AI to self-correct when commands fail',
          default: true
        },
        chatAllowLayoutChanges: {
          type: 'boolean',
          title: 'AI Assistant layout changes',
          description:
            'Let the AI assistant re-arrange node positions (layout auto / layout beautify). ' +
            'Turn off to keep a hand-crafted layout — those commands are then skipped and ' +
            'the rest of the batch still applies.',
          default: true
        }
      }
    },
    api: {
      type: 'object',
      properties: {
        timeout: {
          type: 'number',
          title: 'Request timeout',
          description: 'API request timeout in milliseconds',
          minimum: 5000,
          maximum: 120000,
          default: 30000
        },
        retryEnabled: {
          type: 'boolean',
          title: 'Retry failed requests',
          description: 'Automatically retry failed requests',
          default: true
        },
        retryAttempts: {
          type: 'number',
          title: 'Retry attempts',
          description: 'Maximum number of retry attempts',
          minimum: 1,
          maximum: 10,
          default: 3
        },
        cacheEnabled: {
          type: 'boolean',
          title: 'Cache responses',
          description: 'Cache API responses for better performance',
          default: true
        }
      }
    }
  };

  /**
   * Get current values for a category from the store
   */
  function getCategoryValues(category: SettingsCategory): Record<string, unknown> {
    const settings = getSettings();
    const categorySettings = settings[category];
    // Convert to Record<string, unknown> for SchemaForm compatibility
    return Object.fromEntries(Object.entries(categorySettings));
  }

  /**
   * Handle form value changes
   */
  function handleChange(category: SettingsCategory, values: Record<string, unknown>): void {
    // Update the store
    updateSettings({ [category]: values });

    // Notify parent if callback provided
    if (onSettingsChange) {
      onSettingsChange(category, values);
    }
  }

  /**
   * Handle sync to cloud button click
   */
  async function handleSync(): Promise<void> {
    try {
      await syncSettingsToApi();
    } catch (error) {
      logger.error('Failed to sync settings:', error);
    }
  }

  /** Inline confirm state for the reset button (no browser dialog). */
  let confirmingReset = $state(false);

  /** Reset the visible tab (or everything), then leave the confirm state. */
  function doReset(scope: 'tab' | 'all'): void {
    if (scope === 'all') resetSettings();
    else resetSettings([activeTab]);
    confirmingReset = false;
  }

  // ---------------------------------------------------------------------------
  // Rows: rendered from the schemas, one flat row per setting.
  // ---------------------------------------------------------------------------

  interface SettingRowModel {
    key: string;
    title: string;
    help: string;
    kind: 'switch' | 'swatches' | 'segmented' | 'select' | 'number';
    options: { value: string; label: string }[];
    min?: number;
    max?: number;
  }

  function rowsFor(category: SettingsCategory): SettingRowModel[] {
    const props = (schemas[category].properties ?? {}) as Record<string, Record<string, unknown>>;
    return Object.entries(props).map(([key, def]) => {
      const options = ((def.oneOf as { const: string; title: string }[] | undefined) ?? []).map(
        (o) => ({ value: o.const, label: o.title })
      );
      let kind: SettingRowModel['kind'] = 'number';
      if (def.type === 'boolean') kind = 'switch';
      else if (options.length > 0) {
        kind =
          category === 'ui' && key === 'theme'
            ? 'swatches'
            : options.length <= 3
              ? 'segmented'
              : 'select';
      }
      return {
        key,
        title: String(def.title ?? key),
        help: String(def.description ?? ''),
        kind,
        options,
        min: def.minimum as number | undefined,
        max: def.maximum as number | undefined
      };
    });
  }

  function setValue(category: SettingsCategory, key: string, value: unknown): void {
    handleChange(category, { ...getCategoryValues(category), [key]: value });
  }

  function setNumber(category: SettingsCategory, row: SettingRowModel, raw: string): void {
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) return;
    const clamped = Math.min(row.max ?? n, Math.max(row.min ?? n, n));
    setValue(category, row.key, clamped);
  }

  /**
   * Swatch colours of a registered theme, from its own skin for the scheme in
   * use. Themes without a skin (Default) fall back to the stock palette.
   */
  const STOCK_SWATCH = {
    light: { background: '#ffffff', primary: '#3b82f6', accent: '#8b5cf6' },
    dark: { background: '#1a1a1e', primary: '#60a5fa', accent: '#8b5cf6' }
  };

  function swatchStyle(name: string): string {
    const mode = getResolvedTheme();
    const skin = resolveTheme(name as FlowDropThemeName).skin;
    const tokens = {
      ...(skin?.tokens ?? {}),
      ...(mode === 'dark' ? (skin?.darkTokens ?? {}) : {})
    };
    const stock = STOCK_SWATCH[mode];
    const bg = tokens.background ?? stock.background;
    const primary = tokens.primary ?? stock.primary;
    const accent = tokens.accent ?? stock.accent;
    return `--_sw-bg:${bg};--_sw-primary:${primary};--_sw-accent:${accent}`;
  }

  const idFor = (category: SettingsCategory, key: string): string => `${uid}-${category}-${key}`;
</script>

<div class="flowdrop-scope flowdrop-settings-panel {className}">
  <!-- Tab navigation: only when there is something to switch between -->
  {#if categories.length > 1}
    <div class="flowdrop-settings-panel__tabs">
      <Tabs
        idBase={uid}
        ariaLabel={m().layout.settingsCategories}
        tabs={categories.map((c) => ({ value: c, label: SETTINGS_CATEGORY_LABELS[c] }))}
        value={activeTab}
        onchange={(v) => (activeTab = v as SettingsCategory)}
      />
    </div>
  {/if}

  <!-- Tab panels -->
  <div class="flowdrop-settings-panel__content">
    {#each categories as category (category)}
      <div
        id="{uid}-panel-{category}"
        class="flowdrop-settings-panel__panel"
        class:flowdrop-settings-panel__panel--active={activeTab === category}
        role={categories.length > 1 ? 'tabpanel' : undefined}
        aria-labelledby={categories.length > 1 ? `${uid}-tab-${category}` : undefined}
        hidden={activeTab !== category}
      >
        {#if activeTab === category}
          {@const values = getCategoryValues(category)}
          {#each rowsFor(category) as row (row.key)}
            {@const id = idFor(category, row.key)}
            <div class="flowdrop-settings-row" title={row.help}>
              <div class="flowdrop-settings-row__text">
                <label class="flowdrop-settings-row__label" for={id}>{row.title}</label>
                {#if row.help}
                  <p class="flowdrop-settings-row__help" id="{id}-help">{row.help}</p>
                {/if}
              </div>

              <div class="flowdrop-settings-row__control">
                {#if row.kind === 'switch'}
                  <Switch
                    {id}
                    aria-describedby={row.help ? `${id}-help` : undefined}
                    name={row.key}
                    checked={Boolean(values[row.key])}
                    onchange={(on) => setValue(category, row.key, on)}
                  />
                {:else if row.kind === 'swatches'}
                  <div class="flowdrop-settings-swatches" role="radiogroup" aria-label={row.title}>
                    {#each row.options as opt (opt.value)}
                      <label class="flowdrop-settings-swatch" style={swatchStyle(opt.value)}>
                        <input
                          type="radio"
                          class="flowdrop-settings-swatch__input"
                          name="{uid}-{row.key}"
                          value={opt.value}
                          checked={values[row.key] === opt.value}
                          onchange={() => setValue(category, row.key, opt.value)}
                        />
                        <span class="flowdrop-settings-swatch__dot" aria-hidden="true"></span>
                        <span class="flowdrop-settings-swatch__name">{opt.label}</span>
                      </label>
                    {/each}
                  </div>
                {:else if row.kind === 'segmented'}
                  <Segmented
                    ariaLabel={row.title}
                    options={row.options}
                    value={String(values[row.key] ?? '')}
                    onchange={(v) => setValue(category, row.key, v)}
                  />
                {:else if row.kind === 'select'}
                  <Select
                    {id}
                    aria-describedby={row.help ? `${id}-help` : undefined}
                    class="flowdrop-settings-row__select"
                    value={String(values[row.key] ?? '')}
                    onchange={(e) => setValue(category, row.key, e.currentTarget.value)}
                  >
                    {#each row.options as opt (opt.value)}
                      <option value={opt.value}>{opt.label}</option>
                    {/each}
                  </Select>
                {:else}
                  <Input
                    {id}
                    aria-describedby={row.help ? `${id}-help` : undefined}
                    type="number"
                    size="sm"
                    class="flowdrop-settings-row__number"
                    min={row.min}
                    max={row.max}
                    value={Number(values[row.key] ?? 0)}
                    onchange={(e) => setNumber(category, row, e.currentTarget.value)}
                  />
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/each}
  </div>

  <!-- Footer -->
  <div class="flowdrop-settings-panel__footer">
    <div class="flowdrop-settings-panel__footer-start">
      {#if showResetButton}
        {#if confirmingReset}
          <span
            class="flowdrop-settings-panel__confirm"
            role="alertdialog"
            aria-label="Confirm reset"
          >
            {categories.length > 1
              ? `Reset ${SETTINGS_CATEGORY_LABELS[activeTab]} settings?`
              : 'Reset to defaults?'}
          </span>
          <Button size="md" variant="danger-ghost" onclick={() => doReset('tab')}>
            {categories.length > 1 ? 'This tab' : 'Reset'}
          </Button>
          {#if categories.length > 1}
            <Button size="md" variant="danger-ghost" onclick={() => doReset('all')}>
              All settings
            </Button>
          {/if}
          <Button size="md" variant="ghost" onclick={() => (confirmingReset = false)}>Cancel</Button
          >
        {:else}
          <Button size="md" variant="danger-ghost" onclick={() => (confirmingReset = true)}>
            Reset to defaults
          </Button>
        {/if}
      {/if}
    </div>

    <div class="flowdrop-settings-panel__footer-end">
      {#if showSyncButton}
        <Button
          size="md"
          variant="ghost"
          onclick={handleSync}
          disabled={isSyncing}
          loading={isSyncing}
          title="Sync settings to cloud"
        >
          {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
        </Button>
      {/if}

      {#if onClose}
        <Button size="md" variant="primary" onclick={onClose}>Close</Button>
      {/if}
    </div>
  </div>

  <!-- Sync Status Indicator -->
  {#if getSyncStatus().error}
    <div class="flowdrop-settings-panel__error">
      <Icon icon="mdi:alert-circle" />
      <span>{getSyncStatus().error}</span>
    </div>
  {:else if getSyncStatus().status === 'synced' && getSyncStatus().lastSyncedAt}
    <div class="flowdrop-settings-panel__synced">
      <Icon icon="mdi:check-circle" />
      <span>Synced {new Date(getSyncStatus().lastSyncedAt!).toLocaleTimeString()}</span>
    </div>
  {/if}
</div>

<style>
  .flowdrop-settings-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--fd-background);
    color: var(--fd-foreground);
  }

  /* Tabs (only rendered with more than one category) */
  .flowdrop-settings-panel__tabs {
    padding: var(--fd-space-sm) var(--fd-space-md);
    border-bottom: 1px solid var(--fd-border);
    overflow-x: auto;
  }

  /* Content: flat rows, separated by space only */
  .flowdrop-settings-panel__content {
    flex: 1;
    overflow-y: auto;
    padding: var(--fd-space-lg) var(--fd-space-xl);
  }

  .flowdrop-settings-panel__panel {
    display: none;
  }

  .flowdrop-settings-panel__panel--active {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-lg);
  }

  .flowdrop-settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-lg);
  }

  .flowdrop-settings-row__text {
    min-width: 0;
    flex: 1;
  }

  .flowdrop-settings-row__label {
    display: block;
    color: var(--fd-foreground);
    font-size: var(--fd-text-body);
    font-weight: 500;
    line-height: var(--fd-leading-tight);
  }

  /*
   * The help is the row's tooltip (title) and the control's accessible
   * description; it is not drawn, so a row stays one line.
   */
  .flowdrop-settings-row__help {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .flowdrop-settings-row__control {
    display: flex;
    flex-shrink: 0;
    align-items: center;
  }

  .flowdrop-settings-row__control :global(.flowdrop-settings-row__select) {
    width: 11rem;
  }

  .flowdrop-settings-row__control :global(.flowdrop-settings-row__number) {
    width: 5.5rem;
    text-align: right;
  }

  /* Theme picker: one swatch per registered theme, drawn from its own skin */
  .flowdrop-settings-swatches {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--fd-space-3xs);
  }

  .flowdrop-settings-swatch {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    height: var(--fd-control-md);
    padding: 0 var(--fd-space-sm) 0 var(--fd-space-xs);
    border-radius: var(--fd-control-radius);
    color: var(--fd-foreground);
    font-size: var(--fd-text-body);
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  .flowdrop-settings-swatch:hover {
    background-color: var(--fd-subtle);
  }

  .flowdrop-settings-swatch__input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  /* The dot: the theme's surface with its primary and accent as a split disc. */
  .flowdrop-settings-swatch__dot {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    border-radius: var(--fd-radius-full);
    border: 1px solid var(--fd-border-strong);
    background: linear-gradient(
      135deg,
      var(--_sw-bg) 0 40%,
      var(--_sw-primary) 40% 70%,
      var(--_sw-accent) 70% 100%
    );
  }

  .flowdrop-settings-swatch:has(:checked) {
    background-color: var(--fd-subtle);
    font-weight: 500;
  }

  .flowdrop-settings-swatch:has(:checked) .flowdrop-settings-swatch__dot {
    outline: 1px solid var(--fd-ring);
    outline-offset: 2px;
  }

  .flowdrop-settings-swatch:has(:focus-visible) {
    outline: 2px solid var(--fd-ring);
    outline-offset: 1px;
  }

  /* Footer: rule-less, one danger-ghost reset on the left */
  .flowdrop-settings-panel__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--fd-space-md) var(--fd-space-xl);
    gap: var(--fd-space-md);
  }

  .flowdrop-settings-panel__footer-start,
  .flowdrop-settings-panel__footer-end {
    display: flex;
    gap: var(--fd-space-xs);
    align-items: center;
  }

  .flowdrop-settings-panel__confirm {
    color: var(--fd-foreground);
    font-size: var(--fd-text-body);
    margin-right: var(--fd-space-xs);
  }

  /* Status Indicators */
  .flowdrop-settings-panel__error,
  .flowdrop-settings-panel__synced {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs) var(--fd-space-xl);
    font-size: var(--fd-text-xs);
  }

  .flowdrop-settings-panel__error {
    background-color: var(--fd-destructive);
    color: var(--fd-destructive-foreground);
  }

  .flowdrop-settings-panel__synced {
    background-color: var(--fd-success);
    color: var(--fd-success-foreground);
  }

  /* Spin Animation */
  :global(.flowdrop-settings-panel__spin) {
    animation: flowdrop-spin 1s linear infinite;
  }

  @keyframes flowdrop-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>

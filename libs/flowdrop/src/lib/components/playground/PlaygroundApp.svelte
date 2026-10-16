<!--
  @component
  **Legacy.** A full-page Playground with the FlowDrop navbar on top. It is deprecated in favour of the editor's Test mode and removed in 3.0. It warns once per page when mounted.
  It pairs the navbar with `PlaygroundStudio`. When you import it directly (not through `mountPlaygroundApp`), call `initializeSettings()` first, because the navbar's settings modal reads the settings store.

  **Use it for** existing full-page standalone Playgrounds.
  **Not for** new work; use the editor's Test mode (`DockedPlayground`) instead.
-->

<script lang="ts">
  import { warnStandalonePlaygroundDeprecated } from '../../utils/deprecation.js';
  import Navbar from '../Navbar.svelte';
  import { themeScope } from '../../utils/themeScope.svelte.js';
  import PlaygroundStudio from './PlaygroundStudio.svelte';
  import type { Workflow } from '$lib/types/index.js';
  import type { FlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
  import type { EndpointConfig } from '$lib/config/endpoints.js';
  import type { AuthProvider } from '$lib/types/auth.js';
  import type { PlaygroundConfig } from '$lib/types/playground.js';
  import type { SettingsCategory } from '$lib/types/settings.js';
  import type { NavbarAction, NavbarBranding } from '$lib/types/navbar.js';

  warnStandalonePlaygroundDeprecated();

  interface Props {
    /** Id of the workflow to test. */
    workflowId: string;
    /** A pre-loaded workflow. Default: fetched by id. */
    workflow?: Workflow;
    /** Display mode. Default: standalone. */
    mode?: 'standalone' | 'embedded';
    /** API endpoints. Default: the page default. */
    endpointConfig?: EndpointConfig;
    /** Auth provider applied to this instance's API requests. */
    authProvider?: AuthProvider;
    /** Playground options. Default: none. */
    config?: PlaygroundConfig;
    /** Show the navbar on top. Default: false. */
    showNavbar?: boolean;
    /** Title in the navbar. Default: none. */
    navbarTitle?: string;
    /** Extra action buttons in the navbar. Default: none. */
    primaryActions?: NavbarAction[];
    /** Logo and name for the navbar. Default: none. */
    branding?: NavbarBranding;
    /** Show the settings button. Default: true. */
    showSettings?: boolean;
    /** Settings categories to offer. Default: all. */
    settingsCategories?: SettingsCategory[];
    /** Show the sync button in settings. Default: the settings default. */
    showSettingsSyncButton?: boolean;
    /** Show the reset button in settings. Default: the settings default. */
    showSettingsResetButton?: boolean;
    /** Session to open on mount. Default: none. */
    initialSessionId?: string;
    /** Whether the pipeline panel starts open. Default: the stored choice. */
    initialPipelineOpen?: boolean;
    /** Minimum width of the chat side in px. Default: 760. */
    minChatWidth?: number;
    /** Starting width of the pipeline panel in px. Default: 500. */
    initialPipelineWidth?: number;
    /** Called when the user closes the Playground. */
    onClose?: () => void;
    /** Called with the session id after a switch, so a host can update its URL. */
    onSessionNavigate?: (sessionId: string) => void;
    /** Per-instance state container — forwarded to the inner PlaygroundStudio */
    instance?: FlowDropInstance;
  }

  let {
    workflowId,
    workflow,
    mode = 'standalone',
    endpointConfig,
    authProvider,
    config = {},
    showNavbar = false,
    navbarTitle,
    primaryActions = [],
    branding,
    showSettings = true,
    settingsCategories,
    showSettingsSyncButton,
    showSettingsResetButton,
    initialSessionId,
    initialPipelineOpen,
    minChatWidth,
    initialPipelineWidth,
    onClose,
    onSessionNavigate,
    instance
  }: Props = $props();

  const displayTitle = $derived(navbarTitle ?? workflow?.name ?? 'Playground');
</script>

<div class="flowdrop-scope fd-playground-app" use:themeScope={{ mirror: true }}>
  {#if showNavbar}
    <Navbar
      title={displayTitle}
      {primaryActions}
      {branding}
      showStatus={false}
      {showSettings}
      {settingsCategories}
      {showSettingsSyncButton}
      {showSettingsResetButton}
    />
  {/if}
  <div class="fd-playground-app__content">
    <PlaygroundStudio
      {instance}
      {workflowId}
      {workflow}
      {mode}
      {endpointConfig}
      {authProvider}
      {config}
      {initialSessionId}
      {initialPipelineOpen}
      {minChatWidth}
      {initialPipelineWidth}
      {onClose}
      {onSessionNavigate}
    />
  </div>
</div>

<style>
  .fd-playground-app {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: var(--fd-background);
  }

  .fd-playground-app__content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>

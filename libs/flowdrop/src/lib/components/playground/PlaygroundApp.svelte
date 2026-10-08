<!--
  PlaygroundApp Component

  Full-page playground wrapper that pairs the FlowDrop Navbar with
  PlaygroundStudio.

  When importing this component directly (rather than via mountPlaygroundApp),
  call initializeSettings() before mount — the navbar's settings modal reads
  from the settings store.

  @deprecated The standalone Playground is deprecated in favour of the editor's
  Test mode and removed in 3.0. It warns once per page when mounted.
-->

<script lang="ts">
  import { warnStandalonePlaygroundDeprecated } from '../../utils/deprecation.js';
  import Navbar from '../Navbar.svelte';
  import PlaygroundStudio from './PlaygroundStudio.svelte';
  import type { Workflow } from '$lib/types/index.js';
  import type { FlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
  import type { EndpointConfig } from '$lib/config/endpoints.js';
  import type { AuthProvider } from '$lib/types/auth.js';
  import type { PlaygroundConfig } from '$lib/types/playground.js';
  import type { SettingsCategory } from '$lib/types/settings.js';
  import type { NavbarAction } from '$lib/types/navbar.js';

  warnStandalonePlaygroundDeprecated();

  interface Props {
    workflowId: string;
    workflow?: Workflow;
    mode?: 'standalone' | 'embedded';
    endpointConfig?: EndpointConfig;
    /** Auth provider applied to this instance's API requests. */
    authProvider?: AuthProvider;
    config?: PlaygroundConfig;
    showNavbar?: boolean;
    navbarTitle?: string;
    primaryActions?: NavbarAction[];
    showSettings?: boolean;
    settingsCategories?: SettingsCategory[];
    showSettingsSyncButton?: boolean;
    showSettingsResetButton?: boolean;
    initialSessionId?: string;
    initialPipelineOpen?: boolean;
    minChatWidth?: number;
    initialPipelineWidth?: number;
    onClose?: () => void;
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

<div class="flowdrop-scope fd-playground-app">
  {#if showNavbar}
    <Navbar
      title={displayTitle}
      {primaryActions}
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

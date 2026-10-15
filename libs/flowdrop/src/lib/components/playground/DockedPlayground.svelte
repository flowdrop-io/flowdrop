<!--
  @component
  The Playground of Test mode: the conversation docked beside the canvas, for the editor's workflow and the instance's
  test session. It has the history header (`PlaygroundHeader`), the conversation and the composer, and no pipeline panel.

  The conversation outlives this component. Switching back to Edit unmounts it, the run goes on, and Test finds the
  conversation where it was left.

  **Use it for** the left panel of Test mode.
  **Not for** the standalone Playground page, which is deprecated.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import PlaygroundSurface from './PlaygroundSurface.svelte';
  import type { Workflow } from '../../types/index.js';
  import type { EditorPlaygroundConfig } from '../../types/playground.js';

  interface Props {
    /** The editor's workflow, live: its unsaved edits are what the next turn runs. */
    workflow: Workflow;
    /** Opens the workflow's Playground settings in the inspector. */
    onOpenSettings?: () => void;
    /**
     * The editor's save, so Send reads "Save & send" while the workflow has
     * unsaved edits. Resolves `true` when written; throws when it fails.
     */
    onSave?: () => Promise<boolean>;
    /**
     * Extra entries at the end of the header's ⋯ menu (buttons with
     * `class="header-menu__item"` and `role="menuitem"`; call `close()` after
     * acting). The editor's own actions for a run go here.
     */
    menuItems?: Snippet<[{ close: () => void }]>;
    /**
     * How the surface follows a run (`pollingInterval`, `shouldStopPolling`).
     * Forwarded to PlaygroundSurface's `config`; unset, the defaults apply.
     */
    config?: EditorPlaygroundConfig;
  }

  let { workflow, onOpenSettings, onSave, menuItems, config }: Props = $props();
</script>

<div class="docked-playground" data-testid="docked-playground">
  {#key workflow.id}
    <PlaygroundSurface
      workflowId={workflow.id}
      {workflow}
      mode="embedded"
      retainSession
      followWorkflow
      sessionOptional
      playgroundSessionsOnly
      historyHeader
      {config}
      {menuItems}
      {onSave}
      {onOpenSettings}
    />
  {/key}
</div>

<style>
  .docked-playground {
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* The surface's embedded look is a right-hand drawer; docked on the left it
     is separated from the canvas by the layout's own border. */
  .docked-playground :global(.playground--embedded) {
    border-left: 0;
    box-shadow: none;
  }
</style>

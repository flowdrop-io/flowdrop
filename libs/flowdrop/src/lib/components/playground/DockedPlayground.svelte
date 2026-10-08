<!--
  DockedPlayground

  The Playground of the editor's Test mode: the conversation surface beside
  the canvas, for the editor's current workflow and the instance's current test
  session (`fd.runs`). Compact by design: no minimum width and no pipeline
  panel (the canvas shows the run). Its header is two controls: the history
  chip (conversations and runs) and the ⋯ menu (PlaygroundHeader). Built on
  PlaygroundSurface, not on the standalone Playground, so it does not go when
  that one is removed in 3.0.

  The session outlives this component: switching back to Edit unmounts it, the
  run goes on, and Test finds the conversation where it was left.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import PlaygroundSurface from './PlaygroundSurface.svelte';
  import type { Workflow } from '../../types/index.js';

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
  }

  let { workflow, onOpenSettings, onSave, menuItems }: Props = $props();
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

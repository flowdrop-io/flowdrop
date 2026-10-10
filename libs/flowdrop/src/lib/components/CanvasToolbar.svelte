<!--
  CanvasToolbar — the top-left canvas toolbar: Edit | Test, the Runs list (Test
  mode) and the run pill.
  (The Console toggle is a strip along the canvas's bottom edge, ConsoleStrip.)

  Replaces the navbar's Edit | Test switch, the dot on "Test" and the Edit-mode
  run bar's top-edge notch. Each group renders only when its prop is given:
  the mode switch needs `onEditorModeChange`. Without it and with no live
  run the toolbar is not drawn.
-->

<script lang="ts">
  import { getMessages } from '../messages/context.js';
  import type { EditorMode } from '../stores/editorModeStore.svelte.js';
  import { getInstance } from '../stores/getInstance.svelte.js';
  import Toolbar from './primitives/Toolbar.svelte';
  import Segmented from './primitives/Segmented.svelte';
  import RunBar from './RunBar.svelte';
  import RunsMenu from './RunsMenu.svelte';

  interface Props {
    /** Current editor mode. */
    editorMode?: EditorMode;
    /** Switch the mode. The Edit | Test switch is shown only when this is set. */
    onEditorModeChange?: (mode: EditorMode) => void;
    /** Take the person to the waiting run in Test mode (the pill's Open). */
    onOpenTest?: () => void;
    /** Take a failed run to the Assistant (the pill's "Ask the Assistant"). */
    onAskAssistant?: (runId: string) => void;
    /** Show the run pill while a run exists. @default true */
    showRun?: boolean;
    /** Show the Runs list (Test mode's past runs). The host decides when. @default false */
    showRuns?: boolean;
    /** Host URL templates for the Runs list's admin links. */
    adminLinks?: { runs?: string; run?: string };
  }

  let {
    editorMode = 'edit',
    onEditorModeChange,
    onOpenTest,
    onAskAssistant,
    showRun = true,
    showRuns = false,
    adminLinks
  }: Props = $props();

  const fd = getInstance();
  const getMsgs = getMessages();
  const nav = $derived(getMsgs().navigation.editorMode);

  const options = $derived([
    { value: 'edit', label: nav.edit, icon: 'mdi:pencil', title: nav.editTitle },
    { value: 'test', label: nav.test, icon: 'mdi:play', title: nav.testTitle }
  ]);

  // Drawn when it has controls; a pill-only host gets the toolbar while a run exists.
  const drawn = $derived(!!onEditorModeChange || (showRun && !!fd.runs.activeRun));
</script>

{#if drawn}
  <div class="flowdrop-canvas-toolbar">
    <Toolbar ariaLabel={nav.toolbarLabel}>
      {#if onEditorModeChange}
        <Segmented
          size="md"
          float
          ariaLabel={nav.label}
          {options}
          value={editorMode}
          onchange={(v) => onEditorModeChange(v as EditorMode)}
        />
      {/if}
      {#if showRuns}
        <RunsMenu {adminLinks} />
      {/if}
      {#if showRun}
        <RunBar mode={editorMode} {onAskAssistant} onOpen={onOpenTest} />
      {/if}
    </Toolbar>
  </div>
{/if}

<style>
  .flowdrop-canvas-toolbar {
    position: absolute;
    top: var(--fd-canvas-inset);
    /* Clear of an overlaying drawer (inset, set by App) */
    left: calc(var(--fd-canvas-inset) + var(--fd-canvas-toolbar-inset, 0px));
    z-index: 5;
    max-width: calc(100% - 2 * var(--fd-canvas-inset));
  }

  /* Narrow: the sidebar overlays the canvas, so start to the right of it. */
  @media (max-width: 768px) {
    .flowdrop-canvas-toolbar {
      left: calc(
        var(--fd-canvas-inset) +
          max(var(--fd-canvas-left-offset, 0px), var(--fd-canvas-toolbar-inset, 0px))
      );
    }
  }
</style>

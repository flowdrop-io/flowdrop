<!--
  CanvasToolbar — the top-left canvas toolbar: Edit | Test, the run pill and the
  Console toggle.

  Replaces the navbar's Edit | Test switch, the dot on "Test" and the Edit-mode
  run bar's top-edge notch. Each group renders only when its prop is given:
  the mode switch needs `onEditorModeChange`, the Console toggle needs
  `onToggleConsole`. With neither and no live run the toolbar is not drawn.
-->

<script lang="ts">
  import { getMessages } from '../messages/context.js';
  import type { EditorMode } from '../stores/editorModeStore.svelte.js';
  import { getInstance } from '../stores/getInstance.svelte.js';
  import Toolbar from './primitives/Toolbar.svelte';
  import ToolbarSeparator from './primitives/ToolbarSeparator.svelte';
  import Segmented from './primitives/Segmented.svelte';
  import IconButton from './primitives/IconButton.svelte';
  import RunBar from './RunBar.svelte';
  import CommandLineIcon from './icons/CommandLineIcon.svelte';

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
    /** Toggle the Console group. The Console button is shown only when this is set. */
    onToggleConsole?: () => void;
    /** The Console group is open. */
    consoleOpen?: boolean;
    /** Label of the Console button. */
    consoleLabel?: string;
  }

  let {
    editorMode = 'edit',
    onEditorModeChange,
    onOpenTest,
    onAskAssistant,
    showRun = true,
    onToggleConsole,
    consoleOpen = false,
    consoleLabel
  }: Props = $props();

  const fd = getInstance();
  const getMsgs = getMessages();
  const nav = $derived(getMsgs().navigation.editorMode);
  const commandConsole = $derived(getMsgs().layout.commandConsole);

  const options = $derived([
    { value: 'edit', label: nav.edit, icon: 'mdi:pencil', title: nav.editTitle },
    { value: 'test', label: nav.test, icon: 'mdi:play', title: nav.testTitle }
  ]);

  // Drawn when it has controls; a pill-only host gets the toolbar while a run exists.
  const drawn = $derived(
    !!onEditorModeChange || !!onToggleConsole || (showRun && !!fd.runs.activeRun)
  );
</script>

{#if drawn}
  <div class="flowdrop-canvas-toolbar">
    <Toolbar ariaLabel={nav.toolbarLabel}>
      {#if onEditorModeChange}
        <Segmented
          size="md"
          ariaLabel={nav.label}
          {options}
          value={editorMode}
          onchange={(v) => onEditorModeChange(v as EditorMode)}
        />
      {/if}
      {#if showRun}
        <RunBar mode={editorMode} {onAskAssistant} onOpen={onOpenTest} />
      {/if}
      {#if onToggleConsole}
        {#if onEditorModeChange || (showRun && fd.runs.activeRun)}
          <ToolbarSeparator />
        {/if}
        <IconButton
          size="md"
          ariaLabel={consoleLabel ?? commandConsole}
          title={consoleLabel ?? commandConsole}
          active={consoleOpen}
          onclick={onToggleConsole}
        >
          <span class="flowdrop-canvas-toolbar__icon"><CommandLineIcon /></span>
        </IconButton>
      {/if}
    </Toolbar>
  </div>
{/if}

<style>
  .flowdrop-canvas-toolbar {
    position: absolute;
    top: var(--fd-space-sm);
    /* Clear of an overlaying drawer (inset, set by App) */
    left: calc(var(--fd-space-sm) + var(--fd-canvas-toolbar-inset, 0px));
    z-index: 5;
    max-width: calc(100% - 2 * var(--fd-space-sm));
  }

  /* Narrow: the sidebar overlays the canvas, so start to the right of it. */
  @media (max-width: 768px) {
    .flowdrop-canvas-toolbar {
      left: calc(
        var(--fd-space-sm) +
          max(var(--fd-canvas-left-offset, 0px), var(--fd-canvas-toolbar-inset, 0px))
      );
    }
  }

  .flowdrop-canvas-toolbar__icon {
    display: inline-flex;
    width: 1rem;
    height: 1rem;
  }
</style>

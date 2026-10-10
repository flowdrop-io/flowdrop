<!--
  ConnectPortPicker Component
  The "Connect to…" popover opened from a port's menu: a titled, searchable
  list of the ports on other nodes the port could be wired to (see
  editor/connectCandidates.ts). Positioned like CanvasContextMenu: a manual
  popover in the top layer, placed in viewport coordinates and slid back inside
  the viewport, closing itself on outside pointerdown, wheel (zoom/pan), window
  blur and Escape. Focus goes to the list on open and returns to where it was
  when the picker closes.
  Styled with BEM syntax.
-->

<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { on } from 'svelte/events';
  import PortPickerListbox, { type PortPickerGroup } from './PortPickerListbox.svelte';
  import { m } from '$lib/messages/index.js';
  import type { PortCompatibilityChecker } from '$lib/utils/connections.js';
  import type { ConnectCandidate } from '../editor/connectCandidates.js';

  interface Props {
    /** Name of the port being connected, for the title. */
    portName: string;
    /** Whether the port is an input (the list then offers outputs). */
    fromInput: boolean;
    groups: PortPickerGroup<ConnectCandidate>[];
    checker: PortCompatibilityChecker;
    /** Left edge, in viewport (client) px. */
    x: number;
    /** Top edge, in viewport (client) px. */
    y: number;
    /** A port was picked. The picker does not close itself on a pick: the editor closes it. */
    onselect: (candidate: ConnectCandidate) => void;
    /** Close without picking. */
    onclose: () => void;
  }

  const { portName, fromInput, groups, checker, x, y, onselect, onclose }: Props = $props();

  /** Element that had focus when the picker opened; focus returns there when it closes. */
  let previouslyFocused: HTMLElement | null = null;

  function restoreFocus(): void {
    if (previouslyFocused && previouslyFocused.isConnected) {
      previouslyFocused.focus({ preventScroll: true });
    }
  }

  function closeAndRestore(): void {
    onclose();
    restoreFocus();
  }

  /** Opening, once: remember the focus, show the popover, wire the dismissals a manual popover does not do itself. */
  const open: Attachment<HTMLDivElement> = (el) => {
    previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Optional: jsdom has no Popover API.
    el.showPopover?.();
    // The list asks for focus when it mounts, but a manual popover is not
    // rendered until it is shown, so that request can land too early.
    el.querySelector<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true });

    const removers = [
      on(
        window,
        'pointerdown',
        (event) => {
          if (event.target instanceof Node && el.contains(event.target)) return;
          onclose();
        },
        { capture: true }
      ),
      on(window, 'wheel', () => onclose(), { capture: true, passive: true }),
      on(window, 'blur', () => onclose())
    ];
    return () => removers.forEach((remove) => remove());
  };

  /** Placement, again whenever the requested position or the content changes: slide back inside the viewport. */
  const place: Attachment<HTMLDivElement> = (el) => {
    void groups;
    el.style.left = `${Math.max(0, Math.min(x, window.innerWidth - el.offsetWidth))}px`;
    el.style.top = `${Math.max(0, Math.min(y, window.innerHeight - el.offsetHeight))}px`;
  };

  function handleKeydown(event: KeyboardEvent): void {
    // Keep keys away from the canvas (arrow keys would nudge the node, Backspace would delete it).
    event.stopPropagation();
  }
</script>

<div
  popover="manual"
  class="connect-port-picker nodrag nopan nowheel"
  role="dialog"
  tabindex="-1"
  aria-label={m().connectTo.popoverLabel}
  onkeydown={handleKeydown}
  oncontextmenu={(event) => event.preventDefault()}
  data-testid="connect-port-picker"
  {@attach open}
  {@attach place}
>
  <p class="connect-port-picker__title">{m().connectTo.title({ port: portName })}</p>
  <PortPickerListbox
    {groups}
    {checker}
    idPrefix="connect-to"
    searchLabel={m().connectTo.searchLabel}
    searchPlaceholder={m().connectTo.searchPlaceholder}
    listLabel={fromInput ? m().connectTo.listLabelOutput : m().connectTo.listLabelInput}
    emptyText={m().connectTo.noPorts}
    noMatchesText={m().connectTo.noMatches}
    confirmOnClick
    autofocus
    onConfirm={(option) => {
      onselect(option.value);
      restoreFocus();
    }}
    onCancel={closeAndRestore}
  />
</div>

<style>
  .connect-port-picker {
    /* Reset the popover user-agent styles: it is placed by the script, in the viewport. */
    position: fixed;
    inset: auto;
    margin: 0;
    overflow: visible;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    width: 22rem;
    max-width: calc(100vw - 1rem);
    padding: var(--fd-space-sm);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-menu-radius);
    box-shadow: var(--fd-menu-shadow);
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    outline: none;
  }

  .connect-port-picker__title {
    margin: 0;
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
  }
</style>

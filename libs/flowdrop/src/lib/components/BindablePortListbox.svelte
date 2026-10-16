<!--
  BindablePortListbox — the one place a workflow interface entry picks a port.

  A searchable, grouped listbox over `rankBindablePorts()`: ports nothing is
  using yet first, then the connected or already-published ones. A thin
  wrapper over `PortPickerListbox`, which draws the rows (the shape symbol and
  lane chip a port wears on the canvas) and handles the keyboard; this maps
  each ranked port to its group and badges.

  Shared by the "Add input / Add output" composer (highlight, then a separate
  Add button confirms) and by an existing entry's "Bound port" control (a
  click confirms, like a select). The two differ only in `confirmOnClick`.

  Owns nothing but the mapping. What a confirmed pick means belongs to the caller.
-->

<script lang="ts">
  import PortPickerListbox, {
    type PortPickerBadge,
    type PortPickerOption
  } from '$lib/components/PortPickerListbox.svelte';
  import { m } from '$lib/messages/index.js';
  import type { PortCompatibilityChecker } from '$lib/utils/connections.js';
  import {
    bindablePortKey,
    isFreeBindablePort,
    type RankedBindablePort
  } from '$lib/utils/workflowInterface.js';

  interface Props {
    direction: 'inputs' | 'outputs';
    /** From `rankBindablePorts` — already ordered free-first. */
    candidates: RankedBindablePort[];
    /** The instance's checker — source of each row's shape symbol and lane colour. */
    checker: PortCompatibilityChecker;
    /** Unique per listbox on the page; option ids are derived from it. */
    idPrefix: string;
    /** The port the caller is already bound to, marked as such in the list. */
    currentKey?: string;
    /** A single click confirms (select-like) instead of only highlighting. */
    confirmOnClick?: boolean;
    /** Take keyboard focus when rendered — the list is a modal moment. */
    autofocus?: boolean;
    onHighlight?: (candidate: RankedBindablePort | undefined) => void;
    onConfirm: (candidate: RankedBindablePort) => void;
    onCancel?: () => void;
  }

  const {
    direction,
    candidates,
    checker,
    idPrefix,
    currentKey,
    confirmOnClick = false,
    autofocus = false,
    onHighlight,
    onConfirm,
    onCancel
  }: Props = $props();

  const isInput = $derived(direction === 'inputs');

  function badgesOf(candidate: RankedBindablePort, isCurrent: boolean): PortPickerBadge[] {
    const badges: PortPickerBadge[] = [];
    if (isCurrent) badges.push({ label: m().workflowInterface.bindingCurrent, tone: 'primary' });
    if (candidate.connected) {
      badges.push({ label: m().workflowInterface.composerConnected, tone: 'warning' });
    }
    if (candidate.publishedAs !== undefined) {
      badges.push({
        label: m().workflowInterface.composerPublishedAs({ id: candidate.publishedAs }),
        tone: 'secondary'
      });
    }
    if (candidate.port.required) {
      badges.push({ label: m().workflowInterface.composerRequired, tone: 'outline' });
    }
    return badges;
  }

  function toOption(candidate: RankedBindablePort): PortPickerOption<RankedBindablePort> {
    const key = bindablePortKey(candidate);
    const isCurrent = currentKey !== undefined && currentKey === key;
    return {
      key,
      nodeId: candidate.nodeId,
      nodeLabel: candidate.nodeLabel,
      port: candidate.port,
      badges: badgesOf(candidate, isCurrent),
      dimmed: !isFreeBindablePort(candidate),
      current: isCurrent,
      value: candidate
    };
  }

  const groups = $derived([
    {
      title: m().workflowInterface.composerGroupFree,
      options: candidates.filter(isFreeBindablePort).map(toOption)
    },
    {
      title: m().workflowInterface.composerGroupTaken,
      options: candidates.filter((c) => !isFreeBindablePort(c)).map(toOption)
    }
  ]);
</script>

<PortPickerListbox
  {groups}
  {checker}
  {idPrefix}
  searchLabel={m().workflowInterface.composerSearchLabel}
  searchPlaceholder={m().workflowInterface.composerSearchPlaceholder}
  listLabel={isInput
    ? m().workflowInterface.composerListLabelInput
    : m().workflowInterface.composerListLabelOutput}
  emptyText={m().workflowInterface.composerNoPorts}
  noMatchesText={m().workflowInterface.composerNoMatches}
  {confirmOnClick}
  {autofocus}
  onHighlight={(option) => onHighlight?.(option?.value)}
  onConfirm={(option) => onConfirm(option.value)}
  {onCancel}
/>

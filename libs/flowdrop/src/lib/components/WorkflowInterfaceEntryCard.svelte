<!--
  WorkflowInterfaceEntryCard Component

  One row of `WorkflowInterfaceEditor` — a single `WorkflowInterface` entry:
  identity, its binding, the secondary fields behind a disclosure, the examples
  list on the input side, and the in-words explanation of the entry's
  `resolveInterface` status.

  A component rather than a chunk of the parent's `{#each}` because the
  disclosure is per-row state. Nested in the parent it needed a keyed map and
  hand-written bookkeeping to add, drop and reorder alongside the entries; here
  Svelte gives each row its own instance, its own `fieldsOpen`, and disposal for
  free. The parent keys the `{#each}` by a minted row id, so an instance travels
  with its entry across reorders instead of staying in the slot.

  Owns no entry data. Reads `entry` as a prop and reports every change through
  `onPatch`, which the parent commits to the workflow — so this stays as
  stateless about the workflow as the parent is.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '$lib/components/Button.svelte';
  import IconButton from '$lib/components/IconButton.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/primitives/Select.svelte';
  import Checkbox from '$lib/components/primitives/Checkbox.svelte';
  import Menu, { type MenuEntry } from '$lib/components/primitives/Menu.svelte';
  import BindablePortListbox from '$lib/components/BindablePortListbox.svelte';
  import { getDataTypeColorToken, getPortColorToken } from '$lib/utils/colors.js';
  import InterfaceTag from '$lib/components/InterfaceTag.svelte';
  import { m } from '$lib/messages/index.js';
  import {
    DEFAULT_HISTORY_TURN_LIMIT,
    type PortDataTypeConfig,
    type WorkflowInterfaceEntry
  } from '$lib/types/index.js';
  import type { PortCompatibilityChecker } from '$lib/utils/connections.js';
  import {
    bindablePortKey,
    describeInterfaceEntryStatus,
    historyLimitOf,
    historyLimitPatch,
    isKnownTurn,
    pullEntryFieldsFromPort,
    turnPatch,
    turnsFor,
    type RankedBindablePort,
    type InterfaceIssue,
    type ResolvedInterfaceEntry
  } from '$lib/utils/workflowInterface.js';

  interface Props {
    entry: WorkflowInterfaceEntry;
    direction: 'inputs' | 'outputs';
    status: ResolvedInterfaceEntry | undefined;
    /** Candidate ports for this direction, ranked, for the binding picker. */
    candidates: RankedBindablePort[];
    /** The authoring vocabulary offered by the dataType picker. */
    dataTypes: PortDataTypeConfig[];
    /** The instance's checker — shape symbol and lane colour of the bound port. */
    checker: PortCompatibilityChecker;
    /** The issues this card explains in its footer. */
    footerIssues: InterfaceIssue[];
    /** Input side only: the bound port already receives another edge. */
    alreadyConnected?: boolean;
    /** Label of the node feeding that competing edge, when there is one. */
    conflictingSource?: string;
    /** Input side only: the id of another input that already has this entry's (deprecated) turn. */
    turnTakenBy?: string;
    /**
     * Opens the workflow's Playground settings, where the chat is set up now.
     * Linked from the deprecated `turn` notice; omit when the host has no
     * Playground settings (the notice then says where without a link).
     */
    onOpenPlaygroundSettings?: () => void;
    /**
     * Offer the deprecated Chat turn selector (and the history limit).
     * Only for a workflow without Playground settings (a server before
     * FlowDrop 2.7.0), where `turn` is still the only way to set the chat
     * up. With settings, a stored `turn` shows as a deprecated chip instead.
     */
    turnSelector?: boolean;
    isFirst: boolean;
    isLast: boolean;
    onPatch: (patch: Partial<WorkflowInterfaceEntry>) => void;
    onMove: (delta: -1 | 1) => void;
    onRemove: () => void;
  }

  const {
    entry,
    direction,
    status,
    candidates,
    dataTypes,
    checker,
    footerIssues,
    alreadyConnected = false,
    conflictingSource,
    turnTakenBy,
    onOpenPlaygroundSettings,
    turnSelector = false,
    isFirst,
    isLast,
    onPatch,
    onMove,
    onRemove
  }: Props = $props();

  /**
   * Whether the secondary fields are shown under the row: seeded once from
   * whether the entry wants attention, then the author's (the row's "More
   * options" menu item). Deriving it from `status` would
   * shut the fields on every edit and drop the focused input's keystrokes.
   */
  // The seed is meant to be read once.
  // svelte-ignore state_referenced_locally
  let fieldsOpen = $state(status?.status === 'type-mismatch' || turnTakenBy !== undefined);

  /** Statuses still explained in the footer (the rest render inline or as the dot). */
  const FOOTER_STATUSES = new Set(['unbound', 'dangling', 'hidden', 'over-bound']);

  const isInput = $derived(direction === 'inputs');

  /**
   * Options for the dataType select: the configured vocabulary, plus the
   * entry's current value when it isn't in it (a host-custom or legacy type) —
   * a select must never silently rewrite a stored value it cannot list.
   */
  function dataTypeOptions(current: string): Array<{ id: string; name: string }> {
    const options = dataTypes.map((dt) => ({ id: dt.id, name: dt.name }));
    if (current && !dataTypes.some((dt) => dt.id === current || dt.aliases?.includes(current))) {
      options.push({ id: current, name: current });
    }
    return options;
  }

  /** The entry's deprecated `turn`, as a label. */
  const turnLabel = $derived(
    entry.turn === undefined
      ? undefined
      : isKnownTurn(entry.turn)
        ? m().workflowInterface.turns[entry.turn]
        : entry.turn
  );

  /**
   * Chat turn options for this direction (the selector, `turnSelector` only).
   * A stored value outside them — one from a newer server, or a value of the
   * other direction — is listed too, so the select shows what is stored and
   * never silently rewrites it.
   */
  const turnOptions = $derived.by(() => {
    const options: Array<{ value: string; label: string }> = turnsFor(
      isInput ? 'input' : 'output'
    ).map((value) => ({ value, label: m().workflowInterface.turns[value] }));
    const current = entry.turn;
    if (current !== undefined && !options.some((option) => option.value === current)) {
      options.push({
        value: current,
        label: isKnownTurn(current)
          ? m().workflowInterface.turns[current]
          : m().workflowInterface.turnUnknown({ value: current })
      });
    }
    return options;
  });

  /** The current turn's one-line description, when it is a known value. */
  const turnDescription = $derived(
    entry.turn !== undefined && isKnownTurn(entry.turn)
      ? m().workflowInterface.turnDescriptions[entry.turn]
      : undefined
  );

  function setTurn(value: string): void {
    // Only values the select offers reach here: the direction's vocabulary,
    // '' for none, or the stored value itself (a no-op patch).
    onPatch(turnPatch(entry, value));
  }

  /**
   * The row's overflow menu: reorder, the secondary fields, remove. Reorder and
   * remove are never on screen at rest; the menu is the one way in, and it is a
   * real menu (arrow keys, type-ahead, Escape), so the keyboard reaches all of it.
   */
  const rowMenu = $derived<MenuEntry[]>([
    {
      label: m().workflowInterface.menuMoveUp,
      icon: 'heroicons:chevron-up',
      disabled: isFirst,
      testId: 'wf-entry-move-up',
      onselect: () => onMove(-1)
    },
    {
      label: m().workflowInterface.menuMoveDown,
      icon: 'heroicons:chevron-down',
      disabled: isLast,
      testId: 'wf-entry-move-down',
      onselect: () => onMove(1)
    },
    { type: 'separator' },
    {
      label: m().workflowInterface.moreOptions,
      checked: fieldsOpen,
      testId: 'wf-entry-more-options',
      onselect: () => (fieldsOpen = !fieldsOpen)
    },
    { type: 'separator' },
    {
      label: m().workflowInterface.menuRemove,
      icon: 'heroicons:trash',
      testId: 'wf-entry-remove',
      onselect: onRemove
    }
  ]);

  /** Whether the binding picker is unfolded under the "Bound port" control. */
  let pickerOpen = $state(false);

  /** The entry's current single binding, as a picker key (`undefined` = unbound). */
  const currentKey = $derived(entry.bindings[0] ? bindablePortKey(entry.bindings[0]) : undefined);

  /** The bound port, when the single binding resolves. */
  const boundTarget = $derived(status?.targets[0]);

  /** The bound port's own dataType, when the single binding resolves. */
  const boundPortType = $derived(boundTarget?.port.dataType);

  /**
   * The picker's candidates, with this entry's own port counted as free: it
   * is "published" — by the very entry choosing — and greying it out as taken
   * would tell the author their current choice is unavailable.
   */
  const ownCandidates = $derived(
    candidates.map((candidate) =>
      candidate.publishedAs === entry.id ? { ...candidate, publishedAs: undefined } : candidate
    )
  );

  function bindTo(candidate: RankedBindablePort): void {
    const patch: Partial<WorkflowInterfaceEntry> = {
      bindings: [{ nodeId: candidate.nodeId, portId: candidate.port.id }]
    };
    // Convenience default: prefill an empty dataType from the picked port's own
    // type. The field stays freely editable afterward — this only saves the
    // common case of typing out what the port already declares.
    if (!entry.dataType) patch.dataType = candidate.port.dataType;
    onPatch(patch);
    pickerOpen = false;
  }

  function unbind(): void {
    onPatch({ bindings: [] });
    pickerOpen = false;
  }

  /**
   * Write one example slot back, dropping empties and collapsing an empty
   * list to `undefined` so an untouched entry stores no `examples` key.
   */
  function patchExample(exampleIndex: number, raw: string): void {
    const next = [...(entry.examples ?? [])];
    if (raw === '') next.splice(exampleIndex, 1);
    else next[exampleIndex] = parseDefaultValue(raw);
    onPatch({ examples: next.length > 0 ? next : undefined });
  }

  function addExample(): void {
    onPatch({ examples: [...(entry.examples ?? []), ''] });
  }

  function removeExample(exampleIndex: number): void {
    const next = (entry.examples ?? []).filter((_, i) => i !== exampleIndex);
    onPatch({ examples: next.length > 0 ? next : undefined });
  }

  function parseDefaultValue(raw: string): unknown {
    if (raw === '') return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function formatDefaultValue(value: unknown): string {
    if (value === undefined) return '';
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
</script>

<li
  class="wf-interface__entry"
  class:wf-interface__entry--error={status?.status &&
    status.status !== 'ok' &&
    status.status !== 'unbound'}
>
  <!-- One compact line: id → bound port, then the overflow menu. The id is a
       field you type into in place; the binding opens the shared port listbox. -->
  <div class="wf-interface__line">
    <!-- The entry as its canvas tag: swatch, the id typed in place, and the tip
         that points the way the canvas flows. -->
    <InterfaceTag
      id={entry.id}
      class="wf-interface__tag"
      color={getDataTypeColorToken(checker, entry.dataType)}
      mismatch={status?.status === 'type-mismatch'}
    >
      <input
        type="text"
        class="wf-interface__id"
        aria-label={m().workflowInterface.idLabel}
        title={m().workflowInterface.idLabel}
        spellcheck="false"
        value={entry.id}
        onchange={(e) => {
          // An input needs an id: an emptied field goes back to the old one
          // (else the chat binding would lose the input for good).
          if (e.currentTarget.value.trim() === '') e.currentTarget.value = entry.id;
          else onPatch({ id: e.currentTarget.value });
        }}
      />
    </InterfaceTag>
    <!-- The bound port, said back the way the canvas says it: node › port and
         its type. -->
    <button
      type="button"
      class="wf-interface__binding"
      class:wf-interface__binding--open={pickerOpen}
      class:wf-interface__binding--invalid={isInput && alreadyConnected}
      class:wf-interface__binding--empty={!entry.bindings[0]}
      aria-haspopup="listbox"
      aria-expanded={pickerOpen}
      title={m().workflowInterface.bindingChange}
      onclick={() => (pickerOpen = !pickerOpen)}
    >
      <span class="wf-interface__sr">{m().workflowInterface.bindingLabel}:</span>
      {#if boundTarget}
        <span
          class="wf-interface__binding-dot"
          style="--wf-binding-dot: {getPortColorToken(checker, boundTarget.port)}"
          aria-hidden="true"
        ></span>
        <span class="wf-interface__binding-path">
          <span class="wf-interface__binding-node">
            {boundTarget.node.data?.label ?? boundTarget.node.id}
          </span>
          <Icon icon="heroicons:chevron-right" />
          <span class="wf-interface__binding-port">{boundTarget.port.name}</span>
        </span>
        <span class="wf-interface__binding-type" title={boundTarget.port.dataType}>
          {checker.getDataTypeConfig(boundTarget.port.dataType)?.name ?? boundTarget.port.dataType}
        </span>
      {:else if entry.bindings[0]}
        <span class="wf-interface__binding-path wf-interface__binding-path--dangling">
          {m().workflowInterface.bindingDangling({
            nodeId: entry.bindings[0].nodeId,
            portId: entry.bindings[0].portId
          })}
        </span>
      {:else}
        <span class="wf-interface__binding-placeholder">
          {m().workflowInterface.bindingUnbound}
        </span>
      {/if}
    </button>
    {#if turnLabel !== undefined}
      <span
        class="wf-interface__turn-chip"
        class:wf-interface__turn-chip--deprecated={!turnSelector}
      >
        {turnLabel}
      </span>
    {/if}
    <Menu
      size="sm"
      align="end"
      class="wf-interface__menu"
      label={m().workflowInterface.entryActions({ id: entry.id })}
      testId="wf-entry-menu"
      items={rowMenu}
    />
  </div>
  {#if isInput && alreadyConnected}
    <span class="wf-interface__inline wf-interface__inline--error">
      {m().workflowInterface.alreadyConnectedInline({ source: conflictingSource ?? '' })}
    </span>
  {/if}

  {#if pickerOpen}
    <div class="wf-interface__picker" role="group" aria-label={m().workflowInterface.bindingChoose}>
      <BindablePortListbox
        {direction}
        candidates={ownCandidates}
        {checker}
        idPrefix="wf-binding-option-{direction}-{entry.id}"
        {currentKey}
        confirmOnClick
        autofocus
        onConfirm={bindTo}
        onCancel={() => (pickerOpen = false)}
      />
      <div class="wf-interface__picker-actions">
        {#if entry.bindings[0]}
          <Button variant="ghost" size="sm" onclick={unbind}>
            <Icon icon="heroicons:link-slash" />
            {m().workflowInterface.bindingUnbind}
          </Button>
        {/if}
        <span class="wf-interface__picker-spacer"></span>
        <Button variant="ghost" size="sm" onclick={() => (pickerOpen = false)}>
          {m().workflowInterface.composerCancel}
        </Button>
      </div>
    </div>
  {/if}

  <!-- Always rendered, hidden while closed: what the author typed survives a close. -->
  <div class="wf-interface__more" hidden={!fieldsOpen}>
    <div class="wf-interface__more-body">
      {#if turnSelector}
        <div class="wf-interface__row">
          <label class="wf-interface__field">
            <span class="wf-interface__label">{m().workflowInterface.turnLabel}</span>
            <Select
              size="sm"
              invalid={turnTakenBy !== undefined}
              value={entry.turn ?? ''}
              onchange={(e) => setTurn(e.currentTarget.value)}
            >
              <option value="">{m().workflowInterface.turnNone}</option>
              {#each turnOptions as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </Select>
            {#if turnTakenBy !== undefined}
              <span class="wf-interface__inline wf-interface__inline--warning">
                {m().workflowInterface.turnTakenInline({ id: turnTakenBy })}
              </span>
            {:else if turnDescription}
              <span class="wf-interface__hint">{turnDescription}</span>
            {/if}
          </label>
          {#if entry.turn === 'history'}
            <label class="wf-interface__field">
              <span class="wf-interface__label">{m().workflowInterface.historyLimitLabel}</span>
              <Input
                size="sm"
                type="number"
                min="1"
                step="1"
                value={historyLimitOf(entry) ?? ''}
                placeholder={m().workflowInterface.historyLimitPlaceholder({
                  limit: DEFAULT_HISTORY_TURN_LIMIT
                })}
                onchange={(e) => onPatch(historyLimitPatch(entry, e.currentTarget.value))}
              />
            </label>
          {/if}
        </div>
      {:else if turnLabel !== undefined}
        <div class="wf-interface__turn-deprecated" role="note">
          <span>
            {m().workflowInterface.turnDeprecated({
              turn: turnLabel,
              limit: entry.turn === 'history' ? historyLimitOf(entry) : undefined
            })}
            {#if turnTakenBy !== undefined}
              {m().workflowInterface.turnTakenInline({ id: turnTakenBy })}
            {/if}
          </span>
          {#if onOpenPlaygroundSettings}
            <button type="button" class="wf-interface__quickfix" onclick={onOpenPlaygroundSettings}>
              {m().workflowInterface.turnOpenPlayground}
            </button>
          {/if}
        </div>
      {/if}

      {#if boundTarget}
        <div class="wf-interface__pull-row">
          <Button
            variant="ghost"
            size="sm"
            class="wf-interface__pull"
            title={m().workflowInterface.pullFromPortTitle}
            onclick={() => onPatch(pullEntryFieldsFromPort(boundTarget.port))}
          >
            <Icon icon="heroicons:arrow-down-tray" />
            {m().workflowInterface.pullFromPort}
          </Button>
        </div>
      {/if}
      <div class="wf-interface__row">
        <label class="wf-interface__field">
          <span class="wf-interface__label">{m().workflowInterface.nameLabel}</span>
          <Input
            size="sm"
            type="text"
            value={entry.name ?? ''}
            placeholder={m().workflowInterface.namePlaceholder}
            onchange={(e) => onPatch({ name: e.currentTarget.value || undefined })}
          />
        </label>
        <label class="wf-interface__field">
          <span class="wf-interface__label">{m().workflowInterface.dataTypeLabel}</span>
          <Select
            size="sm"
            invalid={status?.status === 'type-mismatch'}
            value={entry.dataType}
            onchange={(e) => onPatch({ dataType: e.currentTarget.value })}
          >
            {#if !entry.dataType}
              <option value="" disabled selected>
                {m().workflowInterface.dataTypePlaceholder}
              </option>
            {/if}
            {#each dataTypeOptions(entry.dataType) as option (option.id)}
              <option value={option.id}>{option.name}</option>
            {/each}
          </Select>
          {#if status?.status === 'type-mismatch' && boundPortType}
            <span class="wf-interface__inline wf-interface__inline--warning">
              {m().workflowInterface.typeMismatchInline({ portType: boundPortType ?? '' })}
              <button
                type="button"
                class="wf-interface__quickfix"
                onclick={() => onPatch({ dataType: boundPortType ?? entry.dataType })}
              >
                {m().workflowInterface.useMatchPortType}
              </button>
            </span>
          {/if}
        </label>
      </div>

      <div class="wf-interface__row">
        <label class="wf-interface__field wf-interface__field--wide">
          <span class="wf-interface__label">{m().workflowInterface.descriptionLabel}</span>
          <Input
            size="sm"
            type="text"
            value={entry.description ?? ''}
            onchange={(e) => onPatch({ description: e.currentTarget.value || undefined })}
          />
        </label>
      </div>

      <div class="wf-interface__row">
        <label class="wf-interface__field">
          <span class="wf-interface__label">{m().workflowInterface.defaultValueLabel}</span>
          <Input
            size="sm"
            type="text"
            value={formatDefaultValue(entry.defaultValue)}
            onchange={(e) => onPatch({ defaultValue: parseDefaultValue(e.currentTarget.value) })}
          />
        </label>
        {#if isInput}
          <Checkbox
            class="wf-interface__field wf-interface__field--checkbox"
            checked={entry.required ?? false}
            label={m().workflowInterface.requiredLabel}
            onchange={(on) => onPatch({ required: on || undefined })}
          />
        {/if}
      </div>

      {#if isInput}
        <div class="wf-interface__examples">
          <span class="wf-interface__label">
            {m().workflowInterface.examplesLabel}
          </span>
          {#each entry.examples ?? [] as example, exampleIndex (exampleIndex)}
            <div class="wf-interface__example-row">
              <Input
                size="sm"
                type="text"
                value={formatDefaultValue(example)}
                onchange={(e) => patchExample(exampleIndex, e.currentTarget.value)}
              />
              <IconButton
                size="sm"
                class="wf-interface__example-remove"
                onclick={() => removeExample(exampleIndex)}
                ariaLabel={m().workflowInterface.removeExample}
              >
                <Icon icon="heroicons:x-mark" />
              </IconButton>
            </div>
          {/each}
          <Button variant="ghost" size="sm" class="wf-interface__example-add" onclick={addExample}>
            <Icon icon="heroicons:plus" />
            {m().workflowInterface.addExample}
          </Button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Every non-ok resolveInterface status renders in words somewhere in this
         card — the obligation that makes this surface canonical. `ok` says
         nothing: neutral is the good state, and the row's error colour already
         marks the bad ones. Type-mismatch and already-connected render inline
         next to their own field; the rest are explained here. -->
  {#if status && FOOTER_STATUSES.has(status.status)}
    <p class="wf-interface__status wf-interface__status--{status.status}">
      {describeInterfaceEntryStatus(status)}
    </p>
  {/if}
  {#each footerIssues as issue (issue.code)}
    <p class="wf-interface__status wf-interface__status--{issue.severity}">
      {issue.message}
    </p>
  {/each}

  {#if entry.meta && Object.keys(entry.meta).length > 0}
    <details class="wf-interface__meta">
      <summary>{m().workflowInterface.metaDisclosure}</summary>
      <pre>{JSON.stringify(entry.meta, null, 2)}</pre>
    </details>
  {/if}
</li>

<style>
  /*
    One interface entry: a flat row. No card, no border, no shadow: rows are
    separated by space, and a tint on hover/focus says which one you are on.
    The secondary fields open underneath it, indented, still without a box.
    Nothing here declares a colour that isn't a design token.
  */
  .wf-interface__entry {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-3xs) 0;
  }

  .wf-interface__line {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    min-width: 0;
    min-height: var(--fd-control-md);
    padding-right: var(--fd-space-3xs);
    border-radius: var(--fd-control-radius);
    transition: background-color var(--fd-transition-fast);
  }

  .wf-interface__line:hover,
  .wf-interface__line:focus-within {
    background-color: var(--fd-muted);
  }

  /* The id: mono, typed into in place. Looks like text until you reach for it. */
  /* Sized to the id (capped), so a short id leaves its room to the bound port. */
  .wf-interface__line :global(.wf-interface__tag) {
    --fd-iface-tag-height: var(--fd-control-md);
    --fd-iface-tag-id-size: var(--fd-text-xs);
    min-width: 0;
  }

  .wf-interface__id {
    flex: 0 1 auto;
    field-sizing: content;
    min-width: 4ch;
    max-width: 7.5rem;
    box-sizing: border-box;
    height: 100%;
    padding: 0;
    border: 0;
    background-color: transparent;
    color: var(--fd-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    text-overflow: ellipsis;
  }

  /* Screen readers get the "Bound port:" the row no longer shows. */
  .wf-interface__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .wf-interface__line :global(.wf-interface__menu) {
    flex: none;
    margin-left: auto;
  }

  /* The bound port, said back the way the canvas says it: a flat button. */
  .wf-interface__binding {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    flex: 1;
    min-width: 0;
    height: var(--fd-control-md);
    padding: 0 var(--fd-space-xs);
    border: 1px solid transparent;
    border-radius: var(--fd-control-radius);
    background-color: transparent;
    color: var(--fd-foreground);
    font: inherit;
    font-size: var(--fd-text-xs);
    text-align: left;
    cursor: pointer;
    transition:
      border-color var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .wf-interface__binding:hover {
    border-color: var(--fd-border);
  }

  .wf-interface__binding:focus-visible,
  .wf-interface__binding--open {
    outline: none;
    border-color: var(--fd-border-strong);
    background-color: var(--fd-background);
  }

  .wf-interface__binding--invalid {
    border-color: var(--fd-error);
  }

  .wf-interface__binding-path {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .wf-interface__binding-path :global(svg) {
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .wf-interface__binding > :global(.flowdrop-badge--outline) {
    flex: none;
  }

  /* Same row anatomy as the inspector's Ports tab: lane dot · node › port · mono lane name. */
  .wf-interface__binding-dot {
    flex: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: var(--fd-radius-full);
    background-color: var(--wf-binding-dot);
  }

  .wf-interface__binding-type {
    flex: none;
    max-width: 12ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__binding-node {
    min-width: 3ch;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--fd-muted-foreground);
  }

  .wf-interface__binding-port {
    font-weight: 600;
  }

  .wf-interface__binding-path--dangling {
    color: var(--fd-error);
    font-family: var(--fd-font-mono);
  }

  .wf-interface__binding-placeholder {
    flex: 1;
    color: var(--fd-muted-foreground);
  }

  /* The unfolded picker: the shared listbox plus its own unbind/cancel row. */
  .wf-interface__picker {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs) 0;
  }

  .wf-interface__picker-actions {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .wf-interface__picker-spacer {
    flex: 1;
  }

  .wf-interface__pull-row {
    display: flex;
  }

  .wf-interface__pull-row :global(.wf-interface__pull) {
    padding-inline: var(--fd-space-xs);
    color: var(--fd-primary);
  }

  .wf-interface__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-sm);
  }

  .wf-interface__field {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    flex: 1 1 8rem;
    min-width: 0;
  }

  .wf-interface__field--wide {
    flex: 1 1 100%;
  }

  .wf-interface__more :global(.wf-interface__field--checkbox) {
    flex: 0 0 auto;
    align-self: flex-end;
    min-height: var(--fd-control-md);
  }

  /* Same voice as the settings form's field labels. */
  .wf-interface__label {
    font-size: var(--fd-field-label-size);
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.01em;
    color: var(--fd-foreground);
  }

  /* Field-anchored feedback: one short line under the field it belongs to. */
  .wf-interface__inline {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--fd-space-xs);
    padding-left: var(--fd-space-xs);
    font-size: var(--fd-text-xs);
    line-height: 1.4;
  }

  .wf-interface__hint {
    font-size: var(--fd-text-xs);
    line-height: 1.4;
    color: var(--fd-muted-foreground);
  }

  /* The entry's chat turn, said at rest at the end of its row. */
  .wf-interface__turn-chip {
    flex: none;
    padding: 0 var(--fd-space-xs);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-full);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    line-height: 1.5;
  }

  /* A deprecated `turn` reads as a warning, not as a choice. */
  .wf-interface__turn-chip--deprecated {
    border-color: color-mix(in srgb, var(--fd-warning) 45%, var(--fd-border));
    color: var(--fd-warning);
    text-decoration: line-through;
  }

  .wf-interface__turn-deprecated {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--fd-space-xs);
    font-size: var(--fd-text-xs);
    line-height: 1.4;
    color: var(--fd-warning);
  }

  .wf-interface__inline--warning {
    color: var(--fd-warning);
  }

  .wf-interface__inline--error {
    color: var(--fd-error);
  }

  .wf-interface__quickfix {
    padding: 0 var(--fd-space-xs);
    border: 1px solid currentColor;
    border-radius: var(--fd-radius-full);
    background-color: transparent;
    color: inherit;
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    line-height: 1.4;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  .wf-interface__quickfix:hover {
    background-color: color-mix(in srgb, currentColor 12%, transparent);
  }

  /* The secondary fields, under the row and indented to the id: space, not a box. */
  .wf-interface__more[hidden] {
    display: none;
  }

  .wf-interface__more {
    padding: var(--fd-space-xs) var(--fd-space-xs) var(--fd-space-sm);
  }

  .wf-interface__more-body {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
  }

  .wf-interface__examples {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .wf-interface__example-row {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .wf-interface__example-row :global(.flowdrop-input) {
    flex: 1;
  }

  .wf-interface__example-row :global(.wf-interface__example-remove) {
    flex-shrink: 0;
  }

  .wf-interface__example-row :global(.wf-interface__example-remove:hover) {
    color: var(--fd-error);
  }

  .wf-interface__examples :global(.wf-interface__example-add) {
    align-self: flex-start;
    padding-inline: var(--fd-space-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__examples :global(.wf-interface__example-add:hover) {
    color: var(--fd-foreground);
  }

  /* Status lines: one muted 12px line under the row, aligned with the id text,
     cut off with an ellipsis (the full text is the tooltip). Only a real error
     takes the error colour; a draft that is merely unfinished stays quiet. */
  .wf-interface__status {
    margin: 0;
    padding-left: calc(var(--fd-space-xs) + 1px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--fd-text-xs);
    line-height: 1.5;
    color: var(--fd-muted-foreground);
  }

  .wf-interface__status--error,
  .wf-interface__status--dangling,
  .wf-interface__status--hidden,
  .wf-interface__status--over-bound {
    color: var(--fd-error);
  }

  .wf-interface__status--warning,
  .wf-interface__status--type-mismatch {
    color: var(--fd-warning);
  }

  .wf-interface__meta {
    padding-left: var(--fd-space-xs);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__meta > summary {
    cursor: pointer;
    user-select: none;
  }

  .wf-interface__meta > summary:hover {
    color: var(--fd-foreground);
  }

  .wf-interface__meta pre {
    margin: var(--fd-space-xs) 0 0;
    padding: var(--fd-space-xs);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    line-height: 1.5;
    overflow-x: auto;
  }
</style>

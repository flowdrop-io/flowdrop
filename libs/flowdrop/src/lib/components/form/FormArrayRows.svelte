<!--
  FormArrayRows — an array of small objects (up to two scalar fields) as a row
  list: column headers once, one row per item (a hover grip, a control per
  field, a ⋯ menu), nothing boxed.

  Reorder by dragging the grip, with Alt+Up / Alt+Down on a row's control, or
  from the ⋯ menu. When the array is the target of an `x-item-ref` field, one row
  carries a "default" badge, "Make default" sits in the ⋯ menu, and a line under
  the list says what an empty, wired or dangling reference means.

  Used by FormArray; it owns no data, every change goes through the callbacks.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Input from '../Input.svelte';
  import Select from '../primitives/Select.svelte';
  import Switch from '../primitives/Switch.svelte';
  import Menu, { type MenuEntry } from '../primitives/Menu.svelte';
  import { humanizeKey } from './humanizeKey.js';
  import type { FieldSchema } from './types.js';
  import { itemRefStatus, matchItemIndex, type ItemRef } from '$lib/utils/itemRef.js';
  import { m } from '$lib/messages/index.js';
  import { tick } from 'svelte';

  interface Props {
    id: string;
    items: unknown[];
    /** The item's scalar properties, in display order (at most two). */
    columns: Array<[string, FieldSchema]>;
    disabled?: boolean;
    canRemove: boolean;
    onUpdate: (index: number, key: string, value: unknown) => void;
    onMove: (from: number, to: number) => void;
    onRemove: (index: number) => void;
    /** The reference an item can be marked by (see utils/itemRef.ts). */
    itemRef?: ItemRef;
  }

  let {
    id,
    items,
    columns,
    disabled = false,
    canRemove,
    onUpdate,
    onMove,
    onRemove,
    itemRef
  }: Props = $props();

  const t = $derived(m().form.array);

  const markedIndex = $derived(itemRef ? matchItemIndex(items, columns[0][0], itemRef.value) : -1);
  const status = $derived(
    itemRef ? itemRefStatus(items, columns[0][0], itemRef.value, itemRef.wired) : undefined
  );

  const label = (key: string, schema: FieldSchema): string => schema.title ?? humanizeKey(key);

  function menuFor(index: number): MenuEntry[] {
    const entries: MenuEntry[] = [];
    if (itemRef) {
      entries.push({
        label: t.makeDefault,
        icon: 'mdi:star-outline',
        testId: 'array-row-make-default',
        disabled: itemRef.wired || markedIndex === index,
        onselect: () => {
          const name = (items[index] as Record<string, unknown> | undefined)?.[columns[0][0]];
          itemRef.onChange(typeof name === 'string' ? name : '');
        }
      });
      entries.push({ type: 'separator' });
    }
    entries.push(
      {
        label: t.moveUp,
        icon: 'mdi:arrow-up',
        disabled: index === 0,
        onselect: () => onMove(index, index - 1)
      },
      {
        label: t.moveDown,
        icon: 'mdi:arrow-down',
        disabled: index === items.length - 1,
        onselect: () => onMove(index, index + 1)
      },
      { type: 'separator' },
      {
        label: t.delete,
        icon: 'mdi:trash-can-outline',
        testId: 'array-row-delete',
        disabled: !canRemove,
        onselect: () => onRemove(index)
      }
    );
    return entries;
  }

  let root: HTMLDivElement | undefined = $state();

  async function onKeydown(event: KeyboardEvent, index: number): Promise<void> {
    if (disabled || !event.altKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const to = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= items.length) return;
    onMove(index, to);
    await tick();
    root
      ?.querySelectorAll<HTMLElement>(
        `[data-array-row="${to}"] input, [data-array-row="${to}"] select`
      )
      [Number((event.target as HTMLElement).dataset.col ?? 0)]?.focus();
  }

  let dragging = $state<number | null>(null);
  let dropTarget = $state<number | null>(null);
</script>

<div class="form-array-rows" bind:this={root} style:--form-array-cols={columns.length}>
  {#if items.length > 0}
    <div class="form-array-rows__list">
      <div class="form-array-rows__head" aria-hidden="true">
        <span></span>
        {#each columns as [key, schema] (key)}
          <span>{label(key, schema)}</span>
        {/each}
        <span></span>
      </div>

      {#each items as item, index (index)}
        {@const row = (item ?? {}) as Record<string, unknown>}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="form-array-rows__row"
          class:form-array-rows__row--drop={dropTarget === index && dragging !== index}
          class:form-array-rows__row--dragging={dragging === index}
          data-array-row={index}
          ondragover={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            dropTarget = index;
          }}
          ondrop={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            onMove(dragging, index);
            dragging = dropTarget = null;
          }}
        >
          <span
            class="form-array-rows__grip"
            role="presentation"
            draggable={!disabled}
            ondragstart={(e) => {
              dragging = index;
              e.dataTransfer?.setData('text/plain', String(index));
              const rowEl = (e.currentTarget as HTMLElement).parentElement;
              if (rowEl && e.dataTransfer) e.dataTransfer.setDragImage(rowEl, 0, 0);
            }}
            ondragend={() => (dragging = dropTarget = null)}
          >
            <Icon icon="heroicons:ellipsis-vertical" />
          </span>

          {#each columns as [key, schema], col (key)}
            {@const cellId = `${id}-${index}-${key}`}
            {@const value = row[key]}
            <span class="form-array-rows__cell">
              {#if schema.enum}
                <Select
                  id={cellId}
                  aria-label={label(key, schema)}
                  data-col={col}
                  value={String(value ?? '')}
                  onchange={(e) => onUpdate(index, key, e.currentTarget.value)}
                  {disabled}
                >
                  {#each schema.enum as option (option)}
                    <option value={String(option)}>{String(option)}</option>
                  {/each}
                </Select>
              {:else if schema.type === 'boolean'}
                <Switch
                  id={cellId}
                  label={label(key, schema)}
                  checked={Boolean(value)}
                  onchange={(checked) => onUpdate(index, key, checked)}
                  {disabled}
                />
              {:else if schema.type === 'number' || schema.type === 'integer'}
                <Input
                  id={cellId}
                  data-col={col}
                  type="number"
                  class="flowdrop-input--numeric form-array-rows__input form-array-rows__mono"
                  aria-label={label(key, schema)}
                  value={value as number}
                  placeholder={schema.placeholder ?? label(key, schema)}
                  min={schema.minimum}
                  max={schema.maximum}
                  oninput={(e) => {
                    const v = e.currentTarget.value;
                    onUpdate(index, key, v === '' ? '' : Number(v));
                  }}
                  onkeydown={(e) => onKeydown(e, index)}
                  {disabled}
                />
              {:else}
                <Input
                  id={cellId}
                  data-col={col}
                  type="text"
                  aria-label={label(key, schema)}
                  value={String(value ?? '')}
                  placeholder={schema.placeholder ?? label(key, schema)}
                  class={[
                    'form-array-rows__input',
                    itemRef && col === 0 ? 'form-array-rows__marked-input' : '',
                    col > 0 ? 'form-array-rows__mono' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  oninput={(e) => onUpdate(index, key, e.currentTarget.value)}
                  onkeydown={(e) => onKeydown(e, index)}
                  {disabled}
                />
              {/if}
              {#if itemRef && col === 0 && markedIndex === index && !itemRef.wired}
                <span class="form-array-rows__badge" data-testid="array-row-default-badge">
                  {t.defaultBadge}
                </span>
              {/if}
            </span>
          {/each}

          <span class="form-array-rows__more">
            <Menu
              size="sm"
              align="end"
              label={t.rowActions({ n: index + 1 })}
              testId={`array-row-menu-${index}`}
              items={menuFor(index)}
            />
          </span>
        </div>
      {/each}
    </div>
  {/if}

  {#if status === 'empty' && items.length > 0}
    <p class="form-array-rows__note" data-testid="array-default-note">{t.noDefault}</p>
  {:else if status === 'wired'}
    <p class="form-array-rows__note" data-testid="array-default-note">{t.defaultFromInput}</p>
  {:else if status === 'dangling'}
    <p
      class="form-array-rows__note form-array-rows__note--warn"
      role="status"
      data-testid="array-default-dangling"
    >
      <Icon icon="heroicons:exclamation-triangle-20-solid" />
      <span>{t.defaultDangling({ name: itemRef?.value ?? '' })}</span>
    </p>
  {/if}
</div>

<style>
  /* One list surface: a hairline container, a header row and rows divided by
     hairlines. Cells read as text; the input chrome shows on hover and focus. */
  .form-array-rows {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .form-array-rows__list {
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-control-radius);
    overflow: hidden;
  }

  .form-array-rows__head,
  .form-array-rows__row {
    display: grid;
    grid-template-columns:
      var(--fd-space-xl) repeat(var(--form-array-cols), minmax(0, 1fr))
      var(--fd-control-md);
    align-items: center;
    column-gap: var(--fd-space-xs);
    padding: 0 var(--fd-space-xs);
  }

  .form-array-rows__head {
    height: var(--fd-control-md);
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-subtle);
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
  }

  /* Cell text lines up with the row's input text (input padding + border). */
  .form-array-rows__head span:not(:first-child) {
    padding-left: calc(var(--fd-space-xs) + 1px);
  }

  .form-array-rows__row {
    position: relative;
    height: calc(var(--fd-control-lg) + var(--fd-space-xs));
    border-bottom: 1px solid var(--fd-border-muted);
  }

  .form-array-rows__row:last-child {
    border-bottom: 0;
  }

  .form-array-rows__row--dragging {
    opacity: 0.5;
  }

  .form-array-rows__row--drop {
    outline: 2px solid var(--fd-primary);
    outline-offset: -2px;
  }

  .form-array-rows__grip {
    display: inline-flex;
    color: var(--fd-muted-foreground);
    cursor: grab;
    opacity: 0;
    transition: opacity var(--fd-transition-fast);
  }

  .form-array-rows__row:hover .form-array-rows__grip,
  .form-array-rows__row:focus-within .form-array-rows__grip {
    opacity: 1;
  }

  @media (hover: none) {
    .form-array-rows__grip {
      opacity: 1;
    }
  }

  .form-array-rows__cell {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .form-array-rows__cell > :global(:first-child) {
    flex: 1;
    min-width: 0;
  }

  /* Inline edit: no chrome until hover or focus. */
  .form-array-rows :global(.form-array-rows__input),
  .form-array-rows :global(select) {
    height: var(--fd-control-md);
    padding: 0 var(--fd-space-xs);
    border-color: transparent;
    background-color: transparent;
    box-shadow: none;
    font-size: var(--fd-text-sm);
  }

  .form-array-rows :global(.form-array-rows__input:hover:not(:disabled)),
  .form-array-rows :global(select:hover:not(:disabled)) {
    border-color: var(--fd-border);
  }

  .form-array-rows :global(.form-array-rows__input:focus) {
    background-color: var(--fd-background);
  }

  .form-array-rows :global(.form-array-rows__mono) {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
  }

  /* Room for the badge inside the marked row's first input. */
  .form-array-rows :global(.form-array-rows__marked-input) {
    padding-right: 4rem;
  }

  .form-array-rows__badge {
    position: absolute;
    right: var(--fd-space-xs);
    padding: 0 var(--fd-space-xs);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-accent-muted);
    color: var(--fd-accent);
    font-size: var(--fd-text-2xs);
    font-weight: 500;
    line-height: 1.5;
    pointer-events: none;
  }

  /* Visible quietly, stronger on hover and focus. */
  .form-array-rows__more {
    opacity: 0.55;
    transition: opacity var(--fd-transition-fast);
  }

  .form-array-rows__row:hover .form-array-rows__more,
  .form-array-rows__row:focus-within .form-array-rows__more {
    opacity: 1;
  }

  .form-array-rows__note {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin: 0;
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
  }

  .form-array-rows__note--warn {
    padding: var(--fd-space-xs) var(--fd-space-sm);
    border-radius: var(--fd-control-radius);
    background-color: var(--fd-warning-muted);
    color: var(--fd-warning-hover);
  }
</style>

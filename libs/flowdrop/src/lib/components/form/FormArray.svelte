<!--
  FormArray Component
  Dynamic array field that allows adding, removing, and reordering items
  Generates sub-forms for each item based on the schema's items property
  
  Features:
  - Add/remove items with animated transitions
  - Supports simple types (string, number, boolean) and complex types (objects)
  - Recursively uses FormField for item rendering
  - Drag handle for future reordering support
  - Collapsible items for complex object arrays
  - Empty state with helpful prompt
  
  Accessibility:
  - Proper ARIA labels for add/remove buttons
  - Keyboard navigation support
  - Screen reader friendly item descriptions
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Input from '../Input.svelte';
  import Select from '../primitives/Select.svelte';
  import Switch from '../primitives/Switch.svelte';
  import Textarea from '../Textarea.svelte';
  import IconButton from '../primitives/IconButton.svelte';
  import Button from '../primitives/Button.svelte';
  import { humanizeKey } from './humanizeKey.js';
  import type { FieldSchema } from './types.js';
  import FormArrayRows from './FormArrayRows.svelte';
  import { refAfterDelete, refAfterRename, type ItemRef } from '$lib/utils/itemRef.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** Field identifier */
    id: string;
    /** Current array value */
    value: unknown[];
    /** Schema for array items */
    itemSchema: FieldSchema;
    /** Minimum number of items required */
    minItems?: number;
    /** Maximum number of items allowed */
    maxItems?: number;
    /**
     * Per-instance label for the add button (e.g. "Add Header" derived from
     * the item schema title). Falls back to the global `messages.form.array.add`.
     */
    addLabel?: string;
    /** Whether the field is disabled */
    disabled?: boolean;
    /**
     * Fixed by the node (schema `readOnly`): the items render as a static list,
     * not as disabled inputs, and nothing can be added.
     */
    readOnly?: boolean;
    /** A scalar field that names one of the items (`x-item-ref`), shown as a row mark. */
    itemRef?: ItemRef;
    /** Callback when value changes */
    onChange: (value: unknown[]) => void;
  }

  let {
    id,
    value = [],
    itemSchema,
    minItems = 0,
    maxItems,
    addLabel,
    disabled = false,
    readOnly = false,
    itemRef,
    onChange
  }: Props = $props();

  // Hoist the array branch — every {#each} iteration would otherwise re-walk
  // `m().form.array.*` for ~6 keys per item. One getter call instead of N×6.
  const t = $derived(m().form.array);
  const resolvedAddLabel = $derived(addLabel ?? t.add);

  /**
   * Ensure value is always an array
   */
  const items = $derived(Array.isArray(value) ? value : []);

  /** "2 items · Min: 1 · Max: 5" on one muted line */
  const infoText = $derived(
    [
      t.count({ n: items.length }),
      minItems > 0 ? t.min({ n: minItems }) : '',
      maxItems !== undefined ? t.max({ n: maxItems }) : ''
    ]
      .filter(Boolean)
      .join(' · ')
  );

  /**
   * Check if we can add more items
   */
  const canAddItem = $derived(maxItems === undefined || items.length < maxItems);

  /**
   * Check if we can remove items
   */
  const canRemoveItem = $derived(items.length > minItems);

  /**
   * Determine if items are simple (primitive) or complex (objects)
   */
  const isSimpleType = $derived(
    itemSchema.type === 'string' ||
      itemSchema.type === 'number' ||
      itemSchema.type === 'integer' ||
      itemSchema.type === 'boolean'
  );

  const isScalar = (schema: FieldSchema): boolean =>
    (schema.type === 'string' ||
      schema.type === 'number' ||
      schema.type === 'integer' ||
      schema.type === 'boolean') &&
    schema.format !== 'multiline';

  /**
   * Items with one or two scalar fields render as a row list (FormArrayRows).
   * Anything bigger falls back to a collapsible sub-form per item.
   */
  const rowColumns = $derived.by((): Array<[string, FieldSchema]> | undefined => {
    if (itemSchema.type !== 'object' || !itemSchema.properties) return undefined;
    const entries = Object.entries(itemSchema.properties) as Array<[string, FieldSchema]>;
    if (entries.length < 1 || entries.length > 2) return undefined;
    return entries.every(([, schema]) => isScalar(schema)) ? entries : undefined;
  });

  /** The ref only applies to a row list, keyed by its first column. */
  const rowRef = $derived(rowColumns ? itemRef : undefined);

  /** Row marked by a reference whose name was emptied while typing (see refAfterRename). */
  let pendingMark: number | null = null;

  /**
   * Get the default value for a new item based on schema
   */
  function getDefaultValue(): unknown {
    if (itemSchema.default !== undefined) {
      return itemSchema.default;
    }

    switch (itemSchema.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      case 'object':
        // Create default object from properties
        if (itemSchema.properties) {
          const defaultObj: Record<string, unknown> = {};
          Object.entries(itemSchema.properties).forEach(([key, propSchema]) => {
            if (propSchema.default !== undefined) {
              defaultObj[key] = propSchema.default;
            } else {
              defaultObj[key] = getDefaultForType(propSchema.type);
            }
          });
          return defaultObj;
        }
        return {};
      case 'array':
        return [];
      default:
        return '';
    }
  }

  /**
   * Get default value for a specific type
   */
  function getDefaultForType(type: string | undefined): unknown {
    switch (type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      case 'object':
        return {};
      case 'array':
        return [];
      default:
        return '';
    }
  }

  /**
   * Add a new item to the array
   */
  function addItem(): void {
    if (!canAddItem || disabled) return;
    const newValue = [...items, getDefaultValue()];
    onChange(newValue);
  }

  /**
   * Remove an item at the specified index
   */
  function removeItem(index: number): void {
    if (!canRemoveItem || disabled) return;
    const newValue = items.filter((_, i) => i !== index);
    if (rowRef && rowColumns) {
      const next = refAfterDelete(items, rowColumns[0][0], rowRef.value, index);
      if (next !== rowRef.value) rowRef.onChange(next);
    }
    pendingMark = null;
    onChange(newValue);
  }

  /**
   * Update an item at the specified index
   */
  function updateItem(index: number, newItemValue: unknown): void {
    const newValue = items.map((item, i) => (i === index ? newItemValue : item));
    onChange(newValue);
  }

  /**
   * Update a property of an object item
   */
  function updateObjectProperty(index: number, propertyKey: string, propertyValue: unknown): void {
    const currentItem = items[index] as Record<string, unknown>;
    if (rowRef && rowColumns && propertyKey === rowColumns[0][0]) {
      const edit = refAfterRename(
        items,
        propertyKey,
        rowRef.value,
        index,
        String(propertyValue ?? ''),
        pendingMark
      );
      pendingMark = edit.pending;
      if (edit.ref !== rowRef.value) rowRef.onChange(edit.ref);
    }
    const updatedItem = { ...currentItem, [propertyKey]: propertyValue };
    updateItem(index, updatedItem);
  }

  /** Move the item at `from` to position `to`. */
  function moveItem(from: number, to: number): void {
    if (disabled || from === to || to < 0 || to >= items.length) return;
    const newValue = [...items];
    const [moved] = newValue.splice(from, 1);
    newValue.splice(to, 0, moved);
    pendingMark = null;
    onChange(newValue);
  }

  /**
   * Move an item up in the array
   */
  function moveItemUp(index: number): void {
    if (index === 0 || disabled) return;
    const newValue = [...items];
    [newValue[index - 1], newValue[index]] = [newValue[index], newValue[index - 1]];
    onChange(newValue);
  }

  /**
   * Move an item down in the array
   */
  function moveItemDown(index: number): void {
    if (index === items.length - 1 || disabled) return;
    const newValue = [...items];
    [newValue[index], newValue[index + 1]] = [newValue[index + 1], newValue[index]];
    onChange(newValue);
  }

  /**
   * Get item label for display
   */
  function getItemLabel(index: number, item: unknown): string {
    if (isSimpleType) {
      const itemStr = String(item);
      return itemStr.length > 30
        ? `${itemStr.substring(0, 30)}...`
        : itemStr || t.itemLabel({ n: index + 1 });
    }

    // For objects, try to find a name/label/title property
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      const labelKey = Object.keys(obj).find((k) =>
        ['name', 'label', 'title', 'id'].includes(k.toLowerCase())
      );
      if (labelKey && obj[labelKey]) {
        return String(obj[labelKey]);
      }
    }

    return t.itemLabel({ n: index + 1 });
  }

  /**
   * Track collapsed state for complex items
   */
  let collapsedItems = $state<Set<number>>(new Set());

  /**
   * Toggle collapsed state for an item
   */
  function toggleCollapse(index: number): void {
    const newCollapsed = new Set(collapsedItems);
    if (newCollapsed.has(index)) {
      newCollapsed.delete(index);
    } else {
      newCollapsed.add(index);
    }
    collapsedItems = newCollapsed;
  }

  /**
   * Check if an item is collapsed
   */
  function isCollapsed(index: number): boolean {
    return collapsedItems.has(index);
  }
</script>

{#snippet actions(index: number)}
  <div class="form-array__actions">
    <IconButton
      size="sm"
      onclick={() => moveItemUp(index)}
      disabled={index === 0 || disabled}
      ariaLabel={t.moveItemUp({ n: index + 1 })}
      title={t.moveUp}
    >
      <Icon icon="heroicons:arrow-up" />
    </IconButton>
    <IconButton
      size="sm"
      onclick={() => moveItemDown(index)}
      disabled={index === items.length - 1 || disabled}
      ariaLabel={t.moveItemDown({ n: index + 1 })}
      title={t.moveDown}
    >
      <Icon icon="heroicons:arrow-down" />
    </IconButton>
    <IconButton
      size="sm"
      class="form-array__delete"
      onclick={() => removeItem(index)}
      disabled={!canRemoveItem || disabled}
      ariaLabel={t.deleteItem({ n: index + 1 })}
      title={t.delete}
    >
      <Icon icon="heroicons:trash" />
    </IconButton>
  </div>
{/snippet}

<div class="form-array" class:form-array--disabled={disabled}>
  {#if readOnly}
    <!-- Fixed by the node: a static list, not disabled inputs -->
    {#if items.length > 0}
      <ul class="form-array__static">
        {#each items as item, index (index)}
          {@const parts =
            typeof item === 'object' && item !== null
              ? Object.values(item as Record<string, unknown>).map(String)
              : [String(item ?? '')]}
          <li>
            <span>{parts[0]}</span>
            {#if parts[1] !== undefined}<code>{parts[1]}</code>{/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="form-array__empty">{t.empty}</p>
    {/if}
  {:else if rowColumns}
    <FormArrayRows
      {id}
      {items}
      columns={rowColumns}
      {disabled}
      canRemove={canRemoveItem}
      onUpdate={updateObjectProperty}
      onMove={moveItem}
      onRemove={removeItem}
      itemRef={rowRef}
    />
    {#if items.length === 0}
      <p class="form-array__empty">{t.empty}</p>
    {/if}
  {:else if items.length > 0}
    <!-- Array Items -->
    <div class="form-array__items">
      {#each items as item, index (index)}
        <div
          class="form-array__item"
          class:form-array__item--simple={isSimpleType}
          class:form-array__item--complex={!isSimpleType}
        >
          {#if !isSimpleType}
            <!-- Item header: chevron + label, actions on hover/focus -->
            <div class="form-array__item-header">
              <button
                type="button"
                class="form-array__item-toggle"
                onclick={() => toggleCollapse(index)}
                aria-expanded={!isCollapsed(index)}
                aria-label={isCollapsed(index) ? t.expandItem : t.collapseItem}
              >
                <Icon
                  icon={isCollapsed(index) ? 'heroicons:chevron-right' : 'heroicons:chevron-down'}
                  class="form-array__toggle-icon"
                />
                <span class="form-array__item-label">{getItemLabel(index, item)}</span>
              </button>
              {@render actions(index)}
            </div>
          {/if}

          <!-- Item Content -->
          <div
            class="form-array__item-content"
            class:form-array__item-content--collapsed={!isSimpleType && isCollapsed(index)}
          >
            {#if isSimpleType}
              <!-- Simple type: render inline input -->
              {#if itemSchema.type === 'string'}
                {#if itemSchema.format === 'multiline'}
                  <Textarea
                    value={String(item ?? '')}
                    placeholder={itemSchema.placeholder ?? ''}
                    rows={3}
                    oninput={(e) => updateItem(index, e.currentTarget.value)}
                    {disabled}
                  />
                {:else}
                  <Input
                    type="text"
                    value={String(item ?? '')}
                    placeholder={itemSchema.placeholder ?? ''}
                    oninput={(e) => updateItem(index, e.currentTarget.value)}
                    {disabled}
                  />
                {/if}
              {:else if itemSchema.type === 'number' || itemSchema.type === 'integer'}
                <Input
                  type="number"
                  class="flowdrop-input--numeric"
                  value={item as number}
                  placeholder={itemSchema.placeholder ?? ''}
                  min={itemSchema.minimum}
                  max={itemSchema.maximum}
                  oninput={(e) => {
                    const val = e.currentTarget.value;
                    updateItem(index, val === '' ? '' : Number(val));
                  }}
                  {disabled}
                />
              {:else if itemSchema.type === 'boolean'}
                <Switch
                  checked={Boolean(item)}
                  label={item ? t.yes : t.no}
                  onchange={(checked) => updateItem(index, checked)}
                  {disabled}
                />
              {:else if itemSchema.enum}
                <!-- Enum: render select -->
                <Select
                  value={String(item ?? '')}
                  onchange={(e) => updateItem(index, e.currentTarget.value)}
                  {disabled}
                >
                  {#each itemSchema.enum as option (option)}
                    <option value={String(option)}>{String(option)}</option>
                  {/each}
                </Select>
              {:else}
                <!-- Fallback to text -->
                <Input
                  type="text"
                  value={String(item ?? '')}
                  placeholder={itemSchema.placeholder ?? ''}
                  oninput={(e) => updateItem(index, e.currentTarget.value)}
                  {disabled}
                />
              {/if}
            {:else if itemSchema.type === 'object' && itemSchema.properties}
              <!-- Complex type: render sub-form for object properties -->
              {#if !isCollapsed(index)}
                <div class="form-array__subform">
                  {#each Object.entries(itemSchema.properties) as [propKey, propSchema], propIndex (propKey)}
                    {@const propValue = (item as Record<string, unknown>)?.[propKey]}
                    {@const isRequired = itemSchema.required?.includes(propKey) ?? false}
                    {@const propFieldSchema = propSchema as FieldSchema}

                    <div
                      class="form-array__subform-field"
                      style="animation-delay: {propIndex * 20}ms"
                    >
                      <label class="form-array__subform-label" for="{id}-{index}-{propKey}">
                        <span class="form-array__subform-label-text">
                          {propFieldSchema.title ?? humanizeKey(propKey)}
                        </span>
                        {#if isRequired}
                          <span class="form-array__required">*</span>
                        {/if}
                      </label>

                      <div class="form-array__subform-input">
                        {#if propFieldSchema.enum}
                          <Select
                            id="{id}-{index}-{propKey}"
                            value={String(propValue ?? '')}
                            onchange={(e) =>
                              updateObjectProperty(index, propKey, e.currentTarget.value)}
                            {disabled}
                          >
                            {#each propFieldSchema.enum as option (option)}
                              <option value={String(option)}>{String(option)}</option>
                            {/each}
                          </Select>
                        {:else if propFieldSchema.type === 'string' && propFieldSchema.format === 'multiline'}
                          <Textarea
                            id="{id}-{index}-{propKey}"
                            value={String(propValue ?? '')}
                            placeholder={propFieldSchema.placeholder ?? ''}
                            rows={3}
                            oninput={(e) =>
                              updateObjectProperty(index, propKey, e.currentTarget.value)}
                            {disabled}
                          />
                        {:else if propFieldSchema.type === 'string'}
                          <Input
                            id="{id}-{index}-{propKey}"
                            type="text"
                            value={String(propValue ?? '')}
                            placeholder={propFieldSchema.placeholder ?? ''}
                            oninput={(e) =>
                              updateObjectProperty(index, propKey, e.currentTarget.value)}
                            {disabled}
                          />
                        {:else if propFieldSchema.type === 'number' || propFieldSchema.type === 'integer'}
                          <Input
                            id="{id}-{index}-{propKey}"
                            type="number"
                            class="flowdrop-input--numeric"
                            value={propValue as number}
                            placeholder={propFieldSchema.placeholder ?? ''}
                            min={propFieldSchema.minimum}
                            max={propFieldSchema.maximum}
                            oninput={(e) => {
                              const val = e.currentTarget.value;
                              updateObjectProperty(index, propKey, val === '' ? '' : Number(val));
                            }}
                            {disabled}
                          />
                        {:else if propFieldSchema.type === 'boolean'}
                          <Switch
                            id="{id}-{index}-{propKey}"
                            checked={Boolean(propValue)}
                            label={propValue ? t.yes : t.no}
                            onchange={(checked) => updateObjectProperty(index, propKey, checked)}
                            {disabled}
                          />
                        {:else}
                          <Input
                            id="{id}-{index}-{propKey}"
                            type="text"
                            value={String(propValue ?? '')}
                            placeholder={propFieldSchema.placeholder ?? ''}
                            oninput={(e) =>
                              updateObjectProperty(index, propKey, e.currentTarget.value)}
                            {disabled}
                          />
                        {/if}
                      </div>

                      {#if propFieldSchema.description && propFieldSchema.title}
                        <p class="form-array__subform-description">
                          {propFieldSchema.description}
                        </p>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            {:else}
              <!-- Unknown complex type -->
              <div class="form-array__unsupported">
                <p>
                  {t.unsupported({ type: String(itemSchema.type ?? '') })}
                </p>
              </div>
            {/if}
          </div>
          {#if isSimpleType}
            {@render actions(index)}
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <!-- Empty State: one quiet line -->
    <p class="form-array__empty">{t.empty}</p>
  {/if}

  {#if !readOnly}
    <!-- Add: a quiet text button -->
    <div class="form-array__footer">
      <Button
        variant="ghost"
        size="sm"
        class="form-array__add"
        onclick={addItem}
        disabled={!canAddItem || disabled}
        ariaLabel={resolvedAddLabel}
      >
        {#snippet leadingIcon()}<Icon icon="heroicons:plus" />{/snippet}
        {resolvedAddLabel}
      </Button>

      <!-- Item count and limits, one muted line -->
      {#if minItems > 0 || maxItems !== undefined}
        <span class="form-array__info">{infoText}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* A quiet list: items are separated by space and a hairline, never boxed.
     Item actions are ghost icon buttons shown on hover / focus-within (and
     always on touch). */

  .form-array {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .form-array--disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .form-array__items {
    display: flex;
    flex-direction: column;
  }

  .form-array__item {
    display: flex;
    flex-direction: column;
    padding: var(--fd-space-xs) 0;
    border-top: 1px solid var(--fd-border);
    animation: itemFadeIn 0.2s ease-out both;
  }

  .form-array__item:first-child {
    border-top: 0;
    padding-top: 0;
  }

  @keyframes itemFadeIn {
    from {
      opacity: 0;
    }
  }

  .form-array__item--simple {
    flex-direction: row;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .form-array__item--simple .form-array__item-content {
    flex: 1;
    min-width: 0;
  }

  /* ----- header (complex items): chevron + label, no band ----- */

  .form-array__item-header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .form-array__item-toggle {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    flex: 1;
    min-width: 0;
    padding: var(--fd-space-3xs) 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    text-align: left;
    border-radius: var(--fd-control-radius);
  }

  .form-array__item-toggle :global(svg) {
    flex: none;
    width: 1rem;
    height: 1rem;
    color: var(--fd-muted-foreground);
  }

  .form-array__item-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--fd-text-body);
    font-weight: 500;
    color: var(--fd-foreground);
  }

  /* ----- actions: hover / focus-within, always on touch ----- */

  .form-array__actions {
    display: flex;
    align-items: center;
    gap: 0;
    margin-left: auto;
    opacity: 0;
    transition: opacity var(--fd-transition-fast);
  }

  .form-array__item:hover .form-array__actions,
  .form-array__item:focus-within .form-array__actions {
    opacity: 1;
  }

  @media (hover: none) {
    .form-array__actions {
      opacity: 1;
    }
  }

  /* Delete is a plain ghost button until it is hovered or focused. */
  .form-array__actions :global(.form-array__delete:hover:not(:disabled)),
  .form-array__actions :global(.form-array__delete:focus-visible) {
    background-color: var(--fd-error-muted);
    color: var(--fd-error);
  }

  .form-array__item-content {
    transition: all 0.2s ease-out;
  }

  .form-array__item--complex .form-array__item-content {
    /* One left edge: the sub-form lines up with the item label. */
    padding: var(--fd-space-xs) 0;
  }

  .form-array__item-content--collapsed {
    height: 0;
    overflow: hidden;
    padding: 0 !important;
  }

  /* ----- sub-form (object items) ----- */

  .form-array__subform {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
  }

  .form-array__subform-field {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
  }

  .form-array__subform-label {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    font-size: var(--fd-text-meta);
    font-weight: 500;
    color: var(--fd-muted-foreground);
  }

  .form-array__subform-label-text {
    line-height: 1.4;
  }

  .form-array__required {
    color: var(--fd-error);
    font-weight: 500;
  }

  .form-array__subform-description {
    margin: 0;
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
    line-height: 1.4;
  }

  /* ----- read-only items: a static list ----- */

  .form-array__static {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .form-array__static li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--fd-space-md);
    min-height: var(--fd-control-md);
    font-size: var(--fd-text-body);
    color: var(--fd-foreground);
  }

  .form-array__static code {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
  }

  /* ----- empty, add, info ----- */

  .form-array__empty {
    margin: 0;
    font-size: var(--fd-text-body);
    color: var(--fd-muted-foreground);
  }

  .form-array__footer {
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
    /* Optical alignment: the ghost button's padding sits outside the text edge. */
    margin-left: calc(-1 * var(--fd-space-xs));
  }

  .form-array__info {
    font-size: var(--fd-text-meta);
    color: var(--fd-muted-foreground);
  }

  .form-array__unsupported {
    padding: var(--fd-space-md);
    background-color: var(--fd-warning-muted);
    border-radius: var(--fd-control-radius);
    color: var(--fd-warning-hover);
    font-size: var(--fd-text-xs);
  }

  .form-array__unsupported p {
    margin: 0;
  }
</style>

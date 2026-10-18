<!--
  @component
  A titled group of fields, drawn from a `Group` in a node's UI schema. By default it folds open and closed;
  with `collapsible: false` it is a plain fieldset with a legend.

  **Use it for** splitting a long config form into sections.
  **Not for** the tabs of the inspector (those are `NodeInspector`).
-->

<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import type { UISchemaGroup } from '$lib/types/uischema.js';
  import Icon from '@iconify/svelte';

  interface Props {
    /** The UISchema Group element to render */
    group: UISchemaGroup;
    /** Slot content for the group's child elements */
    children: Snippet;
  }

  let { group, children }: Props = $props();

  const isCollapsible = $derived(group.collapsible !== false);
  // `defaultOpen` seeds the fold once; after that the user's toggle owns it. The host rebuilds the
  // UI schema on every value change, so a reactive `open` would snap the group shut on each keystroke.
  let isOpen = $state(untrack(() => group.defaultOpen !== false));
</script>

{#if isCollapsible}
  <details class="flowdrop-details form-fieldset" bind:open={isOpen}>
    <summary class="flowdrop-details__summary form-fieldset__summary">
      <span class="form-fieldset__label">
        <span class="form-fieldset__title">{group.label}</span>
      </span>
      <span class="form-fieldset__meta">
        {#if group.description}
          <span class="form-fieldset__badge">{group.description}</span>
        {/if}
        <Icon icon="heroicons:chevron-right" class="form-fieldset__chevron" />
      </span>
    </summary>
    <div class="flowdrop-details__content form-fieldset__content">
      <div class="form-fieldset__fields">
        {@render children()}
      </div>
    </div>
  </details>
{:else}
  <fieldset class="form-fieldset form-fieldset--static">
    <legend class="form-fieldset__legend">{group.label}</legend>
    {#if group.description}
      <p class="form-fieldset__description">{group.description}</p>
    {/if}
    <div class="form-fieldset__fields">
      {@render children()}
    </div>
  </fieldset>
{/if}

<style>
  /* ============================================
	   COLLAPSIBLE FIELDSET: a flat section.
	   A 13px semibold heading over its fields; sections after the first are
	   set off by a 1px rule and space, never a card, band or shadow. Extends
	   .flowdrop-details from base.css; scoped to .form-fieldset so other
	   .flowdrop-details consumers (e.g. NodeSidebar) are unaffected.
	   ============================================ */

  details.form-fieldset {
    border: 0;
    border-radius: 0;
    background: none;
    box-shadow: none;
  }

  details.form-fieldset[open] {
    box-shadow: none;
  }

  details.form-fieldset:not(:first-child) {
    padding-top: var(--fd-space-xl);
    border-top: 1px solid var(--fd-border-muted);
  }

  .form-fieldset__summary {
    gap: var(--fd-space-sm);
    padding: 0 0 var(--fd-space-md);
    background: none;
    border: 0;
    border-radius: 0;
    cursor: pointer;
  }

  .form-fieldset__summary:hover {
    background: none;
  }

  .form-fieldset__label {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  .form-fieldset__meta {
    display: flex;
    align-items: center;
    gap: var(--fd-space-sm);
    flex-shrink: 0;
  }

  .form-fieldset__title {
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .form-fieldset :global(.form-fieldset__chevron) {
    width: 1rem;
    height: 1rem;
    color: var(--fd-muted-foreground);
    transition: transform var(--fd-transition-fast);
    flex-shrink: 0;
  }

  /* Rotate chevron when details is open */
  details.form-fieldset[open] :global(.form-fieldset__chevron) {
    transform: rotate(90deg);
  }

  .form-fieldset__badge {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .form-fieldset__content {
    padding: 0;
    background: none;
  }

  .form-fieldset__fields {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xl);
  }

  /* ============================================
	   STATIC FIELDSET (non-collapsible)
	   ============================================ */

  .form-fieldset--static {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }

  .form-fieldset--static:not(:first-child) {
    padding-top: var(--fd-space-xl);
    border-top: 1px solid var(--fd-border-muted);
  }

  .form-fieldset__legend {
    float: left;
    width: 100%;
    padding: 0 0 var(--fd-space-md);
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .form-fieldset__legend + * {
    clear: both;
  }

  .form-fieldset__description {
    margin: 0 0 var(--fd-space-md) 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    line-height: 1.4;
  }
</style>

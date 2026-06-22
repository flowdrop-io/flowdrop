<!--
  FormFieldset Component
  Renders a UISchema Group element as a collapsible or static fieldset.

  Two rendering modes:
  - Collapsible (default): Uses HTML5 <details>/<summary> with .flowdrop-details CSS
  - Static (collapsible: false): Uses a styled <fieldset> with <legend>

  Features:
  - HTML5 <details> for native accessible collapse behavior
  - Reuses existing .flowdrop-details CSS pattern from base.css
  - Optional description text below the group title
  - Chevron rotation animation on open/close
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
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
  const isDefaultOpen = $derived(group.defaultOpen !== false);
  const headerIcon = $derived(group.icon ?? 'heroicons:adjustments-horizontal');
</script>

{#if isCollapsible}
  <details class="flowdrop-details form-fieldset" open={isDefaultOpen}>
    <summary class="flowdrop-details__summary form-fieldset__summary">
      <span class="form-fieldset__label">
        <Icon icon={headerIcon} class="form-fieldset__icon" />
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
	   COLLAPSIBLE FIELDSET — filled header bar
	   Extends .flowdrop-details from base.css, overriding the summary
	   into a distinct header bar (subtle fill + bottom divider when open)
	   over a card body. Scoped to .form-fieldset so other .flowdrop-details
	   consumers (e.g. NodeSidebar) are unaffected.
	   ============================================ */

  .form-fieldset__summary {
    gap: var(--fd-space-sm);
    padding: var(--fd-space-md) var(--fd-space-xl);
    background: var(--fd-subtle);
    border-radius: 0;
  }

  .form-fieldset__summary:hover {
    background-color: var(--fd-muted);
  }

  /* Divider between header bar and body — only while expanded */
  details.form-fieldset[open] > .form-fieldset__summary {
    border-bottom: 1px solid var(--fd-border-muted);
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

  .form-fieldset :global(.form-fieldset__icon) {
    width: 1rem;
    height: 1rem;
    color: var(--fd-muted-foreground);
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
    padding: var(--fd-space-xl);
  }

  .form-fieldset__fields {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xl);
  }

  /* ============================================
	   STATIC FIELDSET (non-collapsible)
	   ============================================ */

  .form-fieldset--static {
    border: 1px solid var(--fd-border-muted);
    border-radius: var(--fd-control-radius);
    padding: var(--fd-space-xl);
    margin: 0;
  }

  .form-fieldset__legend {
    padding: 0 var(--fd-space-xs);
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .form-fieldset__description {
    margin: 0 0 var(--fd-space-md) 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    line-height: 1.4;
  }
</style>

<!--
  AttributionChip Component

  Compact mono-style badge surfacing pipeline-run and workflow attribution
  on playground messages and interrupts. Visual style derives from the
  workflow badge that used to live in InterruptBubble (.interrupt-bubble__workflow
  introduced in commit 14432710) and is now shared across MessageBubble,
  MessageStream, and InterruptBubble.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';

  interface Props {
    /** Display text inside the chip. */
    label: string;
    /** Optional iconify icon id to render before the label. */
    icon?: string;
    /** Hover tooltip (e.g. the full id when the label is a friendly name). */
    title?: string;
    /** Variant hook for future styling differentiation. */
    variant?: 'run' | 'workflow';
  }

  let { label, icon, title, variant = 'run' }: Props = $props();
</script>

<span
  class="attribution-chip"
  class:attribution-chip--run={variant === 'run'}
  class:attribution-chip--workflow={variant === 'workflow'}
  {title}
>
  {#if icon}
    <Icon {icon} class="attribution-chip__icon" />
  {/if}
  <span class="attribution-chip__label">{label}</span>
</span>

<style>
  .attribution-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: 0 var(--fd-space-3xs);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    line-height: 1.4;
    white-space: nowrap;
    max-width: 16rem;
  }

  .attribution-chip__label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .attribution-chip :global(.attribution-chip__icon) {
    flex-shrink: 0;
    font-size: 0.875em;
    opacity: 0.7;
  }
</style>

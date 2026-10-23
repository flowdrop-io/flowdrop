<!--
  @component
  ToolbarSeparator: a thin divider between groups inside a `Toolbar`.

  Pass the same `orientation` as the toolbar. The line is drawn across that axis.

  Exported from `@flowdrop/flowdrop/ui`.
-->

<script lang="ts">
  interface Props {
    /** Axis of the toolbar this sits in; the line is drawn across it */
    orientation?: 'horizontal' | 'vertical';
  }

  let { orientation = 'horizontal' }: Props = $props();
</script>

<span
  class="flowdrop-ui-toolbar-separator flowdrop-ui-toolbar-separator--{orientation}"
  role="separator"
  aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
></span>

<style>
  .flowdrop-ui-toolbar-separator {
    flex: none;
    background-color: var(--fd-border);
  }

  .flowdrop-ui-toolbar-separator--horizontal {
    align-self: stretch;
    width: 1px;
    margin: var(--fd-space-3xs) var(--fd-space-3xs);
  }

  .flowdrop-ui-toolbar-separator--vertical {
    height: 1px;
    margin: var(--fd-space-3xs) var(--fd-space-3xs);
  }
</style>

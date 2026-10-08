<!--
  ToolbarSeparator — a thin divider between Toolbar groups. Orientation is
  inherited from the surrounding Toolbar via CSS (`aria-orientation` is the
  perpendicular axis of the toolbar, so it is set explicitly here).

  @internal Not exported from any package entry; not public API yet.
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

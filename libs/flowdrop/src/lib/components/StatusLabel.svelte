<!--
  @component
  StatusLabel: a small text label for a status.

  Exported for host apps; the editor uses `StatusPill` instead. It only styles the text you
  pass, so get the word from your own status mapping.

  **Use it for** a plain status word in your own list.
  **Not for** a status with an icon or colour; use `StatusPill`.
-->

<script lang="ts">
  interface Props {
    /** The text to show. */
    label: string;
    /** Extra classes on the root. */
    class?: string;
  }

  let props: Props = $props();
</script>

<span class="status-label {props.class || ''}">
  {props.label}
</span>

<style>
  .status-label {
    font-size: 16px;
    font-weight: 600;
    color: #000000;
    white-space: nowrap;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
    letter-spacing: 0.025em;
    display: flex;
    align-items: center;
  }
</style>

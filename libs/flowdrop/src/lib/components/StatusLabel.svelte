<!--
  Status Label Component
  Dedicated component for displaying status labels with consistent styling
-->

<script lang="ts">
  interface Props {
    label: string;
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

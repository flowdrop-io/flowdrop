<!--
  @component
  LoadingSpinner: a spinner with a short text under it.

  **Use it for** a block of the page that is still loading, such as the node sidebar.
  **Not for** a button that is busy; use `Button` with `loading`.
-->

<script lang="ts">
  interface Props {
    /** Spinner size. */
    size?: 'xs' | 'sm' | 'md' | 'lg';
    /** Text under the spinner. Defaults to "Loading...". */
    text?: string;
    /** Set to false to show the spinner alone. */
    showText?: boolean;
  }

  let props: Props = $props();

  // Default values
  let size = $derived(props.size || 'md');
  let text = $derived(props.text || 'Loading...');
  let showText = $derived(props.showText !== false);
</script>

<div class="flowdrop-loading">
  <div class="flowdrop-spinner flowdrop-spinner--{size}"></div>
  {#if showText}
    <p class="flowdrop-text--xs flowdrop-text--gray">{text}</p>
  {/if}
</div>

<style>
  .flowdrop-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
</style>

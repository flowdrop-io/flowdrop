<!--
  Loading Spinner Component
  Reusable loading indicator with customizable size and text
-->

<script lang="ts">
  interface Props {
    size?: "xs" | "sm" | "md" | "lg";
    text?: string;
    showText?: boolean;
  }

  let props: Props = $props();
  
  // Default values
  let size = $derived(props.size || "md");
  let text = $derived(props.text || "Loading...");
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
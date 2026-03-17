<!--
  InterruptPreviewRenderer: Renders a single interrupt prompt component.
  Used inside the interrupt-preview.astro iframe page.
-->
<script lang="ts">
  import {
    ConfirmationPrompt,
    ChoicePrompt,
    TextInputPrompt,
    FormPrompt,
  } from '@flowdrop/flowdrop/playground';
  import '@flowdrop/flowdrop/styles';

  let {
    type,
    data
  }: {
    type: string;
    data: Record<string, unknown>;
  } = $props();

  // No-op handlers for preview mode
  const noop = () => {};
  const noopSubmit = (_v: unknown) => {};
</script>

<div class="interrupt-preview-wrapper">
  {#if type === 'confirmation'}
    <ConfirmationPrompt
      config={data.config}
      isResolved={false}
      isSubmitting={false}
      onConfirm={noop}
      onDecline={noop}
    />
  {:else if type === 'choice'}
    <ChoicePrompt
      config={data.config}
      isResolved={false}
      isSubmitting={false}
      onSubmit={noopSubmit}
    />
  {:else if type === 'text_input'}
    <TextInputPrompt
      config={data.config}
      isResolved={false}
      isSubmitting={false}
      onSubmit={noopSubmit}
    />
  {:else if type === 'form'}
    <FormPrompt
      config={data.config}
      isResolved={false}
      isSubmitting={false}
      onSubmit={noopSubmit}
    />
  {:else}
    <p>Unknown interrupt type: {type}</p>
  {/if}
</div>

<style>
  .interrupt-preview-wrapper {
    padding: 1.5rem;
    max-width: 600px;
    margin: 0 auto;
  }
</style>

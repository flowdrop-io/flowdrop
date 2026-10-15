<script module lang="ts">
  // The strip runs the full width of the canvas, so the stories give it a canvas-wide frame.
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import ConsoleStrip from './ConsoleStrip.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Console strip',
    render: template,
    component: ConsoleStrip,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { controls: 'console-panel', onToggle: fn() }
  });
</script>

{#snippet template(args: Record<string, unknown>)}
  <div class="strip-frame">
    <ConsoleStrip
      open={args.open as boolean | undefined}
      controls={args.controls as string}
      label={args.label as string | undefined}
      onToggle={args.onToggle as () => void}
    />
  </div>
{/snippet}

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story:
          'Closed: a slim bar along the bottom edge of the canvas. Click it, or press the backtick key, to open the Console.'
      }
    }
  }}
/>

<Story
  name="Open"
  args={{ open: true }}
  parameters={{
    docs: {
      description: {
        story:
          'Open: the strip becomes the header of the Console panel, so the panel needs no close button.'
      }
    }
  }}
/>

<Story
  name="Named for the Assistant"
  args={{ label: 'Chat' }}
  parameters={{
    docs: {
      description: {
        story:
          'When the host turns the Console off but keeps the Assistant, the editor gives the strip the name "Chat" through `label`.'
      }
    }
  }}
/>

<style>
  .strip-frame {
    width: 100%;
    max-width: 900px;
    border: 1px solid var(--fd-border);
  }
</style>

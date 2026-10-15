<script module lang="ts">
  // The editor's bottom panel: the strip is its header, the console fills the rest.
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn, userEvent, within } from 'storybook/test';
  import CommandConsole from './CommandConsole.svelte';
  import ConsoleStrip from './ConsoleStrip.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { chatWorkflow, nodeTypes } from '../../stories/fixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Console',
    component: CommandConsole,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { nodeTypes, onUIAction: fn() }
  });

  const PANEL_ID = 'story-console-panel';

  /** Click one of the example commands the empty Console offers. */
  const runExample = (name: string) => async (ctx: { canvasElement: HTMLElement }) => {
    await userEvent.click(
      await within(ctx.canvasElement).findByRole('button', { name: new RegExp(name) })
    );
  };
</script>

{#snippet panel(args: Record<string, unknown>)}
  <div class="console-panel">
    <ConsoleStrip open controls={PANEL_ID} onToggle={() => {}} />
    <div class="console-panel__body">
      <CommandConsole
        id={PANEL_ID}
        nodeTypes={args.nodeTypes as typeof nodeTypes}
        onUIAction={args.onUIAction as () => void}
      />
    </div>
  </div>
{/snippet}

<Story
  name="In the editor"
  asChild
  play={runExample('list nodes')}
  parameters={{
    docs: {
      description: {
        story:
          'The Console open under the canvas, with the workflow loaded. An empty Console offers read-only examples to click; this story clicks "list nodes". Type `help` to see every command.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} {nodeTypes}>
    {@render panel({ nodeTypes, onUIAction: () => {} })}
  </InstanceDecorator>
</Story>

<Story
  name="Empty"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'The first thing a person sees: a prompt and three commands to try.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} {nodeTypes}>
    {@render panel({ nodeTypes, onUIAction: () => {} })}
  </InstanceDecorator>
</Story>

<Story
  name="Node types"
  asChild
  play={runExample('list types')}
  parameters={{
    docs: {
      description: {
        story: '`list types` shows the node types the palette offers, by category.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} {nodeTypes}>
    {@render panel({ nodeTypes, onUIAction: () => {} })}
  </InstanceDecorator>
</Story>

<Story
  name="Help"
  asChild
  play={runExample('help')}
  parameters={{
    docs: {
      description: {
        story: '`help` lists the editing commands, then the `session` commands that drive runs.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} {nodeTypes}>
    {@render panel({ nodeTypes, onUIAction: () => {} })}
  </InstanceDecorator>
</Story>

<Story
  name="No workflow open"
  asChild
  play={runExample('list nodes')}
  parameters={{
    docs: {
      description: {
        story:
          'Commands act on the workflow open in the editor. With none open they answer "No workflow loaded".'
      }
    }
  }}
>
  <InstanceDecorator {nodeTypes}>
    {@render panel({ nodeTypes, onUIAction: () => {} })}
  </InstanceDecorator>
</Story>

<style>
  .console-panel {
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--fd-border);
  }

  .console-panel__body {
    height: 260px;
  }
</style>

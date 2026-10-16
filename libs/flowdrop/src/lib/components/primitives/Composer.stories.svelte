<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import type { ComponentProps } from 'svelte';
  import Composer from './Composer.svelte';
  import Icon from '@iconify/svelte';
  import IconButton from './IconButton.svelte';

  const { Story } = defineMeta({
    title: 'Components/Composer',
    component: Composer,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      variant: { control: { type: 'select' }, options: ['default', 'mono'] },
      disabled: { control: 'boolean' },
      busy: { control: 'boolean' },
      sendDisabled: { control: 'boolean' },
      maxRows: { control: { type: 'number', min: 1, max: 20 } }
    },
    args: {
      variant: 'default',
      disabled: false,
      busy: false,
      maxRows: 8,
      onsubmit: fn(),
      onstop: fn()
    }
  });

  const LONG =
    'Line one of a long message\nLine two\nLine three\nLine four\nLine five\nLine six\nLine seven\nLine eight\nLine nine\nLine ten';
  let draft = $state('');
</script>

{#snippet frame(args: ComponentProps<typeof Composer>, initial: string = '')}
  <div style="width:420px;"><Composer {...args} value={initial} /></div>
{/snippet}

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'As in the Playground: the caller binds `value` and clears it in `onsubmit`. Type and press Enter to send, Shift+Enter for a new line.'
      }
    }
  }}
>
  <div style="width:420px;">
    <Composer
      bind:value={draft}
      placeholder="Type a message"
      hint="Enter to send, Shift+Enter for a new line"
      onsubmit={() => (draft = '')}
    />
  </div>
</Story>

<Story
  name="Run in progress"
  args={{ busy: true, onstop: fn() }}
  parameters={{
    docs: {
      description: {
        story:
          'While a run is in flight the send button becomes a stop button and sending is blocked. The stop button stays enabled even if the field is disabled.'
      }
    }
  }}
>
  {#snippet template(args)}{@render frame(args, 'Working on it')}{/snippet}
</Story>

<Story
  name="Custom send button"
  args={{ sendLabel: 'Save and send', sendDisabled: true }}
  parameters={{
    docs: {
      description: {
        story:
          '`sendLabel` renames the button (it is also its tooltip). `sendDisabled` blocks sending on top of the built-in checks, for example while a form is invalid.'
      }
    }
  }}
>
  {#snippet template(args)}{@render frame(args, 'Please review this')}{/snippet}
</Story>

<Story
  name="Grows then scrolls"
  parameters={{
    docs: {
      description: { story: 'The field grows up to `maxRows` (8 here), then scrolls.' }
    }
  }}
>
  {#snippet template(args)}{@render frame(args, LONG)}{/snippet}
</Story>

<Story
  name="Console"
  args={{ variant: 'mono', placeholder: 'Type a command, e.g. /help' }}
  parameters={{
    docs: {
      description: { story: 'The `mono` variant uses a monospace font, as the Console does.' }
    }
  }}
>
  {#snippet template(args)}{@render frame(args, 'run --input foo')}{/snippet}
</Story>

<Story
  name="With attach control"
  parameters={{
    docs: {
      description: {
        story:
          'The `attach` snippet puts any control left of send. `onattach` alone shows a plain attach button instead.'
      }
    }
  }}
  asChild
>
  <div style="width:420px;">
    <Composer value="Look at this run" hint="Enter to send, Shift+Enter for a new line">
      {#snippet attach()}
        <IconButton ariaLabel="Attach a run" title="Attach a run">
          <Icon icon="heroicons:paper-clip" />
        </IconButton>
      {/snippet}
    </Composer>
  </div>
</Story>

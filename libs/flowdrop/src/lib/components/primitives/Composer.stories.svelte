<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import type { ComponentProps } from 'svelte';
  import Composer from './Composer.svelte';
  import Icon from '@iconify/svelte';
  import IconButton from './IconButton.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Composer',
    component: Composer,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      variant: { control: { type: 'select' }, options: ['default', 'mono'] },
      disabled: { control: 'boolean' },
      busy: { control: 'boolean' },
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
</script>

{#snippet frame(args: ComponentProps<typeof Composer>, initial: string = '')}
  <div style="width:420px;"><Composer {...args} value={initial} /></div>
{/snippet}

<Story name="Empty">
  {#snippet template(args)}{@render frame(args)}{/snippet}
</Story>
<Story
  name="Long placeholder"
  args={{ placeholder: 'Ask the Assistant to build, explain or fix any part of this workflow' }}
>
  {#snippet template(args)}{@render frame(args)}{/snippet}
</Story>
<Story name="With text" args={{}}>
  {#snippet template(args)}{@render frame(args, 'Summarise the last run')}{/snippet}
</Story>
<Story name="Grows then scrolls (maxRows 8)" args={{}}>
  {#snippet template(args)}{@render frame(args, LONG)}{/snippet}
</Story>
<Story name="Busy (stop)" args={{ busy: true }}>
  {#snippet template(args)}{@render frame(args, 'Working on it')}{/snippet}
</Story>
<Story name="Disabled" args={{ disabled: true }}>
  {#snippet template(args)}{@render frame(args, 'Not available right now')}{/snippet}
</Story>
<Story name="With kbd hint" args={{ hint: 'Enter to send, Shift+Enter for a new line' }}>
  {#snippet template(args)}{@render frame(args, 'Hello')}{/snippet}
</Story>
<Story name="With attach button" args={{ onattach: fn() }}>
  {#snippet template(args)}{@render frame(args)}{/snippet}
</Story>
<Story name="Mono (Console)" args={{ variant: 'mono', placeholder: 'Type a command, e.g. /help' }}>
  {#snippet template(args)}{@render frame(args, 'run --input foo')}{/snippet}
</Story>

<Story name="Attach slot (Attach a run)" asChild>
  <div style="width:420px;">
    <Composer value="With a custom attach control" hint="Enter to send, Shift+Enter for a new line">
      {#snippet attach()}
        <IconButton ariaLabel="Attach a run" title="Attach a run">
          <Icon icon="heroicons:paper-clip" />
        </IconButton>
      {/snippet}
    </Composer>
  </div>
</Story>

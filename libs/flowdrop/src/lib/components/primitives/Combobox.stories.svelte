<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Combobox from './Combobox.svelte';
  import type { SelectOption } from '../../utils/selectOptions.js';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Combobox',
    component: Combobox,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } },
    args: { size: 'md', onValueChange: fn() }
  });

  const ports: SelectOption[] = [
    {
      value: 'a',
      label: 'chat_message',
      description: 'The chat message content',
      group: 'Chat Output'
    },
    {
      value: 'b',
      label: 'chat_reply',
      description: 'The reply shown to the user',
      group: 'Chat Output'
    },
    { value: 'c', label: 'text', description: 'Result of the run', group: 'Run workflow' },
    {
      value: 'd',
      label: 'metadata',
      description: 'Run metadata',
      group: 'Run workflow',
      disabled: true
    }
  ];
</script>

<Story
  name="Grouped with descriptions"
  parameters={{
    docs: {
      description: {
        story:
          'What a user sees when a `Select` gets grouped or described options. Open it and type to filter.'
      }
    }
  }}
  asChild
>
  <div style="width:360px; min-height:340px">
    <Combobox options={ports} value="b" aria-label="Output port" />
  </div>
</Story>

<Story
  name="Nothing chosen"
  parameters={{
    docs: {
      description: {
        story: 'The placeholder shows until a value is chosen. Type "zzz" to see the empty result.'
      }
    }
  }}
  asChild
>
  <div style="width:360px; min-height:300px">
    <Combobox options={ports} value="" placeholder="Choose a port" aria-label="Output port" />
  </div>
</Story>

<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Select from './Select.svelte';
  import type { SelectOption } from '../../utils/selectOptions.js';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Select',
    component: Select,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      size: { control: 'select', options: ['sm', 'md', 'lg'] },
      searchable: { control: 'select', options: [undefined, true, false] },
      invalid: { control: 'boolean' },
      disabled: { control: 'boolean' }
    },
    args: { size: 'md', onValueChange: fn() }
  });

  const formats: SelectOption[] = [
    { value: 'plain', label: 'Plain text' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'html', label: 'HTML' },
    { value: 'json', label: 'JSON' }
  ];

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
    {
      value: 'c',
      label: 'chat_message',
      description: 'The chat message content',
      group: 'Final Chat Output'
    },
    { value: 'd', label: 'text', description: 'Result of the run', group: 'Run workflow' },
    {
      value: 'e',
      label: 'metadata',
      description: 'Run metadata',
      group: 'Run workflow',
      disabled: true
    }
  ];

  const many: SelectOption[] = Array.from({ length: 42 }, (_, i) => ({
    value: `m${i}`,
    label: `Model ${i + 1}`
  }));

  let format = $state('markdown');
</script>

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story:
          "A short list of plain options is the browser's own `<select>`. The editor passes `options` and listens with `onValueChange`."
      }
    }
  }}
  asChild
>
  <div
    style="width:300px; min-height:220px; display:grid; gap:var(--fd-space-xs); align-content:start;"
  >
    <Select
      options={formats}
      value={format}
      onValueChange={(v) => (format = v)}
      aria-label="Message format"
    />
    <span style="font-size:var(--fd-text-xs); color:var(--fd-muted-foreground);">
      Chosen: {format}
    </span>
  </div>
</Story>

<Story
  name="Small"
  parameters={{
    docs: {
      description: {
        story: '`size="sm"` is 24px high, to sit in a dense row next to small buttons.'
      }
    }
  }}
  asChild
>
  <div style="width:300px; min-height:220px">
    <Select size="sm" options={formats} value="markdown" aria-label="Message format" />
  </div>
</Story>

<Story
  name="Long list"
  parameters={{
    docs: {
      description: {
        story: 'More than 10 options switch to the searchable rendering. Open it and type "3".'
      }
    }
  }}
  asChild
>
  <div style="width:300px; min-height:360px">
    <Select options={many} value="m3" aria-label="Model" />
  </div>
</Story>

<Story
  name="Grouped with descriptions"
  parameters={{
    docs: {
      description: {
        story:
          'Groups or descriptions also switch to the searchable rendering, even for a short list. Disabled options are skipped by the arrow keys.'
      }
    }
  }}
  asChild
>
  <div style="width:360px; min-height:420px">
    <Select options={ports} value="c" aria-label="Chat reply port" />
  </div>
</Story>

<Story
  name="No value yet"
  parameters={{
    docs: { description: { story: 'The placeholder shows until the user picks a value.' } }
  }}
  asChild
>
  <div style="width:300px; min-height:220px">
    <Select options={formats} value="" placeholder="Choose a format" aria-label="Message format" />
  </div>
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="width:360px; display:grid; gap:0.75rem;">
    <code style="font-size: var(--fd-text-xs);">disabled</code>
    <Select options={formats} value="markdown" disabled aria-label="Message format" />
    <Select options={ports} value="c" disabled aria-label="Chat reply port" />
    <code style="font-size: var(--fd-text-xs);">invalid</code>
    <Select options={formats} value="" invalid placeholder="Required" aria-label="Message format" />
    <Select options={ports} value="" invalid placeholder="Required" aria-label="Chat reply port" />
    <code style="font-size: var(--fd-text-xs);">sizes</code>
    <Select size="sm" options={formats} value="json" aria-label="Small" />
    <Select size="md" options={formats} value="json" aria-label="Medium" />
    <Select size="lg" options={formats} value="json" aria-label="Large" />
  </div>
</Story>

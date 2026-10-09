<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Select from './Select.svelte';
  import type { SelectOption } from '../../utils/selectOptions.js';

  const { Story } = defineMeta({
    title: 'Primitives/Select',
    component: Select,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      size: { control: 'select', options: ['sm', 'md', 'lg'] },
      searchable: { control: 'select', options: [undefined, true, false] }
    },
    args: { size: 'md' }
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

  const described: SelectOption[] = ports.map(({ group: _group, ...rest }) => rest);

  const many: SelectOption[] = Array.from({ length: 42 }, (_, i) => ({
    value: `m${i}`,
    label: `Model ${i + 1}`
  }));
</script>

<!-- Room under the field for the open list. -->
<Story name="NativeShort" asChild>
  <div style="width:300px; min-height:220px">
    <Select options={formats} value="markdown" aria-label="Message format" />
  </div>
</Story>

<Story name="NativeNoValue" asChild>
  <div style="width:300px; min-height:220px">
    <Select options={formats} value="" placeholder="Choose a format" aria-label="Message format" />
  </div>
</Story>

<Story name="SearchableLong" asChild>
  <div style="width:300px; min-height:360px">
    <Select options={many} value="m3" aria-label="Model" />
  </div>
</Story>

<Story name="Grouped" asChild>
  <div style="width:360px; min-height:420px">
    <Select options={ports} value="c" aria-label="Chat reply port" />
  </div>
</Story>

<Story name="WithDescriptions" asChild>
  <div style="width:360px; min-height:380px">
    <Select options={described} value="b" aria-label="Chat reply port" />
  </div>
</Story>

<Story name="ForcedSearchable" asChild>
  <div style="width:300px; min-height:260px">
    <Select options={formats} value="json" searchable aria-label="Message format" />
  </div>
</Story>

<!-- Open it and type something that matches nothing ("zzz"). -->
<Story name="EmptyFilterResult" asChild>
  <div style="width:360px; min-height:300px">
    <Select options={ports} value="" placeholder="Type zzz…" aria-label="Chat reply port" />
  </div>
</Story>

<Story name="Disabled" asChild>
  <div style="width:300px; display:grid; gap:1rem">
    <Select options={formats} value="markdown" disabled aria-label="Message format" />
    <Select options={ports} value="c" disabled aria-label="Chat reply port" />
  </div>
</Story>

<Story name="Invalid" asChild>
  <div style="width:300px; display:grid; gap:1rem">
    <Select options={formats} value="" invalid placeholder="Required" aria-label="Message format" />
    <Select options={ports} value="" invalid placeholder="Required" aria-label="Chat reply port" />
  </div>
</Story>

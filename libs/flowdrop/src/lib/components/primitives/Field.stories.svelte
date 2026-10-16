<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Field from './Field.svelte';
  import Select from './Select.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Field',
    component: Field,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    args: { label: 'Customer email', onexample: fn() }
  });

  const states = [
    { name: 'Plain', props: {} },
    { name: 'Type tag', props: { typeTag: 'string' } },
    { name: 'Required', props: { required: true, typeTag: 'string' } },
    { name: 'Help', props: { help: 'Where replies are sent.' } },
    { name: 'Error', props: { error: 'Enter a valid email address.', required: true } },
    { name: 'Help and error', props: { help: 'Where replies are sent.', error: 'Required.' } },
    {
      name: 'Examples',
      props: { typeTag: 'array', examples: ['["a", "b"]', '[]', '["support@example.com"]'] }
    }
  ];

  const formats = [
    { value: 'plain', label: 'Plain text' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'json', label: 'JSON' }
  ];
</script>

{#snippet input(ctx: { id: string; describedBy: string | undefined; invalid: boolean })}
  <input
    id={ctx.id}
    class="flowdrop-input"
    class:flowdrop-input--invalid={ctx.invalid}
    aria-describedby={ctx.describedBy}
    aria-invalid={ctx.invalid}
  />
{/snippet}

<Story
  name="With a Select"
  parameters={{
    docs: {
      description: {
        story:
          'How config forms use it: the Field gives the control its `id` and `aria-describedby`, so the label and the help text are tied to it.'
      }
    }
  }}
  asChild
>
  <div style="width:280px; min-height:160px">
    <Field label="Message format" typeTag="string" help="How the reply text is written." required>
      {#snippet children(ctx)}
        <Select
          id={ctx.id}
          aria-describedby={ctx.describedBy}
          invalid={ctx.invalid}
          options={formats}
          value="markdown"
        />
      {/snippet}
    </Field>
  </div>
</Story>

<Story name="With an input" asChild>
  <div style="width:280px">
    <Field label="Customer email" typeTag="string" help="Where replies are sent.">
      {#snippet children(ctx)}{@render input(ctx)}{/snippet}
    </Field>
  </div>
</Story>

<Story
  name="With an error"
  parameters={{
    docs: {
      description: {
        story:
          'The error is read out as an alert and shown in the error colour. The control turns red.'
      }
    }
  }}
  asChild
>
  <div style="width:280px">
    <Field label="Customer email" required error="Enter a valid email address.">
      {#snippet children(ctx)}{@render input(ctx)}{/snippet}
    </Field>
  </div>
</Story>

<Story
  name="With examples"
  parameters={{
    docs: {
      description: {
        story: 'Clicking an example calls `onexample`; the form can use it to fill the control.'
      }
    }
  }}
  asChild
>
  <div style="width:280px">
    <Field label="Tags" typeTag="array" examples={['["a", "b"]', '[]']}>
      {#snippet children(ctx)}{@render input(ctx)}{/snippet}
    </Field>
  </div>
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="display:grid; grid-template-columns:repeat(2, 280px); gap:1.5rem;">
    {#each states as state (state.name)}
      <Field label={state.name} {...state.props}>
        {#snippet children(ctx)}{@render input(ctx)}{/snippet}
      </Field>
    {/each}
  </div>
</Story>

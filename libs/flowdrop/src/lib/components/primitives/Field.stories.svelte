<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Field from './Field.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Primitives/Field',
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
    { name: 'Help + error', props: { help: 'Where replies are sent.', error: 'Required.' } },
    {
      name: 'Examples',
      props: { typeTag: 'array', examples: ['["a", "b"]', '[]', '["support@example.com"]'] }
    }
  ];
</script>

{#snippet input(ctx: { id: string; describedBy: string | undefined; invalid: boolean })}
  <input
    id={ctx.id}
    aria-describedby={ctx.describedBy}
    aria-invalid={ctx.invalid}
    style="padding:0 var(--fd-space-sm); height:var(--fd-control-md); border:1px solid {ctx.invalid
      ? 'var(--fd-error)'
      : 'var(--fd-border)'}; border-radius:var(--fd-radius-md); background:var(--fd-background); color:var(--fd-foreground); font:inherit; font-size:var(--fd-text-sm);"
  />
{/snippet}

{#snippet matrix()}
  <div style="display:grid; grid-template-columns:repeat(2, 280px); gap:1.5rem;">
    {#each states as state (state.name)}
      <Field label={state.name} {...state.props}>
        {#snippet children(ctx)}{@render input(ctx)}{/snippet}
      </Field>
    {/each}
  </div>
{/snippet}

<Story name="Default" asChild>
  <div style="width:280px">
    <Field label="Customer email" typeTag="string" help="Where replies are sent.">
      {#snippet children(ctx)}{@render input(ctx)}{/snippet}
    </Field>
  </div>
</Story>

<Story name="Error" asChild>
  <div style="width:280px">
    <Field label="Customer email" required error="Enter a valid email address.">
      {#snippet children(ctx)}{@render input(ctx)}{/snippet}
    </Field>
  </div>
</Story>

<Story name="WithExamples" asChild>
  <div style="width:280px">
    <Field label="Tags" typeTag="array" examples={['["a", "b"]', '[]']}>
      {#snippet children(ctx)}{@render input(ctx)}{/snippet}
    </Field>
  </div>
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

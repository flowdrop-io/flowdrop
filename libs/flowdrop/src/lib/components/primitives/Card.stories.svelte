<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Card from './Card.svelte';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Card',
    component: Card,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      variant: { control: 'select', options: ['default', 'attention'] },
      padding: { control: 'select', options: ['sm', 'md'] }
    },
    args: { variant: 'default', padding: 'md' }
  });

  const variants = ['default', 'attention'] as const;
  const paddings = ['sm', 'md'] as const;
</script>

{#snippet header()}
  <span>Needs your input</span>
  <span style="font-size:var(--fd-text-2xs); font-weight:400; color:var(--fd-muted-foreground);"
    >Step 3</span
  >
{/snippet}

{#snippet footer()}
  <Button size="sm" variant="ghost">Skip</Button>
  <Button size="sm" variant="primary">Approve</Button>
{/snippet}

{#snippet body()}
  Approve the draft reply before it is sent to the customer.
{/snippet}

{#snippet matrix()}
  <div style="display:grid; grid-template-columns:repeat(2, 300px); gap:1rem;">
    {#each variants as variant (variant)}
      {#each paddings as padding (padding)}
        <Card {variant} {padding} {header} {footer} ariaLabel="{variant} {padding}">
          {@render body()}
        </Card>
      {/each}
    {/each}
    <Card>{@render body()}</Card>
    <Card variant="attention" padding="sm">{@render body()}</Card>
  </div>
{/snippet}

<Story name="Default" asChild>
  <div style="width:300px"><Card>{@render body()}</Card></div>
</Story>

<Story name="Attention" asChild>
  <div style="width:300px">
    <Card variant="attention" {header} {footer} ariaLabel="Interrupt">{@render body()}</Card>
  </div>
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

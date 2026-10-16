<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Card from './Card.svelte';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Components/Card',
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

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story: 'A plain frame around a form, as in the Playground input form (medium padding).'
      }
    }
  }}
  asChild
>
  <div style="width:300px"><Card padding="md">{@render body()}</Card></div>
</Story>

<Story
  name="Needs you"
  parameters={{
    docs: {
      description: {
        story:
          'The amber `attention` frame. A user sees it when a run stops and waits for an answer.'
      }
    }
  }}
  asChild
>
  <div style="width:300px">
    <Card variant="attention" {header} {footer} ariaLabel="Interrupt">{@render body()}</Card>
  </div>
</Story>

<Story name="With header and footer" asChild>
  <div style="width:300px">
    <Card {header} {footer} ariaLabel="Review">{@render body()}</Card>
  </div>
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="display:grid; grid-template-columns:repeat(2, 300px); gap:1rem;">
    {#each variants as variant (variant)}
      {#each paddings as padding (padding)}
        <Card {variant} {padding} {header} {footer} ariaLabel="{variant} {padding}">
          {@render body()}
        </Card>
      {/each}
    {/each}
  </div>
</Story>

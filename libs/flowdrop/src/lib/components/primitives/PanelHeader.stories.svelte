<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PanelHeader from './PanelHeader.svelte';
  import IconButton from './IconButton.svelte';
  import Icon from '@iconify/svelte';

  const frame = (w: number) =>
    `width:${w}px; border:1px solid var(--fd-border); background:var(--fd-panel-bg); border-radius:var(--fd-radius-lg); overflow:hidden; padding-bottom:80px;`;

  const { Story } = defineMeta({
    title: 'Components/PanelHeader',
    component: PanelHeader,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      as: { control: { type: 'select' }, options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
      borderless: { control: 'boolean' }
    },
    args: { title: 'Playground', as: 'h2', borderless: false }
  });
</script>

{#snippet chip()}
  <span
    style="display:inline-flex; align-items:center; gap:var(--fd-space-3xs); height:var(--fd-control-sm); padding-inline:var(--fd-space-xs); border:1px solid var(--fd-border); border-radius:var(--fd-radius-full); background:var(--fd-muted); font-size:var(--fd-text-xs);"
  >
    <Icon icon="heroicons:play" /> Support triage
  </span>
{/snippet}

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story: 'A settings sheet: a title and a close button on the right.'
      }
    }
  }}
  asChild
>
  <div style={frame(360)}>
    <PanelHeader title="Settings">
      {#snippet actions()}
        <IconButton size="sm" ariaLabel="Close settings" title="Close">
          <Icon icon="heroicons:x-mark" />
        </IconButton>
      {/snippet}
    </PanelHeader>
  </div>
</Story>

<Story name="Title and subtitle" args={{ title: 'Console', subtitle: 'Connected to dev site' }} />

<Story
  name="Content on the left"
  parameters={{
    docs: {
      description: {
        story:
          'The `leading` snippet replaces the title, for a chip or a menu, as the Console and Playground do.'
      }
    }
  }}
  asChild
>
  <div style={frame(420)}>
    <PanelHeader>
      {#snippet leading()}{@render chip()}{/snippet}
      {#snippet actions()}
        <IconButton size="sm" ariaLabel="Clear"><Icon icon="heroicons:trash" /></IconButton>
        <IconButton size="sm" ariaLabel="Collapse">
          <Icon icon="heroicons:chevron-down" />
        </IconButton>
      {/snippet}
    </PanelHeader>
  </div>
</Story>

<Story name="Long title" asChild>
  <div style={frame(320)}>
    <PanelHeader title="A very long node name that has to truncate" subtitle="Last run" as="h3">
      {#snippet actions()}
        <IconButton size="sm" ariaLabel="Close"><Icon icon="heroicons:x-mark" /></IconButton>
      {/snippet}
    </PanelHeader>
  </div>
</Story>

<Story name="Borderless" args={{ title: 'Inspector', borderless: true }} />

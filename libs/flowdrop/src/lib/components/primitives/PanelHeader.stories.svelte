<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PanelHeader from './PanelHeader.svelte';
  import Icon from '@iconify/svelte';

  const frame = (w: number) =>
    `width:${w}px; border:1px solid var(--fd-border); background:var(--fd-panel-bg); border-radius:var(--fd-radius-lg); overflow:hidden; padding-bottom:80px;`;

  const { Story } = defineMeta({
    title: 'Primitives/PanelHeader',
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

{#snippet iconBtn(icon: string, label: string)}
  <button
    type="button"
    aria-label={label}
    title={label}
    style="display:inline-flex; align-items:center; justify-content:center; width:var(--fd-control-md); height:var(--fd-control-md); border:0; border-radius:var(--fd-radius-md); background:transparent; color:var(--fd-muted-foreground); cursor:pointer;"
  >
    <Icon {icon} />
  </button>
{/snippet}

{#snippet chip()}
  <span
    style="display:inline-flex; align-items:center; gap:var(--fd-space-3xs); height:var(--fd-control-sm); padding-inline:var(--fd-space-xs); border:1px solid var(--fd-border); border-radius:var(--fd-radius-full); background:var(--fd-muted); font-size:var(--fd-text-xs);"
  >
    <Icon icon="heroicons:play" /> Support triage
  </span>
{/snippet}

<Story name="Title only" args={{ title: 'Inspector' }} />
<Story name="Title + subtitle" args={{ title: 'Console', subtitle: 'Connected to dev site' }} />
<Story name="Borderless" args={{ title: 'Inspector', borderless: true }} />

<Story name="Docked Playground" asChild>
  <div style={frame(420)}>
    <PanelHeader title="Playground" subtitle="Test mode">
      {#snippet actions()}
        {@render iconBtn('heroicons:arrow-path', 'Reset')}
        {@render iconBtn('heroicons:x-mark', 'Close')}
      {/snippet}
    </PanelHeader>
  </div>
</Story>

<Story name="AI chat panel" asChild>
  <div style={frame(360)}>
    <PanelHeader title="Assistant">
      {#snippet actions()}
        {@render iconBtn('heroicons:plus', 'New chat')}
        {@render iconBtn('heroicons:clock', 'History')}
      {/snippet}
    </PanelHeader>
  </div>
</Story>

<Story name="Console (chip on the left)" asChild>
  <div style={frame(520)}>
    <PanelHeader>
      {#snippet leading()}{@render chip()}{/snippet}
      {#snippet actions()}
        {@render iconBtn('heroicons:trash', 'Clear')}
        {@render iconBtn('heroicons:chevron-down', 'Collapse')}
      {/snippet}
    </PanelHeader>
  </div>
</Story>

<Story name="Inspector / settings sheet" asChild>
  <div style={frame(360)}>
    <PanelHeader title="A very long node name that has to truncate" subtitle="Last run" as="h3">
      {#snippet actions()}
        {@render iconBtn('heroicons:x-mark', 'Close')}
      {/snippet}
    </PanelHeader>
  </div>
</Story>

<Story name="Dark" globals={{ theme: 'dark' }} asChild>
  <div style={frame(420)}>
    <PanelHeader title="Playground" subtitle="Test mode">
      {#snippet actions()}
        {@render iconBtn('heroicons:x-mark', 'Close')}
      {/snippet}
    </PanelHeader>
  </div>
</Story>

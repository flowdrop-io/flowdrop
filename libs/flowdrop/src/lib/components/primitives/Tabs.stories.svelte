<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Tabs, { tabId, tabPanelId } from './Tabs.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Tabs',
    component: Tabs,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { size: { control: 'select', options: ['sm', 'md'] } },
    args: { size: 'md', ariaLabel: 'Views', onchange: fn() }
  });

  const plain = [
    { value: 'form', label: 'Form' },
    { value: 'json', label: 'JSON' },
    { value: 'steps', label: 'Steps' }
  ];
  const rich = [
    { value: 'inputs', label: 'Inputs', icon: 'mdi:import', count: 3 },
    { value: 'outputs', label: 'Outputs', icon: 'mdi:export', count: 0 },
    { value: 'logs', label: 'Logs', icon: 'mdi:text-long' }
  ];
  const sizes = ['sm', 'md'] as const;

  const text: Record<string, string> = {
    form: 'Fill in the fields one by one.',
    json: 'Edit the same values as JSON.',
    steps: 'See each step of the run.'
  };

  let view = $state('form');
</script>

<Story
  name="With panels"
  parameters={{
    docs: {
      description: {
        story:
          'The editor passes `idBase` and renders a panel with the ids the component exposes: `tabPanelId(idBase, value)` for the panel and `tabId(idBase, value)` for `aria-labelledby`. That ties each tab to its panel for screen readers.'
      }
    }
  }}
  asChild
>
  <div style="width: 320px;">
    <Tabs idBase="story-views" ariaLabel="Views" tabs={plain} bind:value={view} />
    <div
      role="tabpanel"
      id={tabPanelId('story-views', view)}
      aria-labelledby={tabId('story-views', view)}
      tabindex="0"
      style="padding: var(--fd-space-sm); font-size: var(--fd-text-sm);"
    >
      {text[view]}
    </div>
  </div>
</Story>

<Story name="Icons and counts" asChild>
  <Tabs ariaLabel="Sections" tabs={rich} value="inputs" />
</Story>

<Story name="Small" asChild>
  <Tabs size="sm" ariaLabel="Views" tabs={plain} value="form" />
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="display:grid; gap:1rem; justify-items:start;">
    {#each sizes as size (size)}
      <Tabs {size} ariaLabel="Plain {size}" tabs={plain} value="json" />
      <Tabs {size} ariaLabel="Rich {size}" tabs={rich} value="inputs" />
      <Tabs {size} ariaLabel="Rich {size} (last)" tabs={rich} value="logs" />
    {/each}
  </div>
</Story>

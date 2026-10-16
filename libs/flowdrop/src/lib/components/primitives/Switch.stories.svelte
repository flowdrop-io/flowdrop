<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Switch from './Switch.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Switch',
    component: Switch,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { checked: { control: 'boolean' }, disabled: { control: 'boolean' } },
    args: { checked: false, disabled: false, label: 'Show steps', onchange: fn() }
  });

  let steps = $state(true);
</script>

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story:
          'A setting that takes effect at once. The `label` is the accessible name, not visible text.'
      }
    }
  }}
  asChild
>
  <label
    style="display:flex; align-items:center; gap:var(--fd-space-xs); font-size:var(--fd-text-sm);"
  >
    <Switch checked={steps} label="Show steps" onchange={(on) => (steps = on)} />
    Show steps
  </label>
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="display: grid; gap: 0.75rem; justify-items: start;">
    <div style="display:flex; gap:var(--fd-space-sm); align-items:center;">
      <Switch checked={false} label="Off" /> Off
    </div>
    <div style="display:flex; gap:var(--fd-space-sm); align-items:center;">
      <Switch checked label="On" /> On
    </div>
    <div style="display:flex; gap:var(--fd-space-sm); align-items:center;">
      <Switch checked={false} disabled label="Off, disabled" /> Off, disabled
    </div>
    <div style="display:flex; gap:var(--fd-space-sm); align-items:center;">
      <Switch checked disabled label="On, disabled" /> On, disabled
    </div>
  </div>
</Story>

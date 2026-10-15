<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Checkbox from './Checkbox.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Checkbox',
    component: Checkbox,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { checked: { control: 'boolean' }, disabled: { control: 'boolean' } },
    args: { checked: false, disabled: false, label: 'Send a copy to me', onchange: fn() }
  });

  let accepted = $state(true);
</script>

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story: 'A checkbox with its own label, as in config forms and reply options. Click it.'
      }
    }
  }}
  asChild
>
  <Checkbox checked={accepted} label="Send a copy to me" onchange={(on) => (accepted = on)} />
</Story>

<Story
  name="Named by the row"
  parameters={{
    docs: {
      description: {
        story:
          'No visible label: `aria-label` names it when the row around it already says what it is.'
      }
    }
  }}
  asChild
>
  <Checkbox checked={false} aria-label="Select row 3" />
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="display: grid; gap: 0.75rem; justify-items: start;">
    <Checkbox checked={false} label="Off" />
    <Checkbox checked label="On" />
    <Checkbox checked={false} disabled label="Off, disabled" />
    <Checkbox checked disabled label="On, disabled" />
  </div>
</Story>

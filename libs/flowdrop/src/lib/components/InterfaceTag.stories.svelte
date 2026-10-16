<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { getDataTypeColorToken } from '../utils/colors.js';
  import { createStoryInstance } from '../stories/utils.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import InterfaceTag from './InterfaceTag.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Interface tag',
    component: InterfaceTag,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  // The editor colours the swatch with the colour of the port's data type.
  const checker = createStoryInstance().portCompatibility;
  const colorOf = (dataType: string) => getDataTypeColorToken(checker, dataType);
</script>

<Story
  asChild
  name="An input of the workflow"
  parameters={{
    docs: {
      description: {
        story:
          'A port the workflow publishes. On the canvas the tag sits at the port, pointing the way the wire flows.'
      }
    }
  }}
>
  <InterfaceTag id="question" typeText="String" color={colorOf('string')} />
</Story>

<Story
  asChild
  name="Type does not match"
  parameters={{
    docs: {
      description: {
        story:
          'The entry says one type and the port it is bound to has another. The outline turns amber and the text shows both.'
      }
    }
  }}
>
  <InterfaceTag id="items" typeText="Array ≠ String" color={colorOf('array')} mismatch />
</Story>

<Story
  asChild
  name="Being named"
  parameters={{
    docs: {
      description: {
        story: 'While you type a new name. The outline is dashed and the field replaces the text.'
      }
    }
  }}
>
  <InterfaceTag id="new_name" color={colorOf('string')} ghost>
    <span style="font-family: var(--fd-font-mono);">new_name</span>
  </InterfaceTag>
</Story>

<Story
  asChild
  name="Read-only"
  parameters={{
    docs: {
      description: {
        story: 'A tag nobody can rename or remove, such as the event input of a trigger.'
      }
    }
  }}
>
  <InterfaceTag id="event:trigger.1" typeText="Object" color={colorOf('object')} readonly />
</Story>

<Story
  asChild
  name="Compact"
  parameters={{
    docs: {
      description: {
        story:
          'Far zoom. The text drops and the shape and swatch stay. The editor turns this on by itself when the canvas zooms out.'
      }
    }
  }}
>
  <InterfaceTag id="question" typeText="String" color={colorOf('string')} compact />
</Story>

<Story
  asChild
  name="Long id"
  parameters={{
    docs: {
      description: {
        story: 'A long id is shortened. The full id is the tooltip.'
      }
    }
  }}
>
  <InterfaceTag
    id="customer_support_ticket_description_text"
    typeText="String"
    color={colorOf('string')}
  />
</Story>

<Story asChild name="All variants">
  <div style="display: grid; gap: var(--fd-space-md); justify-items: start;">
    <InterfaceTag id="question" typeText="String" color={colorOf('string')} />
    <InterfaceTag id="items" typeText="Array ≠ String" color={colorOf('array')} mismatch />
    <InterfaceTag id="event:trigger.1" typeText="Object" color={colorOf('object')} readonly />
    <InterfaceTag id="question" typeText="String" color={colorOf('string')} compact />
  </div>
</Story>

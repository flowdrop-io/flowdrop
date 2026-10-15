<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FormPorts from './FormPorts.svelte';
  import FormFieldWrapper from './FormFieldWrapper.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { agentNode, agentWorkflow } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Ports list',
    component: FormPorts,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });
</script>

<script lang="ts">
  let value = $state<unknown>(undefined);
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The Ports tab of the inspector. Drag a row (or press Alt+Up or Alt+Down) to reorder. The eye hides a port, which takes it off the canvas. Hover a row to see the grip.'
      }
    }
  }}
>
  <InstanceDecorator workflow={agentWorkflow} width="26rem">
    <FormFieldWrapper
      id="ports"
      label="Ports"
      plain
      description="Hidden ports are off the canvas and cannot be wired. Drag to reorder."
    >
      <FormPorts id="ports" {value} node={agentNode} onChange={(v) => (value = v)} />
    </FormFieldWrapper>
  </InstanceDecorator>
</Story>

<Story name="Read only" asChild>
  <InstanceDecorator workflow={agentWorkflow} width="26rem">
    <FormPorts id="ports-ro" value={undefined} node={agentNode} disabled onChange={() => {}} />
  </InstanceDecorator>
</Story>

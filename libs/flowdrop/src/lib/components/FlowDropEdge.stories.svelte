<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EdgeDecorator from '../stories/EdgeDecorator.svelte';
  import LoopbackLanesDecorator from '../stories/LoopbackLanesDecorator.svelte';
  import {
    textSourceData,
    textTargetData,
    toolSourceData,
    toolTargetData,
    triggerSourceData,
    triggerTargetData
  } from '../stories/nodeFixtures.js';
  import { ZOOM_LEVELS } from '../stories/utils.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import FlowDropEdge from './FlowDropEdge.svelte';

  // Wires are styled the way the editor styles a new connection (applyConnectionStyling),
  // from the source port: trigger, tool, loopback or data.
  const { Story } = defineMeta({
    title: 'Editor/Edges/Edge',
    component: FlowDropEdge,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });
</script>

<Story
  asChild
  name="A data wire"
  parameters={{
    docs: {
      description: {
        story: 'The wire you see most. It carries a value, here a text, from one port to another.'
      }
    }
  }}
>
  <EdgeDecorator
    sourceData={textSourceData()}
    targetData={textTargetData()}
    sourceHandleId="output"
    targetHandleId="input"
  />
</Story>

<Story
  asChild
  name="Trigger wire"
  parameters={{
    docs: {
      description: {
        story: 'A wire between trigger ports. It says what runs after what, and carries no value.'
      }
    }
  }}
>
  <EdgeDecorator
    sourceData={triggerSourceData()}
    targetData={triggerTargetData()}
    sourceHandleId="trigger"
    targetHandleId="trigger"
  />
</Story>

<Story
  asChild
  name="Tool wire"
  parameters={{
    docs: {
      description: {
        story: 'A dashed wire from a tool to an agent that may call it.'
      }
    }
  }}
>
  <EdgeDecorator
    sourceData={toolSourceData()}
    targetData={toolTargetData()}
    sourceHandleId="tool"
    targetHandleId="tool"
  />
</Story>

<Story
  asChild
  name="Loopback wire"
  parameters={{
    docs: {
      description: {
        story:
          'A wire back into a loop node. It is dashed and runs along a return lane under the cards, so it does not cross them.'
      }
    }
  }}
>
  <LoopbackLanesDecorator
    cards={[
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 400, y: 0 }
    ]}
    wires={[['a', 'b']]}
    loops={[['b', 'a']]}
    zoom={ZOOM_LEVELS.full}
  />
</Story>

<Story
  asChild
  name="Selected"
  parameters={{
    docs: {
      description: {
        story: 'A wire you clicked. It gets thicker.'
      }
    }
  }}
>
  <EdgeDecorator
    sourceData={textSourceData()}
    targetData={textTargetData()}
    sourceHandleId="output"
    targetHandleId="input"
    selected
  />
</Story>

<Story
  asChild
  name="Passed by a run"
  parameters={{
    docs: {
      description: {
        story:
          'Test mode, with a run on screen. The run handed data over this wire, because the first node completed and the second one started. The wire turns green and thicker.'
      }
    }
  }}
>
  <EdgeDecorator
    sourceData={textSourceData()}
    targetData={textTargetData()}
    sourceHandleId="output"
    targetHandleId="input"
    testMode
    statuses={{ 'source-node': 'completed', 'target-node': 'running' }}
  />
</Story>

<Story
  asChild
  name="Not passed by a run"
  parameters={{
    docs: {
      description: {
        story:
          'The first node completed but the second one was skipped, for example the other branch of a gateway ran. The wire keeps its normal look.'
      }
    }
  }}
>
  <EdgeDecorator
    sourceData={textSourceData()}
    targetData={textTargetData()}
    sourceHandleId="output"
    targetHandleId="input"
    testMode
    statuses={{ 'source-node': 'completed', 'target-node': 'skipped' }}
  />
</Story>

<Story
  asChild
  name="Zoomed out"
  parameters={{
    docs: {
      description: {
        story:
          'Below 45% wires get thicker so the shape of the graph still reads. Below 25% they turn one neutral colour.'
      }
    }
  }}
>
  <EdgeDecorator
    sourceData={textSourceData()}
    targetData={textTargetData()}
    sourceHandleId="output"
    targetHandleId="input"
    zoom={ZOOM_LEVELS.glyph}
  />
</Story>

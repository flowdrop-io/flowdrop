<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LoopbackLanesDecorator from '../stories/LoopbackLanesDecorator.svelte';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import LoopbackLanes from './LoopbackLanes.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Edges/Loopback lanes',
    component: LoopbackLanes,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });
</script>

<Story
  asChild
  name="A loop"
  parameters={{
    docs: {
      description: {
        story:
          'A loopback runs back along a lane under the cards, so it never crosses them. It turns with rounded corners and ends in the arrowhead.'
      }
    }
  }}
>
  <LoopbackLanesDecorator
    cards={[
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 400, y: 0 },
      { id: 'c', x: 800, y: 0 }
    ]}
    wires={[
      ['a', 'b'],
      ['b', 'c']
    ]}
    loops={[['c', 'b']]}
  />
</Story>

<Story
  asChild
  name="Nested loops"
  parameters={{
    docs: {
      description: {
        story:
          'A loop inside a loop. The inner lane is closer to the cards, so the two never cross.'
      }
    }
  }}
>
  <LoopbackLanesDecorator
    cards={[
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 400, y: 0 },
      { id: 'c', x: 800, y: 0 },
      { id: 'd', x: 1200, y: 0 }
    ]}
    wires={[
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd']
    ]}
    loops={[
      ['d', 'a'],
      ['c', 'b']
    ]}
  />
</Story>

<Story
  asChild
  name="Loops side by side"
  parameters={{
    docs: {
      description: {
        story: 'Loops that do not overlap share one lane height, so the graph stays compact.'
      }
    }
  }}
>
  <LoopbackLanesDecorator
    cards={[
      { id: 'e', x: 0, y: 0 },
      { id: 'f', x: 400, y: 0 },
      { id: 'g', x: 900, y: 0 },
      { id: 'h', x: 1300, y: 0 }
    ]}
    wires={[
      ['e', 'f'],
      ['f', 'g'],
      ['g', 'h']
    ]}
    loops={[
      ['f', 'e'],
      ['h', 'g']
    ]}
  />
</Story>

<Story
  asChild
  name="Two loopbacks into one port"
  parameters={{
    docs: {
      description: {
        story: 'Two loopbacks that end at the same port share the last stretch, like a bus.'
      }
    }
  }}
>
  <LoopbackLanesDecorator
    cards={[
      { id: 'i', x: 0, y: 100 },
      { id: 'j', x: 460, y: 0 },
      { id: 'k', x: 460, y: 200 }
    ]}
    wires={[
      ['i', 'j'],
      ['i', 'k']
    ]}
    loops={[
      ['j', 'i'],
      ['k', 'i']
    ]}
  />
</Story>

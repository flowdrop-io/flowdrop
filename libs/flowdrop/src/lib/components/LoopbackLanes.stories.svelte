<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LoopbackLanesDecorator from '../../lib/stories/LoopbackLanesDecorator.svelte';

  const { Story } = defineMeta({
    title: 'Patterns/Edges/Return lanes',
    tags: ['autodocs'],
    parameters: {
      layout: 'centered'
    }
  });
</script>

<!-- Inner loop c > b wrapped by the outer loop d > a: the inner lane sits closer to the cards,
     and on both ends the outer lane turns further out, so they never cross. -->
<Story name="Nested loops">
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

<!-- Loops whose spans do not overlap share one track. -->
<Story name="Loops side by side">
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

<!-- Two loopbacks into one loop_back port share the final climb, like a bus. -->
<Story name="Two loopbacks into one port">
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

<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import ScopeFrame from '../../stories/ScopeFrame.svelte';
  import { typicalNodeData } from '../../stories/nodeFixtures.js';
  import {
    createSampleNodeData,
    createTerminalNodeData,
    ZOOM_LEVELS,
    type StoryNode
  } from '../../stories/utils.js';
  import type { NodePort } from '../../types/index.js';
  import type { DoctorProblem, DoctorSeverity } from '../../types/doctor.js';
  import Navbar from '../Navbar.svelte';
  import DoctorMenu from '../DoctorMenu.svelte';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import NodeProblemMark from './NodeProblemMark.svelte';

  // Every story draws real nodes through UniversalNode and answers the Doctor's diagnose
  // request with the problems below, so the badges, the error border and the navbar's
  // Problems indicator are what the editor draws.
  const { Story } = defineMeta({
    title: 'Editor/Nodes/Problems on nodes',
    component: NodeProblemMark,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const port = (
    type: 'input' | 'output',
    id: string,
    name: string,
    dataType: string
  ): NodePort => ({
    id,
    name,
    type,
    dataType,
    required: false
  });

  /** One node of each type the editor draws, with the severity it gets below. */
  const kinds: Array<{ id: string; severity: DoctorSeverity; data: StoryNode['data'] }> = [
    { id: 'summarise', severity: 'error', data: typicalNodeData('Summarise text') },
    {
      id: 'text_input',
      severity: 'warning',
      data: createSampleNodeData({
        label: 'Text input',
        metadata: {
          node_type_id: 'text_input',
          name: 'Text input',
          category: 'inputs',
          type: 'simple',
          icon: 'mdi:text',
          inputs: [],
          outputs: [port('output', 'text', 'Text', 'string')]
        }
      })
    },
    {
      id: 'text_output',
      severity: 'info',
      data: createSampleNodeData({
        label: 'Text output',
        metadata: {
          node_type_id: 'text_output',
          name: 'Text output',
          category: 'outputs',
          type: 'square',
          icon: 'mdi:text-box',
          inputs: [port('input', 'text', 'Text', 'string')],
          outputs: []
        }
      })
    },
    {
      id: 'web_search',
      severity: 'warning',
      data: createSampleNodeData({
        label: 'Search the web',
        metadata: {
          node_type_id: 'web_search',
          name: 'Search the web',
          category: 'tools',
          type: 'tool',
          icon: 'mdi:magnify',
          inputs: [],
          outputs: [port('output', 'tool', 'Tool', 'tool')]
        }
      })
    },
    {
      id: 'if_else',
      severity: 'error',
      data: createSampleNodeData({
        label: 'Is it urgent?',
        config: {
          branches: [
            { name: 'true', label: 'True', value: 'true' },
            { name: 'false', label: 'False', value: 'false' }
          ]
        },
        metadata: {
          node_type_id: 'if_else',
          name: 'If / else',
          category: 'logic',
          type: 'gateway',
          icon: 'mdi:source-branch',
          inputs: [port('input', 'trigger', 'Trigger', 'trigger')],
          outputs: []
        }
      })
    },
    { id: 'start', severity: 'warning', data: createTerminalNodeData('start') },
    {
      id: 'greeting',
      severity: 'info',
      data: createSampleNodeData({
        label: 'Hello world',
        metadata: {
          node_type_id: 'constant',
          name: 'Constant',
          category: 'data',
          type: 'atom',
          inputs: [],
          outputs: [port('output', 'value', 'Value', 'string')],
          extensions: { ui: { atom: {} } }
        }
      })
    },
    {
      id: 'notes',
      severity: 'warning',
      data: createSampleNodeData({
        label: 'Notes',
        config: { content: '## Onboarding\n\nHandles **new users**.', noteType: 'info' },
        metadata: {
          node_type_id: 'notes',
          name: 'Notes',
          category: 'helpers',
          type: 'note',
          inputs: [],
          outputs: []
        }
      })
    },
    {
      id: 'approval',
      severity: 'error',
      data: createSampleNodeData({
        label: 'Ask for approval',
        metadata: {
          node_type_id: 'approval',
          name: 'Idea',
          category: 'helpers',
          type: 'idea',
          inputs: [],
          outputs: []
        }
      })
    },
    {
      id: 'inputs_caption',
      severity: 'info',
      data: createSampleNodeData({
        label: 'Inputs',
        metadata: {
          node_type_id: 'inputs_caption',
          name: 'Caption',
          category: 'tools',
          type: 'caption',
          inputs: [],
          outputs: []
        }
      })
    }
  ];

  const MESSAGES: Record<DoctorSeverity, string> = {
    error: 'The required input "Text" is not connected.',
    warning: 'This node is not connected to the rest of the workflow.',
    info: 'A newer version of this node type is available.'
  };

  /** One problem per node; the first node has two, so its badge counts them. */
  const problems: DoctorProblem[] = [
    ...kinds.map(({ id, severity }) => ({
      id: `${id}-problem`,
      code: `story.${severity}`,
      severity,
      message: MESSAGES[severity],
      node: id,
      remedies:
        severity === 'error' ? [{ id: 'remove', label: 'Remove node', destructive: true }] : []
    })),
    {
      id: 'summarise-second',
      code: 'story.warning',
      severity: 'warning',
      message: 'The "Style" input expects one of: short, long.',
      node: 'summarise',
      remedies: [{ id: 'reset', label: 'Reset to default', destructive: false }]
    },
    {
      id: 'workflow-wide',
      code: 'story.info',
      severity: 'info',
      message: 'The workflow has no description.',
      remedies: []
    }
  ];

  /** Five to a row; `selected` shows the gear, which every node draws in its top-right corner. */
  const grid = (selected = false): StoryNode[] =>
    kinds.map(({ id, data }, i) => ({
      id,
      data,
      x: (i % 5) * 380,
      y: Math.floor(i / 5) * 280,
      selected
    }));
</script>

{#snippet navbar()}
  {#snippet status()}
    <DoctorMenu />
  {/snippet}
  <ScopeFrame>
    <Navbar title="Support triage" showStatus showSettings {status} />
  </ScopeFrame>
{/snippet}

<Story
  asChild
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story:
          'The Doctor found problems in the draft. The navbar says how many, and its popover lists them with their remedies. Each node with a problem shows a glyph in the colour of its worst one; an error also takes the error border. Hover a node to see the gear next to the glyph.'
      }
    }
  }}
>
  <NodeDecorator
    nodes={grid()}
    {problems}
    header={navbar}
    width={1900}
    height={640}
    zoom={ZOOM_LEVELS.full}
  />
</Story>

<Story
  asChild
  name="Selected"
  parameters={{
    docs: {
      description: {
        story:
          'Every node selected, so each shows its gear (as on hover). The gear must not cover the problem glyph.'
      }
    }
  }}
>
  <NodeDecorator nodes={grid(true)} {problems} width={1900} height={600} zoom={ZOOM_LEVELS.full} />
</Story>

<Story
  asChild
  name="Zoomed out a little"
  parameters={{
    docs: {
      description: {
        story: 'Below 75% the glyph stays in the card header, scaled up so it still reads.'
      }
    }
  }}
>
  <NodeDecorator nodes={grid()} {problems} width={1200} height={440} zoom={ZOOM_LEVELS.outline} />
</Story>

<Story
  asChild
  name="Zoomed out far"
  parameters={{
    docs: {
      description: {
        story:
          'Below 45% there is no header: the glyph moves to the top-right corner of the block and grows.'
      }
    }
  }}
>
  <NodeDecorator nodes={grid()} {problems} width={700} height={360} zoom={ZOOM_LEVELS.glyph} />
</Story>

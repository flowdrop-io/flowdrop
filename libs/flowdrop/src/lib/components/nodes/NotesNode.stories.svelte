<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData, type StoryNode } from '../../stories/utils.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import NotesNode from './NotesNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Note',
    component: NotesNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  type NoteKind = 'info' | 'note' | 'warning' | 'success' | 'error';

  /** A note node: documentation on the canvas, in markdown, with no ports. */
  const note = (content: string | undefined, noteType: NoteKind = 'info') =>
    createSampleNodeData({
      label: 'Notes',
      config: { content, noteType },
      metadata: {
        node_type_id: 'notes',
        name: 'Notes',
        description: 'Documentation on the canvas.',
        category: 'helpers',
        type: 'note',
        inputs: [],
        outputs: []
      }
    });

  const kinds: Array<[NoteKind, string]> = [
    ['info', '## Info\n\nThe default look.'],
    ['note', '## Note\n\nA plain note.'],
    ['warning', '## Warning\n\nMax 100 requests a minute.'],
    ['success', '## Verified\n\nChecked against live data.'],
    ['error', '## Known problem\n\nThe loop never ends on an empty list.']
  ];
  const allKinds: StoryNode[] = kinds.map(([kind, text], i) => ({
    id: `note-${kind}`,
    data: note(text, kind),
    x: (i % 3) * 360,
    y: Math.floor(i / 3) * 300
  }));
</script>

<Story
  asChild
  name="A note"
  parameters={{
    docs: {
      description: {
        story:
          'Markdown text pinned to the canvas. It does not run and has no ports. Double-click it to edit.'
      }
    }
  }}
>
  <NodeDecorator
    data={note(
      '## Onboarding\n\nThis workflow handles **new users**.\n\n- Check the email\n- Create the account\n- Send the welcome mail'
    )}
  />
</Story>

<Story
  asChild
  name="Selected"
  parameters={{ docs: { description: { story: 'A note you clicked.' } } }}
>
  <NodeDecorator data={note('## Onboarding\n\nThis workflow handles **new users**.')} selected />
</Story>

<Story
  asChild
  name="Empty"
  parameters={{
    docs: { description: { story: 'A new note. The placeholder shows until you type.' } }
  }}
>
  <NodeDecorator data={note(undefined)} />
</Story>

<Story
  asChild
  name="Long text"
  parameters={{
    docs: {
      description: {
        story: 'The note grows with its text, in steps of the 20 px grid.'
      }
    }
  }}
>
  <NodeDecorator
    height={520}
    data={note(
      '# A long note\n\nThis note has a good deal of text so the wrapping and the grid snapping of the height can be checked. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Details\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n1. First step\n2. Second step'
    )}
  />
</Story>

<Story
  asChild
  name="All kinds"
  parameters={{
    docs: {
      description: {
        story: 'The five kinds a note can have: info, note, warning, success and error.'
      }
    }
  }}
>
  <NodeDecorator nodes={allKinds} width={1100} height={620} />
</Story>

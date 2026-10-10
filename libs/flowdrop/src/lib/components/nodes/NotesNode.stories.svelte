<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';

  const { Story } = defineMeta({
    title: 'Patterns/Nodes/NotesNode',
    tags: ['autodocs'],
    parameters: {
      layout: 'centered'
    }
  });
</script>

<Story name="Default">
  <NodeDecorator
    data={{
      label: 'Notes',
      config: {},
      metadata: {
        id: 'notes',
        name: 'Notes',
        description: 'Documentation node',
        category: 'helpers',
        version: '1.0.0',
        type: 'note',
        inputs: [],
        outputs: []
      }
    }}
  />
</Story>

<Story name="With Content">
  <NodeDecorator
    data={{
      label: 'Notes',
      config: {
        content:
          '## Important\n\nThis workflow handles **user onboarding**.\n\n- Step 1: Validate email\n- Step 2: Create account\n- Step 3: Send welcome email',
        noteType: 'info'
      },
      metadata: {
        id: 'notes',
        name: 'Notes',
        description: 'Documentation node',
        category: 'helpers',
        version: '1.0.0',
        type: 'note',
        inputs: [],
        outputs: []
      }
    }}
  />
</Story>

<Story name="Warning">
  <NodeDecorator
    data={{
      label: 'Warning',
      config: {
        content: 'Rate limiting is applied to this API call. Max 100 requests/minute.',
        noteType: 'warning'
      },
      metadata: {
        id: 'notes',
        name: 'Notes',
        description: 'Documentation node',
        category: 'helpers',
        version: '1.0.0',
        type: 'note',
        inputs: [],
        outputs: []
      }
    }}
  />
</Story>

<Story name="Headings And List">
  <NodeDecorator
    data={{
      label: 'Notes',
      config: {
        content:
          '# Workflow notes\n\n## Why two triggers?\n\nInsert and update fire **separately**; both feed *Data Shaper*.\n\n- Insert: new entity\n- Update: existing entity',
        noteType: 'info'
      },
      metadata: {
        id: 'notes',
        name: 'Notes',
        description: 'Documentation node',
        category: 'helpers',
        version: '1.0.0',
        type: 'note',
        inputs: [],
        outputs: []
      }
    }}
  />
</Story>

<Story name="Plain Note">
  <NodeDecorator
    data={{
      label: 'Notes',
      config: {
        content:
          '# Workflow notes\n\nWhen content is edited or updated, a message is shown to the user.',
        noteType: 'note'
      },
      metadata: {
        id: 'notes',
        name: 'Notes',
        description: 'Documentation node',
        category: 'helpers',
        version: '1.0.0',
        type: 'note',
        inputs: [],
        outputs: []
      }
    }}
  />
</Story>

<Story name="Long Text">
  <NodeDecorator
    data={{
      label: 'Notes',
      config: {
        content:
          '# A long note\n\nThis note has a good deal of text so the wrapping and the grid snapping of the height can be checked. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Details\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n1. First step\n2. Second step',
        noteType: 'info'
      },
      metadata: {
        id: 'notes',
        name: 'Notes',
        description: 'Documentation node',
        category: 'helpers',
        version: '1.0.0',
        type: 'note',
        inputs: [],
        outputs: []
      }
    }}
  />
</Story>

<Story name="Success">
  <NodeDecorator
    data={{
      label: 'Notes',
      config: {
        content: '## Verified\n\nChecked against production data.',
        noteType: 'success'
      },
      metadata: {
        id: 'notes',
        name: 'Notes',
        description: 'Documentation node',
        category: 'helpers',
        version: '1.0.0',
        type: 'note',
        inputs: [],
        outputs: []
      }
    }}
  />
</Story>

<Story name="Error">
  <NodeDecorator
    data={{
      label: 'Notes',
      config: {
        content: '## Known problem\n\nThe loop never ends when the list is empty.',
        noteType: 'error'
      },
      metadata: {
        id: 'notes',
        name: 'Notes',
        description: 'Documentation node',
        category: 'helpers',
        version: '1.0.0',
        type: 'note',
        inputs: [],
        outputs: []
      }
    }}
  />
</Story>

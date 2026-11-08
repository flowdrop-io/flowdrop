<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect, fn, userEvent, within } from 'storybook/test';
  import LockBanner from './LockBanner.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import { chatWorkflow } from '../stories/fixtures.js';
  import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
  import type { EditorLock } from '../types/lock.js';

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Lock banner',
    component: LockBanner,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });

  /** What a host such as fddo sends for a workflow other things use. */
  const inUse: EditorLock = {
    reasons: [
      {
        kind: 'in_use',
        message: 'Two forms use this workflow. A change that breaks them cannot be saved.',
        url: '/admin/flowdrop/workflows/support-chat/usage'
      },
      { kind: 'managed', message: 'A module provides this workflow.' }
    ],
    actions: [
      { id: 'edit', label: 'Edit', primary: true },
      { id: 'later', label: 'Not now' }
    ]
  };

  /** A lock the person cannot lift from the editor. */
  const noActions: EditorLock = {
    reasons: [
      { kind: 'managed', message: 'This workflow is managed in code and opens read-only.' }
    ],
    actions: []
  };

  const onLockAction = fn();
  const lockWith = (lock: EditorLock) => (fd: FlowDropInstance) => {
    fd.lock.set(lock);
    fd.lock.onAction((id) => onLockAction(id));
  };
</script>

<Story
  name="In use, with actions"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The strip above the canvas while the editor is locked: each reason as plain text, "Learn more" when the reason has a link, and the buttons the host chose. A button only reports its id (`onLockAction`); here "Edit" is what a host answers by removing the lock.'
      }
    }
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('This workflow is read-only')).toBeInTheDocument();
    await userEvent.click(canvas.getByTestId('lock-action-edit'));
    await expect(onLockAction).toHaveBeenCalledWith('edit');
  }}
>
  <InstanceDecorator workflow={chatWorkflow} setup={lockWith(inUse)} width="44rem">
    <LockBanner />
  </InstanceDecorator>
</Story>

<Story
  name="No actions"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'A lock with one reason and no buttons: the person can look but not edit here.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} setup={lockWith(noActions)} width="44rem">
    <LockBanner />
  </InstanceDecorator>
</Story>

<Story
  name="Not locked"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'With no lock the banner draws nothing.'
      }
    }
  }}
  play={async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('lock-banner')).toBeNull();
  }}
>
  <InstanceDecorator workflow={chatWorkflow} width="44rem">
    <LockBanner />
  </InstanceDecorator>
</Story>

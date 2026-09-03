// @vitest-environment node
/**
 * Render smoke tests for `WorkflowInterfaceEntryComposer` — the inline form
 * behind "Add input" / "Add output". Like `workflowInterfaceEditor.test.ts`
 * this renders through `svelte/server`, so only the opening step (the
 * bind-or-custom question) is reachable here; the picker step is state the
 * author enters by clicking, and its ordering logic is covered by
 * `rankBindablePorts` in `workflowInterface.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import WorkflowInterfaceEntryComposer from '$lib/components/WorkflowInterfaceEntryComposer.svelte';
import WorkflowInterfaceEditor from '$lib/components/WorkflowInterfaceEditor.svelte';
import type { Workflow } from '$lib/types/index.js';

const noop = () => {};

describe('WorkflowInterfaceEntryComposer', () => {
  it('opens on the bind-or-custom question with both choices', () => {
    const body = render(WorkflowInterfaceEntryComposer, {
      props: { direction: 'inputs', candidates: [], onBind: noop, onCustom: noop, onCancel: noop }
    }).body;

    expect(body).toContain('New input');
    expect(body).toContain('Step 1 of 2');
    expect(body).toContain('Bind it to an existing port?');
    expect(body).toContain('Yes, bind to a port');
    expect(body).toContain('No, add a custom entry');
    expect(body).toContain('Close without adding');
  });

  it('is titled for the output side too', () => {
    const body = render(WorkflowInterfaceEntryComposer, {
      props: { direction: 'outputs', candidates: [], onBind: noop, onCustom: noop, onCancel: noop }
    }).body;

    expect(body).toContain('New output');
  });

  it('is closed until the author asks for it — the editor renders no composer by default', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      name: 'Test Workflow',
      nodes: [],
      edges: [],
      metadata: {
        schemaVersion: '1.0.0',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      }
    };
    const body = render(WorkflowInterfaceEditor, { props: { workflow, onChange: noop } }).body;

    expect(body).not.toContain('Bind it to an existing port?');
    expect(body).toContain('Add input');
  });
});

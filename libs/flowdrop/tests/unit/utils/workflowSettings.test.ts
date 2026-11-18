import { describe, it, expect } from 'vitest';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { splitWorkflowSettings } from '$lib/utils/workflowSettings.js';
import { createTestWorkflow } from '../../utils/index.js';

describe('splitWorkflowSettings', () => {
  it('sends an absent description as empty, a present one as it is', () => {
    expect(splitWorkflowSettings({ name: 'W' }).description).toBe('');
    expect(splitWorkflowSettings({ name: 'W', description: 'text' }).description).toBe('text');
  });

  it('leaves format out and keeps every other key as config', () => {
    const { customConfig } = splitWorkflowSettings({
      name: 'W',
      description: 'd',
      format: 'flowdrop',
      retries: 2
    });
    expect(customConfig).toEqual({ retries: 2 });
  });

  it('a cleared description is stored as empty (the settings handler path)', () => {
    const fd = createFlowDropInstance({ id: `ws-${Math.random().toString(36).slice(2)}` });
    fd.workflow.initialize(createTestWorkflow({ name: 'W', description: 'old text' }));
    // The form reports a config without the cleared key.
    const { name, description } = splitWorkflowSettings({ name: 'W' });
    fd.workflow.batchUpdate({ name, description });
    expect(fd.workflow.current?.description).toBe('');
  });
});

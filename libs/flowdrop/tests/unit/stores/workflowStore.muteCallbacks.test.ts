/**
 * Unit Test - WorkflowStore.muteCallbacks
 *
 * While muted the host's dirty-state and workflow-change callbacks stay
 * silent; on release the host hears only what is still true.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createFlowDropInstance,
  type FlowDropInstance
} from '$lib/stores/instanceContainer.svelte.js';
import { createTestWorkflow, createTestNode } from '../../utils/index.js';

describe('WorkflowStore.muteCallbacks', () => {
  let fd: FlowDropInstance;
  let onDirty: ReturnType<typeof vi.fn>;
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fd = createFlowDropInstance({ id: `mute-test-${Math.random().toString(36).slice(2)}` });
    fd.workflow.initialize(
      createTestWorkflow({ nodes: [createTestNode({ id: 'n1' })], edges: [] })
    );
    onDirty = vi.fn();
    onChange = vi.fn();
    fd.workflow.setOnDirtyStateChange(onDirty);
    fd.workflow.setOnWorkflowChange(onChange);
  });

  const edit = () => fd.workflow.updateMetadata({ updatedAt: new Date().toISOString() });

  it('is silent while muted, then reports a still-dirty change once on release', () => {
    const release = fd.workflow.muteCallbacks();
    edit();
    edit();
    expect(onDirty).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    release();
    expect(onDirty).toHaveBeenCalledTimes(1);
    expect(onDirty).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][1]).toBe('metadata');
  });

  it('says nothing when the change was taken as the clean state before release', () => {
    const release = fd.workflow.muteCallbacks();
    edit();
    fd.workflow.initialize(fd.workflow.current!);
    release();

    expect(fd.workflow.isDirty).toBe(false);
    expect(onDirty).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('releasing twice does nothing the second time', () => {
    const release = fd.workflow.muteCallbacks();
    edit();
    release();
    onDirty.mockClear();
    onChange.mockClear();

    release();
    expect(onDirty).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('nested mutes report only when the outermost one is released', () => {
    const outer = fd.workflow.muteCallbacks();
    const inner = fd.workflow.muteCallbacks();
    edit();

    inner();
    expect(onDirty).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    outer();
    expect(onDirty).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

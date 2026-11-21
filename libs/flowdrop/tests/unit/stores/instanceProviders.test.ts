/**
 * `fd.readOnly` and `fd.formatAllowlist` are provided and withdrawn with
 * ownership, like the Test blocker: only the provider that set a value
 * withdraws it, the last provider wins, and withdrawing restores the previous.
 */
import { describe, it, expect } from 'vitest';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { createStoreCommandContext } from '$lib/commands/storeIntegration.svelte.js';
import { executeCommand } from '$lib/commands/executor.js';
import { saveRefusal } from '$lib/services/globalSave.js';

const wf = {
  id: 'wf',
  name: 'wf',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
} as never;

describe('readOnly providers', () => {
  it('is false with no provider, the last provider wins, withdrawal restores the previous', () => {
    const fd = createFlowDropInstance({ id: 'ro-1' });
    expect(fd.readOnly).toBe(false);
    const withdrawEditable = fd.provideReadOnly(() => false);
    const withdrawReadonly = fd.provideReadOnly(() => true);
    expect(fd.readOnly).toBe(true);
    withdrawReadonly();
    expect(fd.readOnly).toBe(false);
    withdrawEditable();
    expect(fd.readOnly).toBe(false);
    fd.destroy();
  });

  it('a provider that unmounts first does not clear the other one', () => {
    const fd = createFlowDropInstance({ id: 'ro-2' });
    const withdrawA = fd.provideReadOnly(() => true);
    const withdrawB = fd.provideReadOnly(() => false);
    withdrawA();
    expect(fd.readOnly).toBe(false);
    const withdrawC = fd.provideReadOnly(() => true);
    withdrawB();
    expect(fd.readOnly).toBe(true);
    withdrawC();
    expect(fd.readOnly).toBe(false);
    fd.destroy();
  });

  it('withdrawing twice is harmless', () => {
    const fd = createFlowDropInstance({ id: 'ro-3' });
    const w1 = fd.provideReadOnly(() => true);
    const w2 = fd.provideReadOnly(() => true);
    w1();
    w1();
    expect(fd.readOnly).toBe(true);
    w2();
    expect(fd.readOnly).toBe(false);
    fd.destroy();
  });

  it('a provider that reads reactive state is followed', () => {
    const fd = createFlowDropInstance({ id: 'ro-4' });
    let value = false;
    const withdraw = fd.provideReadOnly(() => value);
    expect(fd.readOnly).toBe(false);
    value = true;
    expect(fd.readOnly).toBe(true);
    withdraw();
    fd.destroy();
  });
});

describe('formatAllowlist providers', () => {
  it('last provider wins, withdrawal restores the previous, ownership is kept', () => {
    const fd = createFlowDropInstance({ id: 'fa-1' });
    expect(fd.formatAllowlist).toBeNull();
    const withdrawA = fd.provideFormatAllowlist(() => ['a']);
    const withdrawB = fd.provideFormatAllowlist(() => ['b']);
    expect(fd.formatAllowlist).toEqual(['b']);
    withdrawA();
    expect(fd.formatAllowlist).toEqual(['b']);
    withdrawB();
    expect(fd.formatAllowlist).toBeNull();
    fd.destroy();
  });

  it('allowedFormatOptions follows the winning provider', () => {
    const fd = createFlowDropInstance({ id: 'fa-2' });
    const all = fd.allowedFormatOptions().map((o) => o.const);
    expect(all.length).toBeGreaterThan(0);
    const withdraw = fd.provideFormatAllowlist(() => [all[0]]);
    expect(fd.allowedFormatOptions().map((o) => o.const)).toEqual([all[0]]);
    withdraw();
    expect(fd.allowedFormatOptions().map((o) => o.const)).toEqual(all);
    fd.destroy();
  });
});

describe('read-only scope', () => {
  const add = { type: 'add_node', nodeTypeId: 'x' } as never;

  it('refuses an agent context, not the host or Console context', () => {
    const fd = createFlowDropInstance({ id: 'scope-1' });
    fd.workflow.initialize(wf);
    const withdraw = fd.provideReadOnly(() => true);
    const agent = createStoreCommandContext([], undefined, fd, { agent: true });
    const host = createStoreCommandContext([], undefined, fd);
    expect(agent?.isLocked?.()).toBe(true);
    expect(host?.isLocked?.()).toBe(false);
    const refused = executeCommand(add, agent!);
    expect(!refused.ok && refused.code).toBe('LOCKED');
    const hostResult = executeCommand(add, host!);
    expect(!hostResult.ok && hostResult.code).not.toBe('LOCKED');
    withdraw();
    expect(agent?.isLocked?.()).toBe(false);
    fd.destroy();
  });

  it('the host context still answers to the lock', () => {
    const fd = createFlowDropInstance({ id: 'scope-2' });
    fd.workflow.initialize(wf);
    fd.lock.set({ reasons: [{ kind: 'in_use', message: 'In use.' }], actions: [] } as never);
    expect(createStoreCommandContext([], undefined, fd)?.isLocked?.()).toBe(true);
    fd.destroy();
  });

  it('save is refused on a read-only editor', () => {
    const fd = createFlowDropInstance({ id: 'scope-3' });
    fd.workflow.initialize(wf);
    expect(saveRefusal(fd)).toBeNull();
    const withdraw = fd.provideReadOnly(() => true);
    expect(saveRefusal(fd)).toMatch(/read-only/);
    withdraw();
    expect(saveRefusal(fd)).toBeNull();
    fd.destroy();
  });
});

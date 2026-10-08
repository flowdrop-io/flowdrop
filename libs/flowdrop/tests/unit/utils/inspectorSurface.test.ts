import { describe, it, expect } from 'vitest';
import {
  resolveInspectorSurface,
  closeTarget,
  nodeInspectorTabs,
  resolveNodeTab,
  openingNodeTab
} from '$lib/utils/inspectorSurface.js';

describe('resolveInspectorSurface', () => {
  it('shows nothing when nothing is open', () => {
    expect(resolveInspectorSurface({ hasNode: false, workflowOpen: false })).toBeNull();
  });

  it('shows the workflow tabs when only the workflow surface is open', () => {
    expect(resolveInspectorSurface({ hasNode: false, workflowOpen: true })).toBe('workflow');
  });

  it('shows the node when only a node is open', () => {
    expect(resolveInspectorSurface({ hasNode: true, workflowOpen: false })).toBe('node');
  });

  it('lets a node win over open workflow settings (the old precedence bug)', () => {
    expect(resolveInspectorSurface({ hasNode: true, workflowOpen: true })).toBe('node');
  });

  it('falls back to the workflow tabs once the node closes', () => {
    const open = { hasNode: true, workflowOpen: true };
    expect(closeTarget(resolveInspectorSurface(open))).toBe('node');
    expect(resolveInspectorSurface({ ...open, hasNode: false })).toBe('workflow');
  });
});

describe('Test mode', () => {
  it('has no inspector at rest: nothing open shows nothing, as in Edit mode', () => {
    expect(resolveInspectorSurface({ hasNode: false, workflowOpen: false })).toBeNull();
  });

  it('the workflow tabs can be closed, like the node', () => {
    expect(closeTarget('workflow')).toBe('workflow');
    expect(closeTarget('node')).toBe('node');
    expect(closeTarget(null)).toBeNull();
  });
});

describe('node inspector tabs', () => {
  it('Edit mode has no tab strip; Test mode has Config | Last run', () => {
    expect(nodeInspectorTabs('edit')).toEqual([]);
    expect(nodeInspectorTabs()).toEqual([]);
    expect(nodeInspectorTabs('test')).toEqual(['config', 'lastRun']);
  });

  it('Edit mode always resolves to Config', () => {
    expect(resolveNodeTab('lastRun', 'edit')).toBe('config');
    expect(resolveNodeTab('lastRun', 'test')).toBe('lastRun');
    expect(resolveNodeTab('config', 'test')).toBe('config');
  });

  it('a node opens on Last run in Test mode, on Config in Edit mode', () => {
    expect(openingNodeTab('test')).toBe('lastRun');
    expect(openingNodeTab('edit')).toBe('config');
    expect(openingNodeTab()).toBe('config');
  });
});

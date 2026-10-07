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
  it('rests on the workflow tabs when nothing is open', () => {
    expect(
      resolveInspectorSurface({ hasNode: false, workflowOpen: false, editorMode: 'test' })
    ).toBe('workflow');
  });

  it('still lets a node win over the resting workflow tabs', () => {
    expect(
      resolveInspectorSurface({ hasNode: true, workflowOpen: false, editorMode: 'test' })
    ).toBe('node');
  });

  it('keeps Edit mode inspector-on-demand', () => {
    expect(
      resolveInspectorSurface({ hasNode: false, workflowOpen: false, editorMode: 'edit' })
    ).toBeNull();
  });

  it('offers no close control for the resting workflow tabs, only for a node', () => {
    expect(closeTarget('workflow', 'test')).toBeNull();
    expect(closeTarget('node', 'test')).toBe('node');
    expect(closeTarget('workflow', 'edit')).toBe('workflow');
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

  it('a node opens on Last run only in Test mode and only if it ran', () => {
    expect(openingNodeTab('test', true)).toBe('lastRun');
    expect(openingNodeTab('test', false)).toBe('config');
    expect(openingNodeTab('edit', true)).toBe('config');
    expect(openingNodeTab()).toBe('config');
  });
});

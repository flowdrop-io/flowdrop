import { describe, it, expect, beforeEach } from 'vitest';
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  DEFAULT_SIDEBAR_WIDTHS,
  sidebarMaxWidth,
  clampSidebarWidth,
  resolveSidebarWidths
} from '$lib/utils/sidebarWidths.js';
import { DEFAULT_UI_SETTINGS } from '$lib/types/settings.js';
import { getUiSettings, resetSettings, updateSettings } from '$lib/stores/settingsStore.svelte.js';

describe('sidebar width clamping', () => {
  it('caps at half the editor, and at 560 on a wide one', () => {
    expect(sidebarMaxWidth(900)).toBe(450);
    expect(sidebarMaxWidth(1440)).toBe(560);
    expect(sidebarMaxWidth(2560)).toBe(SIDEBAR_MAX_WIDTH);
  });

  it('never caps below the floor, even in a tiny editor', () => {
    expect(sidebarMaxWidth(300)).toBe(SIDEBAR_MIN_WIDTH);
  });

  it('uses only the absolute maximum while the editor is unmeasured', () => {
    expect(sidebarMaxWidth(undefined)).toBe(SIDEBAR_MAX_WIDTH);
    expect(sidebarMaxWidth(0)).toBe(SIDEBAR_MAX_WIDTH);
  });

  it('clamps into [floor, max] and rounds', () => {
    expect(clampSidebarWidth(100, 1440)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(900, 1440)).toBe(560);
    expect(clampSidebarWidth(900, 800)).toBe(400);
    expect(clampSidebarWidth(333.6, 1440)).toBe(334);
  });

  it('falls back to a usable width for garbage', () => {
    expect(clampSidebarWidth(NaN, 1440)).toBe(DEFAULT_SIDEBAR_WIDTHS.nodes);
  });
});

describe('resolveSidebarWidths', () => {
  it('defaults to Nodes 280 and Assistant 380', () => {
    expect(resolveSidebarWidths(undefined)).toEqual({ nodes: 280, assistant: 380 });
    expect(resolveSidebarWidths(DEFAULT_UI_SETTINGS)).toEqual({ nodes: 280, assistant: 380 });
  });

  it('reads the legacy single width as the Nodes width', () => {
    expect(resolveSidebarWidths({ sidebarWidth: 340 })).toEqual({ nodes: 340, assistant: 380 });
  });

  it('prefers the per-tab width and tolerates a partial or invalid entry', () => {
    expect(
      resolveSidebarWidths({
        sidebarWidth: 340,
        sidebarWidths: { nodes: 300, assistant: 420 }
      })
    ).toEqual({ nodes: 300, assistant: 420 });
    expect(
      resolveSidebarWidths({
        sidebarWidths: { assistant: 'wide' } as unknown as { nodes: number; assistant: number }
      })
    ).toEqual({ nodes: 280, assistant: 380 });
  });

  it('clamps stored widths that are out of range', () => {
    expect(resolveSidebarWidths({ sidebarWidths: { nodes: 10, assistant: 5000 } })).toEqual({
      nodes: SIDEBAR_MIN_WIDTH,
      assistant: SIDEBAR_MAX_WIDTH
    });
  });
});

describe('sidebarWidths persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettings();
  });

  it('is part of the UI defaults, and the console opens at 220', () => {
    expect(getUiSettings().sidebarWidths).toEqual({ nodes: 280, assistant: 380 });
    expect(getUiSettings().consoleHeight).toBe(220);
  });

  it('saves a tab width and survives a reload of the stored settings', () => {
    updateSettings({ ui: { sidebarWidths: { nodes: 280, assistant: 450 } } });
    expect(getUiSettings().sidebarWidths).toEqual({ nodes: 280, assistant: 450 });
    const stored = JSON.parse(localStorage.getItem('flowdrop-settings') ?? '{}');
    expect(stored.ui.sidebarWidths).toEqual({ nodes: 280, assistant: 450 });
  });

  it('merges per-tab widths key by key', () => {
    updateSettings({ ui: { sidebarWidths: { nodes: 300, assistant: 380 } } });
    updateSettings({
      ui: { sidebarWidths: { assistant: 500 } as { nodes: number; assistant: number } }
    });
    expect(getUiSettings().sidebarWidths).toEqual({ nodes: 300, assistant: 500 });
  });

  it('saves the console height', () => {
    updateSettings({ ui: { consoleHeight: 340 } });
    expect(getUiSettings().consoleHeight).toBe(340);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SHEET_MIN_WIDTH,
  SHEET_MAX_WIDTH,
  DEFAULT_WORKFLOW_SHEET_WIDTH,
  sheetMaxWidth,
  clampSheetWidth,
  resolveWorkflowSheetWidth
} from '$lib/utils/sheetWidths.js';
import { getUiSettings, resetSettings, updateSettings } from '$lib/stores/settingsStore.svelte.js';

describe('workflow sheet width clamping', () => {
  it('caps at half the canvas region, and at 640 on a wide one', () => {
    expect(sheetMaxWidth(1000)).toBe(500);
    expect(sheetMaxWidth(1440)).toBe(640);
    expect(sheetMaxWidth(3000)).toBe(SHEET_MAX_WIDTH);
  });

  it('never caps below the floor, even in a narrow region', () => {
    expect(sheetMaxWidth(500)).toBe(SHEET_MIN_WIDTH);
  });

  it('uses only the absolute maximum while the region is unmeasured', () => {
    expect(sheetMaxWidth(undefined)).toBe(SHEET_MAX_WIDTH);
    expect(sheetMaxWidth(0)).toBe(SHEET_MAX_WIDTH);
  });

  it('clamps into [360, max] and rounds', () => {
    expect(clampSheetWidth(100, 1440)).toBe(SHEET_MIN_WIDTH);
    expect(clampSheetWidth(5000, 1440)).toBe(640);
    expect(clampSheetWidth(5000, 900)).toBe(450);
    expect(clampSheetWidth(480.6, 1440)).toBe(481);
    expect(clampSheetWidth(Number.NaN, 1440)).toBe(DEFAULT_WORKFLOW_SHEET_WIDTH);
  });
});

describe('resolveWorkflowSheetWidth', () => {
  it('opens at 420 with nothing saved', () => {
    expect(resolveWorkflowSheetWidth(undefined, 1440)).toBe(420);
    expect(resolveWorkflowSheetWidth({}, 1440)).toBe(420);
  });

  it('uses a saved width, clamped to the current region', () => {
    expect(resolveWorkflowSheetWidth({ sheetWidths: { workflow: 500 } }, 1440)).toBe(500);
    expect(resolveWorkflowSheetWidth({ sheetWidths: { workflow: 600 } }, 1000)).toBe(500);
  });

  it('ignores garbage', () => {
    const bad = { sheetWidths: { workflow: 'wide' } } as unknown as {
      sheetWidths: { workflow: number };
    };
    expect(resolveWorkflowSheetWidth(bad, 1440)).toBe(420);
    expect(resolveWorkflowSheetWidth({ sheetWidths: { workflow: -4 } }, 1440)).toBe(420);
  });
});

describe('sheetWidths persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettings();
  });

  it('defaults to 420 and survives a reload of the stored settings', () => {
    expect(getUiSettings().sheetWidths).toEqual({ workflow: 420 });
    updateSettings({ ui: { sheetWidths: { workflow: 520 } } });
    const stored = JSON.parse(localStorage.getItem('flowdrop-settings') ?? '{}');
    expect(stored.ui.sheetWidths).toEqual({ workflow: 520 });
  });

  it('settings saved before the key existed still get the default', () => {
    localStorage.setItem('flowdrop-settings', JSON.stringify({ ui: { sidebarCollapsed: true } }));
    resetSettings();
    updateSettings({ ui: { sidebarCollapsed: true } });
    expect(getUiSettings().sheetWidths).toEqual({ workflow: 420 });
  });
});

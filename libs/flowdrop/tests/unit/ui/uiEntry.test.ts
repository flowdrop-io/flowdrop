/**
 * The `@flowdrop/flowdrop/ui` entry's names. It is experimental in 2.x (see
 * ui/index.ts), so a name may still go in a minor release, but never by accident.
 */

import { describe, it, expect } from 'vitest';
import * as ui from '$lib/ui/index.js';
import type {
  MenuItem,
  MenuEntry,
  MenuGroup,
  MenuSeparator,
  SegmentedOption,
  SelectOption,
  StatusPillStatus,
  SurfaceTab,
  TabItem
} from '$lib/ui/index.js';

const EXPORTS = [
  'Button',
  'Card',
  'Checkbox',
  'Chip',
  'Combobox',
  'Composer',
  'EmptyState',
  'Field',
  'IconButton',
  'Menu',
  'Notice',
  'PanelHeader',
  'Segmented',
  'Select',
  'StatusPill',
  'Switch',
  'Tabs',
  'Toolbar',
  'ToolbarSeparator',
  'SurfaceOverlay',
  'TabbedSurface',
  'Input',
  'Textarea'
];

const FUNCTIONS = ['tabId', 'tabPanelId'];

describe('@flowdrop/flowdrop/ui', () => {
  it.each(EXPORTS)('exports %s as a component', (name) => {
    expect(typeof (ui as Record<string, unknown>)[name]).toBe('function');
  });

  it('exports the id helpers Tabs documents for panels', () => {
    for (const name of FUNCTIONS) {
      expect(typeof (ui as Record<string, unknown>)[name]).toBe('function');
    }
    expect(ui.tabId('pg', 'a')).toBe('pg-tab-a');
    expect(ui.tabPanelId('pg', 'a')).toBe('pg-panel-a');
  });

  it('exports the prop types a host needs', () => {
    // Compile-time only: svelte-check fails if a name is not reachable.
    const types = {
      item: { label: 'x' } as unknown as MenuItem,
      entry: [] as MenuEntry[],
      group: null as unknown as MenuGroup,
      separator: null as unknown as MenuSeparator,
      segmented: [] as SegmentedOption[],
      select: [] as SelectOption[],
      status: 'running' as StatusPillStatus,
      surface: [] as SurfaceTab[],
      tab: [] as TabItem[]
    };
    expect(types.status).toBe('running');
  });

  it('exports the Graphite skin and its CSS builder', () => {
    expect(ui.graphiteSkin.tokens).toBeTruthy();
    expect(ui.skinCss(ui.graphiteSkin)).toContain(':root:root {');
  });

  it('exports nothing beyond the listed names', () => {
    expect(Object.keys(ui).sort()).toEqual(
      [...EXPORTS, ...FUNCTIONS, 'graphiteSkin', 'skinCss'].sort()
    );
  });
});

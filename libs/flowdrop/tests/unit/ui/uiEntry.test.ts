/**
 * The `@flowdrop/flowdrop/ui` entry is semver-stable: every name listed here is
 * public API, and dropping one is a breaking change.
 */

import { describe, it, expect } from 'vitest';
import * as ui from '$lib/ui/index.js';

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

describe('@flowdrop/flowdrop/ui', () => {
  it.each(EXPORTS)('exports %s as a component', (name) => {
    expect(typeof (ui as Record<string, unknown>)[name]).toBe('function');
  });

  it('exports the Graphite skin and its CSS builder', () => {
    expect(ui.graphiteSkin.tokens).toBeTruthy();
    expect(ui.skinCss(ui.graphiteSkin)).toContain(':root:root {');
  });

  it('exports nothing beyond the listed names', () => {
    expect(Object.keys(ui).sort()).toEqual([...EXPORTS, 'graphiteSkin', 'skinCss'].sort());
  });
});

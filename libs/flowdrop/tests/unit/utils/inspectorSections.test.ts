import { describe, expect, it } from 'vitest';
import { nonEmptySections, splitInspectorSections } from '$lib/utils/inspectorSections.js';
import type { UISchemaElement } from '$lib/types/uischema.js';

const control = (key: string): UISchemaElement => ({
  type: 'Control',
  scope: `#/properties/${key}`
});
const group = (label: string, ...keys: string[]): UISchemaElement => ({
  type: 'Group',
  label,
  elements: keys.map(control)
});

describe('splitInspectorSections', () => {
  it('sends Ports and Execution groups to their tabs, unwrapped, and the rest to Config', () => {
    const sections = splitInspectorSections({
      type: 'VerticalLayout',
      elements: [
        control('format'),
        group('General', 'title'),
        group('Execution', 'retries'),
        group('Ports', 'ports')
      ]
    });
    expect(sections.config.map((e) => e.type)).toEqual(['Control', 'Group']);
    expect(sections.execution).toEqual([control('retries')]);
    expect(sections.ports).toEqual([control('ports')]);
    expect(nonEmptySections(sections)).toEqual(['config', 'ports', 'execution']);
  });

  it('reads nested vertical layouts as one list (the injected ports control wraps the tree)', () => {
    const sections = splitInspectorSections({
      type: 'VerticalLayout',
      elements: [
        { type: 'VerticalLayout', elements: [control('a'), group('Execution', 'b')] },
        group('Ports', 'ports')
      ]
    });
    expect(sections.config).toEqual([control('a')]);
    expect(sections.execution).toEqual([control('b')]);
    expect(sections.ports).toEqual([control('ports')]);
  });

  it('puts a bare ports control on the Ports tab and has no tabs for no schema', () => {
    const sections = splitInspectorSections({
      type: 'VerticalLayout',
      elements: [control('x'), control('ports')]
    });
    expect(nonEmptySections(sections)).toEqual(['config', 'ports']);
    expect(nonEmptySections(splitInspectorSections(undefined))).toEqual([]);
  });
});

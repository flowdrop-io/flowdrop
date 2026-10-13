import { describe, it, expect } from 'vitest';
import { inspect } from '../../../src/lib/layout/inspect.js';
import { DEFAULT_LAYOUT_OPTIONS as o, type LayoutGraph } from '../../../src/lib/layout/types.js';
import { demoCard, rightToLeft, tangled } from './fixtures.js';

describe('inspect', () => {
  it('tangled compose: wires, offsets, crossings, the caption spacing', () => {
    expect(inspect(tangled(), 'compose', o)).toEqual([
      'compose  y=160  inputs: contact, label  outputs: reply',
      '  in  contact ← lookup.contact   off by 40   crosses classify.label → compose.label',
      '  in  label   ← classify.label   off by 100   crosses lookup.contact → compose.contact',
      '  out reply   → loop.items   off by 20',
      '  spacing with cap1'
    ]);
  });

  it('names the overlap', () => {
    expect(inspect(tangled(), 'lookup', o)).toEqual([
      'lookup  y=200  inputs: email  outputs: contact',
      '  in  email   ← form.email   off by 100   crosses form.message → classify.text',
      '  out contact → compose.contact   off by 40   crosses classify.label → compose.label',
      '  overlap with classify'
    ]);
  });

  it('shows a loopback as loopback, and a clean card as none and ok', () => {
    const lines = inspect(tangled(), 'loop', o);
    expect(lines).toContain('  in  loop_back ← send.sent   loopback   crosses loop.item → send.to');
    expect(lines.at(-1)).toBe('  overlaps none · spacing ok');
  });

  it('a straight wire says straight; a backward one says backward', () => {
    const graph: LayoutGraph = {
      cards: [
        demoCard({ id: 'a', x: 0, y: 100, inputs: [], outputs: ['o'] }),
        demoCard({ id: 'b', x: 360, y: 100, inputs: ['i'], outputs: [] })
      ],
      wires: [
        { id: 'w', source: 'a', sourcePort: 'o', target: 'b', targetPort: 'i', loopback: false }
      ]
    };
    expect(inspect(graph, 'a', o)[1]).toBe('  out o → b.i   straight');
    expect(inspect(rightToLeft(), 'invoice', o)[1]).toContain('backward, off by');
  });

  it('a card without ports prints a dash', () => {
    const graph: LayoutGraph = {
      cards: [demoCard({ id: 'a', x: 0, y: 100, inputs: [], outputs: [] })],
      wires: []
    };
    expect(inspect(graph, 'a', o)).toEqual([
      'a  y=100  inputs: —  outputs: —',
      '  overlaps none · spacing ok'
    ]);
  });

  it('an annotation is a fixed obstacle, and its conflicts are named', () => {
    expect(inspect(tangled(), 'cap1', o)).toEqual([
      'cap1  caption  y=100  fixed obstacle',
      '  spacing with compose'
    ]);
    expect(inspect(tangled(), 'note1', o)).toEqual([
      'note1  note  y=480  fixed obstacle',
      '  overlaps none · spacing ok'
    ]);
  });

  it('an unknown node throws', () => {
    expect(() => inspect(tangled(), 'nope', o)).toThrow('Unknown node "nope"');
  });
});

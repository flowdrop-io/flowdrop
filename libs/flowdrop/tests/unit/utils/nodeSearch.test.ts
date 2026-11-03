import { describe, it, expect } from 'vitest';
import { searchNodeTypes } from '$lib/utils/nodeSearch.js';
import type { NodeMetadata } from '$lib/types/index.js';

const node = (id: string, name: string, description = '', tags?: string[]): NodeMetadata =>
  ({ id, name, description, tags, category: 'tools', node_type_id: id }) as unknown as NodeMetadata;

const ids = (nodes: NodeMetadata[]): string[] => nodes.map((n) => n.id);

describe('searchNodeTypes', () => {
  it('ranks exact name above prefix above contains', () => {
    const nodes = [node('c', 'Re-text'), node('b', 'Textual'), node('a', 'Text')];
    expect(ids(searchNodeTypes(nodes, 'text'))).toEqual(['a', 'b', 'c']);
  });

  it('ranks a word-start match above a plain contains match', () => {
    const nodes = [node('b', 'Subtext'), node('a', 'Raw text')];
    expect(ids(searchNodeTypes(nodes, 'text'))).toEqual(['a', 'b']);
  });

  it('ranks an exact tag above description-only matches', () => {
    const nodes = [
      node('d', 'Chat', 'Can summarize a thread'),
      node('t', 'Condenser', 'Shortens text', ['summarize'])
    ];
    expect(ids(searchNodeTypes(nodes, 'summarize'))).toEqual(['t', 'd']);
  });

  it('ranks a tag contains match below name contains and above description', () => {
    const nodes = [
      node('d', 'Alpha', 'about summaries'),
      node('t', 'Beta', '', ['summaries-list']),
      node('n', 'Gamma summaries')
    ];
    expect(ids(searchNodeTypes(nodes, 'summar'))).toEqual(['n', 't', 'd']);
  });

  it('keeps input order for equal scores', () => {
    const nodes = [node('z', 'Zeta tool'), node('a', 'Alpha tool'), node('m', 'Mid tool')];
    expect(ids(searchNodeTypes(nodes, 'tool'))).toEqual(['z', 'a', 'm']);
  });

  it('ignores case and surrounding spaces', () => {
    const nodes = [node('a', 'Text'), node('b', 'Other')];
    expect(ids(searchNodeTypes(nodes, '  TEXT '))).toEqual(['a']);
  });

  it('drops nodes that do not match', () => {
    expect(searchNodeTypes([node('a', 'Alpha')], 'zzz')).toEqual([]);
  });

  it('returns the input unchanged for an empty or blank query', () => {
    const nodes = [node('b', 'B'), node('a', 'A')];
    expect(searchNodeTypes(nodes, '')).toBe(nodes);
    expect(searchNodeTypes(nodes, '   ')).toBe(nodes);
  });
});

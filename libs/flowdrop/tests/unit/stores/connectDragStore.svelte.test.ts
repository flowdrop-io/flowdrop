import { describe, it, expect } from 'vitest';
import { ConnectDragStore, connectDragState } from '$lib/stores/connectDragStore.svelte.js';
import { PortCompatibilityChecker } from '$lib/utils/connections.js';
import type { PortConfig } from '$lib/types/index.js';

const config: PortConfig = {
  dataTypes: [
    { id: 'string', name: 'String', color: '#000' },
    { id: 'number', name: 'Number', color: '#000' },
    { id: 'trigger', name: 'Trigger', color: '#000' }
  ],
  // number casts to string; nothing goes the other way
  compatibilityRules: [{ from: 'number', to: 'string' }],
  defaultDataType: 'string'
};
const checker = new PortCompatibilityChecker(config);

const fromOutput = { nodeId: 'a', direction: 'output' as const, portId: 'n', dataType: 'number' };
const fromInput = { nodeId: 'a', direction: 'input' as const, portId: 's', dataType: 'string' };

describe('connectDragState', () => {
  it('changes nothing while no wire is dragged', () => {
    expect(
      connectDragState(checker, null, 'b', 'input', { id: 'x', dataType: 'string' })
    ).toBeNull();
  });

  it('dragging out of an output readies the inputs that take its type, output type first', () => {
    expect(
      connectDragState(checker, fromOutput, 'b', 'input', { id: 'x', dataType: 'number' })
    ).toBe('ready');
    expect(
      connectDragState(checker, fromOutput, 'b', 'input', { id: 'x', dataType: 'string' })
    ).toBe('ready');
    expect(
      connectDragState(checker, fromOutput, 'b', 'input', { id: 'x', dataType: 'trigger' })
    ).toBe('dull');
  });

  it('dragging back from an input readies the outputs that can feed it', () => {
    expect(
      connectDragState(checker, fromInput, 'b', 'output', { id: 'x', dataType: 'number' })
    ).toBe('ready');
    expect(
      connectDragState(checker, fromInput, 'b', 'output', { id: 'x', dataType: 'string' })
    ).toBe('ready');
    const numberIn = { ...fromInput, dataType: 'number' };
    expect(
      connectDragState(checker, numberIn, 'b', 'output', { id: 'x', dataType: 'string' })
    ).toBe('dull');
  });

  it('dulls the same direction, the dragged node and reserved inputs, never the port dragged from', () => {
    expect(
      connectDragState(checker, fromOutput, 'b', 'output', { id: 'x', dataType: 'number' })
    ).toBe('dull');
    expect(
      connectDragState(checker, fromOutput, 'a', 'input', { id: 'x', dataType: 'number' })
    ).toBe('dull');
    expect(
      connectDragState(checker, fromOutput, 'b', 'input', { id: 'event', dataType: 'number' }, true)
    ).toBe('dull');
    expect(
      connectDragState(checker, fromOutput, 'a', 'output', { id: 'n', dataType: 'number' })
    ).toBeNull();
  });
});

describe('ConnectDragStore', () => {
  it('holds the port a wire is dragged from until the drag ends', () => {
    const s = new ConnectDragStore();
    expect(s.from).toBeNull();
    s.set(fromOutput);
    expect(s.from).toEqual(fromOutput);
    s.set(null);
    expect(s.from).toBeNull();
  });
});

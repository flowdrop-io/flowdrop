/**
 * Unit Tests - Port Utilities
 *
 * Tests for applyPortOrder, byDefaultOrder, orderPortsFor, getPortTop,
 * isPortExposed, and isPortVisible.
 */

import { describe, it, expect } from 'vitest';
import {
  applyPortOrder,
  byDefaultOrder,
  isReservedPort,
  orderPortsFor,
  getPortTop,
  isPortExposed,
  isPortVisible
} from '$lib/utils/portUtils.js';
import type { NodePort } from '$lib/types/index.js';

// Minimal port factory — only the fields the helpers care about
function makePort(id: string, dataType = 'string'): NodePort {
  return { id, name: id, type: 'input', dataType };
}

const A = makePort('a');
const B = makePort('b');
const C = makePort('c');
const D = makePort('d');

describe('applyPortOrder', () => {
  describe('no-op cases', () => {
    it('returns the original array when orderedIds is undefined', () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, undefined);
      expect(result).toEqual([A, B, C]);
    });

    it('returns the original array when orderedIds is empty', () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, []);
      expect(result).toEqual([A, B, C]);
    });

    it('returns the original array when ports is empty', () => {
      const result = applyPortOrder([], ['a', 'b']);
      expect(result).toEqual([]);
    });
  });

  describe('full ordering', () => {
    it('sorts ports to match the given order exactly', () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ['c', 'a', 'b']);
      expect(result.map((p) => p.id)).toEqual(['c', 'a', 'b']);
    });

    it('handles a two-port swap', () => {
      const ports = [A, B];
      const result = applyPortOrder(ports, ['b', 'a']);
      expect(result.map((p) => p.id)).toEqual(['b', 'a']);
    });

    it('preserves order when orderedIds matches existing order', () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ['a', 'b', 'c']);
      expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('partial ordering — unlisted ports go to end', () => {
    it('places listed ports first, unlisted last in original order', () => {
      const ports = [A, B, C, D];
      // Only specify b and d — a and c should follow in their original relative order
      const result = applyPortOrder(ports, ['b', 'd']);
      expect(result.map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
    });

    it('places a single listed port first, rest follow in original order', () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ['c']);
      expect(result.map((p) => p.id)).toEqual(['c', 'a', 'b']);
    });

    it('preserves relative order of multiple unlisted ports', () => {
      const ports = [A, B, C, D];
      const result = applyPortOrder(ports, ['d']);
      // d first, then a, b, c in original order
      expect(result.map((p) => p.id)).toEqual(['d', 'a', 'b', 'c']);
    });
  });

  describe('unknown IDs in orderedIds', () => {
    it('ignores IDs in orderedIds that do not exist in ports', () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ['z', 'b', 'a']);
      // z doesn't exist — b and a are placed first, c follows
      expect(result.map((p) => p.id)).toEqual(['b', 'a', 'c']);
    });

    it('returns ports in original order when all orderedIds are unknown', () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ['x', 'y', 'z']);
      expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('does not mutate inputs', () => {
    it('does not mutate the original ports array', () => {
      const ports = [A, B, C];
      const original = [...ports];
      applyPortOrder(ports, ['c', 'a', 'b']);
      expect(ports).toEqual(original);
    });

    it('returns a new array instance', () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ['a', 'b', 'c']);
      expect(result).not.toBe(ports);
    });
  });

  describe('NaN guard — two or more unlisted ports', () => {
    it('handles multiple unlisted ports without corrupting sort (Infinity - Infinity guard)', () => {
      // All ports are unlisted — sort must not produce NaN comparisons
      const ports = [A, B, C, D];
      const result = applyPortOrder(ports, ['z']); // z doesn't exist, all 4 are unlisted
      // Original relative order must be preserved
      expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('preserves original order for all unlisted ports when orderedIds only covers some', () => {
      const ports = [A, B, C, D];
      const result = applyPortOrder(ports, ['b']);
      expect(result[0].id).toBe('b');
      // The rest — a, c, d — must maintain original relative order
      expect(result.slice(1).map((p) => p.id)).toEqual(['a', 'c', 'd']);
    });
  });

  describe('single port', () => {
    it('handles a single port with matching orderedId', () => {
      const result = applyPortOrder([A], ['a']);
      expect(result.map((p) => p.id)).toEqual(['a']);
    });

    it('handles a single port not in orderedIds', () => {
      const result = applyPortOrder([A], ['z']);
      expect(result.map((p) => p.id)).toEqual(['a']);
    });
  });
});

describe('getPortTop', () => {
  it('centers a single port at 40px', () => {
    expect(getPortTop(0, 1)).toBe(40);
  });

  it('places two ports at 20px and 60px', () => {
    expect(getPortTop(0, 2)).toBe(20);
    expect(getPortTop(1, 2)).toBe(60);
  });

  it('spaces three ports at 20, 60, 100px', () => {
    expect(getPortTop(0, 3)).toBe(20);
    expect(getPortTop(1, 3)).toBe(60);
    expect(getPortTop(2, 3)).toBe(100);
  });

  it('maintains 40px gap between consecutive ports', () => {
    for (let n = 2; n <= 5; n++) {
      for (let i = 0; i < n - 1; i++) {
        expect(getPortTop(i + 1, n) - getPortTop(i, n)).toBe(40);
      }
    }
  });
});

describe('byDefaultOrder', () => {
  function withOrder(id: string, displayOrder?: number): NodePort {
    return { ...makePort(id), displayOrder };
  }

  it('keeps declaration order when no weights are set (stable)', () => {
    const result = byDefaultOrder([A, B, C]);
    expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts ascending by displayOrder, defaulting missing weight to 0', () => {
    const ports = [withOrder('trigger', 100), withOrder('value'), withOrder('error', 120)];
    expect(byDefaultOrder(ports).map((p) => p.id)).toEqual(['value', 'trigger', 'error']);
  });

  it('breaks ties on declaration order', () => {
    const ports = [withOrder('a', 5), withOrder('b', 5), withOrder('c', 5)];
    expect(byDefaultOrder(ports).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input', () => {
    const ports = [withOrder('z', 9), withOrder('a', 1)];
    const original = [...ports];
    byDefaultOrder(ports);
    expect(ports).toEqual(original);
  });

  it('sinks reserved ports below author ports without an explicit weight', () => {
    const trigger: NodePort = {
      id: 'trigger',
      name: 'Trigger',
      type: 'input',
      dataType: 'trigger'
    };
    const tool: NodePort = { id: 'tool', name: 'Tool', type: 'input', dataType: 'tool' };
    const error: NodePort = { id: 'error', name: 'Error', type: 'output', dataType: 'string' };
    // Reserved ports declared first; they should still land at the bottom.
    const result = byDefaultOrder([trigger, error, A, tool, B]);
    expect(result.map((p) => p.id)).toEqual(['a', 'b', 'trigger', 'error', 'tool']);
  });

  it('lets an explicit displayOrder override the reserved default', () => {
    const trigger: NodePort = {
      id: 'trigger',
      name: 'Trigger',
      type: 'input',
      dataType: 'trigger',
      displayOrder: -1
    };
    expect(byDefaultOrder([A, trigger, B]).map((p) => p.id)).toEqual(['trigger', 'a', 'b']);
  });
});

describe('isReservedPort', () => {
  it('flags trigger/tool control ports by data type', () => {
    expect(isReservedPort({ id: 'x', type: 'input', dataType: 'trigger' })).toBe(true);
    expect(isReservedPort({ id: 'y', type: 'input', dataType: 'tool' })).toBe(true);
  });

  it('flags the reserved error output (id `error`, not an input)', () => {
    expect(isReservedPort({ id: 'error', type: 'output', dataType: 'string' })).toBe(true);
    // An input named `error` is not the reserved output port.
    expect(isReservedPort({ id: 'error', type: 'input', dataType: 'string' })).toBe(false);
  });

  it('does not flag ordinary author ports', () => {
    expect(isReservedPort({ id: 'value', type: 'input', dataType: 'string' })).toBe(false);
  });
});

describe('orderPortsFor', () => {
  const trigger: NodePort = { ...makePort('trigger'), displayOrder: 100 };

  it('falls back to default order when no entries are given', () => {
    const result = orderPortsFor([A, trigger, B], undefined);
    // trigger's weight pushes it to the bottom
    expect(result.map((p) => p.id)).toEqual(['a', 'b', 'trigger']);
  });

  it('applies the instance override over the default order', () => {
    const result = orderPortsFor([A, trigger, B], [{ id: 'trigger' }, { id: 'a' }]);
    // listed first in entry order, then the rest in default order
    expect(result.map((p) => p.id)).toEqual(['trigger', 'a', 'b']);
  });
});

describe('isPortExposed', () => {
  const port = makePort('data-1');
  const hiddenByDefault: NodePort = { ...makePort('error'), exposedByDefault: false };

  it('reads exposedByDefault when no entry overrides it', () => {
    expect(isPortExposed(port, undefined)).toBe(true);
    expect(isPortExposed(port, [])).toBe(true);
    expect(isPortExposed(hiddenByDefault, [{ id: 'error' }])).toBe(false);
  });

  it('honors an explicit entry override', () => {
    expect(isPortExposed(port, [{ id: 'data-1', exposed: false }])).toBe(false);
    expect(isPortExposed(hiddenByDefault, [{ id: 'error', exposed: true }])).toBe(true);
  });
});

describe('isPortVisible', () => {
  const port = makePort('data-1');
  // A reserved port that ships not-exposed (e.g. the error output).
  const hiddenByDefault: NodePort = {
    ...makePort('error'),
    type: 'output',
    exposedByDefault: false
  };

  describe('default exposure (no override)', () => {
    it('shows a port with no exposedByDefault (missing entry reads as exposed)', () => {
      expect(isPortVisible(port, 'input', undefined)).toBe(true);
      expect(isPortVisible(port, 'input', {})).toBe(true);
    });

    it('hides a port with exposedByDefault: false (e.g. the error output)', () => {
      expect(isPortVisible(hiddenByDefault, 'output', undefined)).toBe(false);
      expect(isPortVisible(hiddenByDefault, 'output', {})).toBe(false);
    });
  });

  describe('instance overrides win over the default', () => {
    it('hides a default-exposed port when overridden to false', () => {
      const result = isPortVisible(port, 'input', { inputs: [{ id: 'data-1', exposed: false }] });
      expect(result).toBe(false);
    });

    it('exposes a default-hidden port when overridden to true', () => {
      const result = isPortVisible(hiddenByDefault, 'output', {
        outputs: [{ id: 'error', exposed: true }]
      });
      expect(result).toBe(true);
    });

    it('reads the override from the matching direction only', () => {
      // An outputs override must not affect an input port of the same id.
      const result = isPortVisible(port, 'input', { outputs: [{ id: 'data-1', exposed: false }] });
      expect(result).toBe(true);
    });

    it('ignores an override for a different port id', () => {
      const result = isPortVisible(port, 'input', { inputs: [{ id: 'other', exposed: false }] });
      expect(result).toBe(true);
    });
  });
});

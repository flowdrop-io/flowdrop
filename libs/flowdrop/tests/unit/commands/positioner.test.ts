import { describe, it, expect } from 'vitest';
import { computeAutoPosition } from '../../../src/lib/commands/positioner.js';

describe('computeAutoPosition', () => {
  it('returns default start position for empty canvas', () => {
    expect(computeAutoPosition([])).toEqual({ x: 100, y: 100 });
  });

  it('places node 250px right of a single existing node', () => {
    const nodes = [{ position: { x: 200, y: 300 } }];
    expect(computeAutoPosition(nodes)).toEqual({ x: 450, y: 300 });
  });

  it('places node 250px right of the rightmost node among multiple', () => {
    const nodes = [
      { position: { x: 100, y: 100 } },
      { position: { x: 500, y: 200 } },
      { position: { x: 300, y: 150 } }
    ];
    expect(computeAutoPosition(nodes)).toEqual({ x: 750, y: 200 });
  });

  it('handles nodes with negative positions correctly', () => {
    const nodes = [{ position: { x: -300, y: -100 } }, { position: { x: -500, y: 50 } }];
    expect(computeAutoPosition(nodes)).toEqual({ x: -50, y: -100 });
  });

  it('handles all nodes at the same position', () => {
    const nodes = [{ position: { x: 100, y: 100 } }, { position: { x: 100, y: 100 } }];
    expect(computeAutoPosition(nodes)).toEqual({ x: 350, y: 100 });
  });
});

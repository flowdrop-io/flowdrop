/**
 * placementForNewNode: where a node added from the palette lands.
 */

import { describe, it, expect } from 'vitest';
import { placementForNewNode } from '$lib/helpers/workflowEditorHelper.js';

describe('placementForNewNode', () => {
  it('goes to the right of the selected node, on its row', () => {
    expect(placementForNewNode({ x: 100, y: 40, width: 200 }, { x: 5, y: 5 }, 32)).toEqual({
      x: 332,
      y: 40
    });
  });

  it('goes to the viewport centre with nothing selected', () => {
    expect(placementForNewNode(null, { x: 640, y: 360 }, 32)).toEqual({ x: 640, y: 360 });
  });
});

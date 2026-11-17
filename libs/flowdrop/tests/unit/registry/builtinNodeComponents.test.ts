/**
 * flowdrop-io/flowdrop#67: under Vite dev (esbuild prebundle) the built-in
 * `workflowNode` registration had no component, so every `default` node
 * rendered as an empty 0x0 card. The list was built while its module loaded,
 * inside an import cycle with the instance store. It is now built when an
 * instance is created; every built-in type must resolve to a component.
 */
import { describe, it, expect } from 'vitest';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { BUILTIN_NODE_TYPES } from '$lib/registry/builtinNodeTypes.js';
import { createBuiltinNodeComponents } from '$lib/registry/builtinNodes.js';

describe('built-in node components (#67)', () => {
  it('registers a component for every built-in type on a new instance', () => {
    const fd = createFlowDropInstance();
    const types = fd.nodes.getTypes();
    expect(types).toContain('workflowNode');
    for (const type of types) {
      expect(fd.nodes.getComponent(type), type).toBeTruthy();
    }
    for (const type of BUILTIN_NODE_TYPES) {
      expect(types).toContain(type);
    }
  });

  it('builds a fresh list on each call', () => {
    const a = createBuiltinNodeComponents();
    const b = createBuiltinNodeComponents();
    expect(a).not.toBe(b);
    expect(a.map((r) => r.type)).toEqual(b.map((r) => r.type));
  });
});

/**
 * Registry reactivity tests.
 *
 * Proves the BaseRegistry `$state` version-counter fix: a `$derived` reading a
 * registry (the exact flow components use — UniversalNode reads
 * `fd.nodes.getComponent(...)`, FormField/FormFieldLight read
 * `fd.fields.resolveFieldComponent(schema)`) must recompute when a node/field
 * is registered AFTER the derived is created. Before the fix the plain `Map`
 * backing store was invisible to Svelte, so late `registerCustom(...)` /
 * `register(...)` never invalidated the derived.
 *
 * The `.svelte.test.ts` filename is load-bearing: vite-plugin-svelte only
 * compiles runes in files matching the `.svelte.` infix. Per repo convention
 * (vitest resolves Svelte's server branch where `$effect` bodies never run) we
 * use `$effect.root` + `flushSync` + closure reads instead of effect logging.
 */

import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import type { FieldSchema } from '$lib/components/form/types.js';
import type { NodeComponentProps } from '$lib/registry/nodeComponentRegistry.js';
import type { Component } from 'svelte';

// Stand-in components — never rendered, only identity-compared.
const mockNodeComponent = (() => {}) as unknown as Component<NodeComponentProps>;
const mockFieldComponent = (() => {}) as never;

describe('registry reactivity (late registration invalidates $derived)', () => {
  it('fd.fields.resolveFieldComponent re-derives after a late register()', () => {
    const cleanup = $effect.root(() => {
      const fd = createFlowDropInstance();
      const schema: FieldSchema = { type: 'string', format: 'special-late' };

      const resolved = $derived(fd.fields.resolveFieldComponent(schema));
      const readResolved = () => resolved;

      // Fields start empty; nothing matches yet.
      expect(readResolved()).toBeNull();

      // Late registration — the documented `fd.fields.register(...)` flow.
      fd.fields.register('special-late', {
        component: mockFieldComponent,
        matcher: (s) => s.format === 'special-late',
        priority: 100
      });
      flushSync();

      expect(readResolved()).not.toBeNull();
      expect(readResolved()?.component).toBe(mockFieldComponent);
    });
    cleanup();
  });

  it('fd.nodes.getComponent re-derives after a late registerCustom()', () => {
    const cleanup = $effect.root(() => {
      const fd = createFlowDropInstance();

      const component = $derived(fd.nodes.getComponent('myproj:late'));
      const isRegistered = $derived(fd.nodes.has('myproj:late'));
      const readComponent = () => component;
      const readRegistered = () => isRegistered;

      // Unknown type falls back to the default node component, not the custom one.
      expect(readRegistered()).toBe(false);
      const fallback = readComponent();

      // Late registration — the documented `fd.nodes.registerCustom(...)` flow.
      fd.nodes.registerCustom('myproj:late', 'Late Node', mockNodeComponent);
      flushSync();

      expect(readRegistered()).toBe(true);
      expect(readComponent()).toBe(mockNodeComponent);
      expect(readComponent()).not.toBe(fallback);
    });
    cleanup();
  });

  it('fd.formats.getIds re-derives after a late register()', () => {
    const cleanup = $effect.root(() => {
      const fd = createFlowDropInstance();

      const ids = $derived(fd.formats.getIds());
      const readIds = () => ids;
      const initialCount = readIds().length;
      expect(readIds()).not.toContain('late-format');

      fd.formats.register({
        id: 'late-format',
        name: 'Late Format',
        export: (w) => JSON.stringify(w),
        import: (d) => JSON.parse(d)
      });
      flushSync();

      expect(readIds()).toContain('late-format');
      expect(readIds().length).toBe(initialCount + 1);
    });
    cleanup();
  });
});

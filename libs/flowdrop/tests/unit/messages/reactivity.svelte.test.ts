/**
 * Runes integration test for the messages system.
 *
 * The sibling `reactivity.test.ts` mocks `svelte` to verify the context
 * wrapper in isolation. This file complements it: it uses real Svelte 5
 * runes (`$state`, `$derived`, `$effect.root`, `flushSync`) to assert that a
 * consumer's reactive state propagates through `mergeMessages` end-to-end —
 * the actual contract `<FlowDrop messages={...}>` relies on.
 *
 * The `.svelte.test.ts` filename is load-bearing: vite-plugin-svelte only
 * compiles runes in files matching the `.svelte.` infix. A plain `.test.ts`
 * would error on the first `$state(...)` call.
 *
 * All reads of `$derived` values go through small closures (`() => merged...`)
 * so Svelte's static analyzer can see the reactive dependency — otherwise it
 * emits `state_referenced_locally` warnings even though the runtime value is
 * correct under `flushSync()`.
 */

import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { defaultMessages, mergeMessages } from '$lib/messages/index.js';
import type { Messages, MessagesOverride } from '$lib/messages/index.js';

describe('messages reactivity (runes)', () => {
  it('propagates $state-driven locale changes through mergeMessages', () => {
    const cleanup = $effect.root(() => {
      // Consumer-side reactive locale source.
      let locale = $state<'en' | 'de'>('en');

      // The kind of getter a real consumer would pass to <FlowDrop>.
      const override = (): MessagesOverride => ({
        common: { save: locale === 'en' ? 'Save' : 'Speichern' }
      });

      // What FlowDrop's root does internally with that getter.
      const merged: Messages = $derived(mergeMessages(defaultMessages, override()));
      const readSave = () => merged.common.save;

      expect(readSave()).toBe('Save');

      locale = 'de';
      flushSync();
      expect(readSave()).toBe('Speichern');

      locale = 'en';
      flushSync();
      expect(readSave()).toBe('Save');
    });
    cleanup();
  });

  it('keeps function-leaf identity when an unrelated branch changes', () => {
    // Function leaves must stay reference-stable across overrides that don't
    // touch them, otherwise every `{#each}` iteration would see new identities
    // and force unnecessary re-renders downstream.
    const cleanup = $effect.root(() => {
      let counter = $state(0);
      const override = (): MessagesOverride => ({ common: { save: `Save ${counter}` } });

      const merged: Messages = $derived(mergeMessages(defaultMessages, override()));
      const readMoveItemUp = () => merged.form.array.moveItemUp;

      const initial = readMoveItemUp();
      expect(initial).toBe(defaultMessages.form.array.moveItemUp);

      counter = 1;
      flushSync();
      expect(readMoveItemUp()).toBe(initial);

      counter = 2;
      flushSync();
      expect(readMoveItemUp()).toBe(initial);
    });
    cleanup();
  });

  it('handles undefined override (no merge work, base is returned)', () => {
    const cleanup = $effect.root(() => {
      let override = $state<MessagesOverride | undefined>(undefined);
      const merged: Messages = $derived(mergeMessages(defaultMessages, override));
      const readMerged = () => merged;

      expect(readMerged()).toBe(defaultMessages);

      override = { common: { save: 'Apply' } };
      flushSync();
      expect(readMerged()).not.toBe(defaultMessages);
      expect(readMerged().common.save).toBe('Apply');

      override = undefined;
      flushSync();
      expect(readMerged()).toBe(defaultMessages);
    });
    cleanup();
  });
});

/**
 * Reactivity contract for the messages system.
 *
 * The architecture stores a *getter* `() => Messages` in context, not a
 * snapshot — the whole point is that consumer-side reactivity (paraglide,
 * sveltekit-i18n, any reactive store) propagates through `m()` without
 * flowdrop owning a subscription. This test pins that contract:
 *
 *   - `setMessages(getter)` does NOT cache the getter's current return.
 *   - `getMessages()()` invokes the getter on every call.
 *   - `m()` is a thin shorthand for `getMessages()()`.
 *
 * We mock svelte's `getContext`/`setContext` because the runes-based
 * reactivity doesn't need a mounted component to verify the contract;
 * what matters is that the read path goes back to the consumer's source
 * every time. A previous version of this test mounted a `.svelte`
 * fixture but vitest+happy-dom resolves `svelte` to its server entry
 * here, where `mount` and `$state` are unavailable. The contract being
 * tested isn't DOM-shaped, so we test it directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

let contextStore = new Map<symbol, unknown>();

vi.mock('svelte', () => ({
  setContext: <T>(key: symbol, value: T) => {
    contextStore.set(key, value);
    return value;
  },
  getContext: <T>(key: symbol): T | undefined => contextStore.get(key) as T | undefined
}));

// Imports must come after the mock is registered.
import {
  setMessages,
  getMessages,
  m,
  defaultMessages,
  mergeMessages
} from '$lib/messages/index.js';
import type { Messages, MessagesOverride } from '$lib/messages/index.js';

beforeEach(() => {
  contextStore = new Map();
});

describe('messages reactivity', () => {
  it('m() reads the consumer getter on every call', () => {
    // Locale source the consumer controls — flipping it must propagate
    // without flowdrop owning a subscription.
    let override: MessagesOverride = { common: { save: 'Apply' } };

    setMessages(() => mergeMessages(defaultMessages, override));

    expect(m().common.save).toBe('Apply');

    override = { common: { save: 'Anwenden' } };
    expect(m().common.save).toBe('Anwenden');

    // Cleared override falls back to English defaults — no manual reset.
    override = {};
    expect(m().common.save).toBe(defaultMessages.common.save);
  });

  it('getMessages() returns a getter, not a cached snapshot', () => {
    let counter = 0;
    const getter = (): Messages => {
      counter++;
      return defaultMessages;
    };

    setMessages(getter);

    const fn = getMessages();
    fn();
    fn();
    fn();

    // Each call invokes the consumer's getter — that's the whole point.
    // If `getMessages` ever starts caching, this fails and someone needs
    // to read the comment in `context.ts` before "fixing" it.
    expect(counter).toBe(3);
  });

  it('falls back to defaultMessages when no provider is set', () => {
    expect(m().common.save).toBe(defaultMessages.common.save);
    expect(m().form.array.add).toBe(defaultMessages.form.array.add);
  });

  it('preserves function-leaf identity across overrides that do not touch them', () => {
    // Function leaves are call-site invariant per `DeepPartial` (see
    // types.ts). If the merge accidentally rewraps unchanged function
    // leaves, every parameterised call site would see a new reference
    // every render — a real perf hazard inside `{#each}` blocks.
    const merged1 = mergeMessages(defaultMessages, { common: { save: 'Apply' } });
    const merged2 = mergeMessages(defaultMessages, { common: { save: 'Save!' } });

    expect(merged1.form.array.moveItemUp).toBe(merged2.form.array.moveItemUp);
    expect(merged1.form.array.moveItemUp).toBe(defaultMessages.form.array.moveItemUp);
  });
});

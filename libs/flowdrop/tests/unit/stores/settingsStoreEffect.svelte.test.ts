/**
 * updateSettings() called from an effect must not make that effect depend on
 * the settings it merges into: the write would re-run the effect, forever
 * (effect_update_depth_exceeded, seen in the LoopbackLanes stories).
 */

import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { getEditorSettings, updateSettings } from '$lib/stores/settingsStore.svelte.js';

describe('updateSettings inside an effect', () => {
  it('does not subscribe the effect to the settings it writes', () => {
    let runs = 0;
    const before = getEditorSettings().showMinimap;
    const stop = $effect.root(() => {
      $effect(() => {
        runs++;
        updateSettings({ editor: { showMinimap: !before } });
      });
    });
    flushSync();
    // A later write elsewhere must not re-run it either.
    updateSettings({ editor: { showMinimap: before } });
    flushSync();
    stop();
    expect(runs).toBe(1);
    expect(getEditorSettings().showMinimap).toBe(before);
  });
});

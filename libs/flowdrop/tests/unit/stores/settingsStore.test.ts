/**
 * Unit Test - Settings Store persistence
 *
 * Settings are page-global by design, so the store is module-level state.
 * Each test re-imports the module via vi.resetModules() + dynamic import to
 * simulate a fresh page load reading what an earlier "session" persisted to
 * localStorage.
 *
 * Regression focus: hosts reported the theme light/dark preference "never
 * persisting" — initializeSettings({ defaults }) used to merge host defaults
 * OVER the user's saved snapshot and re-save it, resetting the user's choice
 * on every page load.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const SETTINGS_STORAGE_KEY = 'flowdrop-settings';

type SettingsModule = typeof import('$lib/stores/settingsStore.svelte.js');

/** Import a fresh copy of the module, as a new page load would */
async function freshStore(): Promise<SettingsModule> {
  vi.resetModules();
  return import('$lib/stores/settingsStore.svelte.js');
}

function readPersisted(): Record<string, any> | null {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

describe('settingsStore persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    // The module reads matchMedia at import time (system theme detection).
    // The global setup.ts mock is a vi.fn whose implementation is wiped by
    // the global afterEach(vi.clearAllMocks), and freshStore() re-imports
    // the module after that — so stub a plain function here instead.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })) as unknown as typeof window.matchMedia;
  });

  describe('write path', () => {
    it('setTheme persists the preference to localStorage immediately', async () => {
      const store = await freshStore();

      store.setTheme('dark');

      expect(readPersisted()?.theme?.preference).toBe('dark');
    });

    it('cycleTheme persists each step (light -> dark -> auto -> light)', async () => {
      const store = await freshStore();

      store.setTheme('light');
      store.cycleTheme();
      expect(readPersisted()?.theme?.preference).toBe('dark');

      store.cycleTheme();
      expect(readPersisted()?.theme?.preference).toBe('auto');

      store.cycleTheme();
      expect(readPersisted()?.theme?.preference).toBe('light');
    });

    it('updateSettings persists non-theme categories too', async () => {
      const store = await freshStore();

      store.updateSettings({ editor: { showGrid: false } });

      expect(readPersisted()?.editor?.showGrid).toBe(false);
    });
  });

  describe('read path (new page load)', () => {
    it('a fresh module load restores the persisted theme preference', async () => {
      const first = await freshStore();
      first.setTheme('dark');

      const second = await freshStore();

      expect(second.getTheme()).toBe('dark');
      expect(second.getResolvedTheme()).toBe('dark');
    });

    it('missing keys in an old snapshot fall back to defaults', async () => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: { preference: 'dark' } }));

      const store = await freshStore();

      expect(store.getTheme()).toBe('dark');
      // Everything not in the snapshot comes from DEFAULT_SETTINGS
      expect(store.getEditorSettings().showGrid).toBe(true);
    });

    it('corrupt storage falls back to defaults instead of throwing', async () => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json');

      const store = await freshStore();

      // DEFAULT_THEME_SETTINGS.preference is 'dark'
      expect(store.getTheme()).toBe('dark');
    });
  });

  describe('initializeSettings({ defaults }) — host defaults seed, never clobber', () => {
    it('first run: host defaults apply when nothing is persisted', async () => {
      const store = await freshStore();

      await store.initializeSettings({
        defaults: { theme: { preference: 'dark' } }
      });

      expect(store.getTheme()).toBe('dark');
    });

    it('first run: seeding does not eagerly write to localStorage', async () => {
      const store = await freshStore();

      await store.initializeSettings({
        defaults: { theme: { preference: 'dark' } }
      });

      // Storage stays user-driven — written by updateSettings on real changes
      expect(readPersisted()).toBeNull();
    });

    it("returning user: persisted preference WINS over host defaults (the 'theme never persists' regression)", async () => {
      // Session 1: user switches to dark
      const first = await freshStore();
      first.setTheme('dark');

      // Session 2 (reload): host mounts with a light default
      const second = await freshStore();
      await second.initializeSettings({
        defaults: { theme: { preference: 'light' } }
      });

      expect(second.getTheme()).toBe('dark');
      // And the saved snapshot was not overwritten
      expect(readPersisted()?.theme?.preference).toBe('dark');
    });

    it('host defaults still apply for categories the user never saved', async () => {
      // User has only ever saved a theme choice
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: { preference: 'dark' } }));

      const store = await freshStore();
      await store.initializeSettings({
        defaults: { editor: { showGrid: false } }
      });

      expect(store.getTheme()).toBe('dark');
      expect(store.getEditorSettings().showGrid).toBe(false);
    });
  });

  describe('theme application (data-theme attribute)', () => {
    it('initializeTheme applies the persisted preference to the document', async () => {
      const first = await freshStore();
      first.setTheme('dark');

      const second = await freshStore();
      second.initializeTheme();

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      second.cleanupThemeSubscription();
    });

    it('initializeTheme is idempotent — repeated calls do not stack effect roots', async () => {
      const store = await freshStore();
      store.setTheme('light');

      store.initializeTheme();
      store.initializeTheme(); // second mount on the same page

      // One cleanup tears the whole system down; a second init after
      // cleanup must be able to wire it again.
      store.cleanupThemeSubscription();
      store.setTheme('dark');
      store.initializeTheme();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      store.cleanupThemeSubscription();
    });
  });
});

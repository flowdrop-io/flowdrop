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

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const SETTINGS_STORAGE_KEY = 'flowdrop-settings';

type SettingsModule = typeof import('$lib/stores/settingsStore.svelte.js');

/** Import a fresh copy of the module, as a new page load would */
async function freshStore(): Promise<SettingsModule> {
  vi.resetModules();
  return import('$lib/stores/settingsStore.svelte.js');
}

// The first import transforms the store's whole module graph. Under a full
// parallel run that took over the 10 s test timeout (M3 gate); pay it once
// here so each test's re-import only re-evaluates.
beforeAll(async () => {
  await import('$lib/stores/settingsStore.svelte.js');
}, 60_000);

type PersistedSettings = {
  theme?: { preference?: string };
  editor?: { showGrid?: boolean };
  [key: string]: unknown;
};

function readPersisted(): PersistedSettings | null {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as PersistedSettings) : null;
}

// Each test re-evaluates the store graph after vi.resetModules(); on the Linux
// gate box under a full parallel run that alone has passed 10 s (2026-10-09).
describe('settingsStore persistence', { timeout: 30_000 }, () => {
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

      // DEFAULT_THEME_SETTINGS.preference is 'light'
      expect(store.getTheme()).toBe('light');
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

  describe('theme wiring', () => {
    it('initializeTheme does not put data-theme on <html> (the scope element carries it)', async () => {
      document.documentElement.removeAttribute('data-theme');
      const first = await freshStore();
      first.setTheme('dark');

      const second = await freshStore();
      second.initializeTheme();

      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
      expect(second.getResolvedTheme()).toBe('dark');
      expect(second.isThemeInitialized()).toBe(true);
      second.cleanupThemeSubscription();
      expect(second.isThemeInitialized()).toBe(false);
    });

    it('initializeTheme is idempotent — repeated calls do not stack listeners', async () => {
      const store = await freshStore();
      const add = vi.spyOn(window.matchMedia('(prefers-color-scheme: dark)'), 'addEventListener');
      store.initializeTheme();
      store.initializeTheme(); // second mount on the same page
      store.cleanupThemeSubscription();
      store.initializeTheme(); // wires again after cleanup
      expect(store.isThemeInitialized()).toBe(true);
      store.cleanupThemeSubscription();
      add.mockRestore();
    });
  });

  describe('host colour scheme (colorScheme mount option)', () => {
    type Host = {
      value: 'light' | 'dark' | 'auto';
      label: string;
      subscribe?: (cb: (v: 'light' | 'dark' | 'auto') => void) => () => void;
    };
    const host = (over: Partial<Host> = {}) => ({
      host: { value: 'dark' as const, label: 'Match host', ...over }
    });

    it('without the option nothing changes: default light, no host choice', async () => {
      const store = await freshStore();
      await store.initializeSettings({});
      expect(store.getTheme()).toBe('light');
      expect(store.getHostColorScheme()).toBeNull();
    });

    it("'host' becomes the default and follows the host value", async () => {
      const store = await freshStore();
      await store.initializeSettings({ colorScheme: host({ value: 'dark' }) });
      expect(store.getTheme()).toBe('host');
      expect(store.getResolvedTheme()).toBe('dark');
      expect(store.getHostColorScheme()).toMatchObject({ label: 'Match host', resolved: 'dark' });
    });

    it('a host value of auto follows the operating system', async () => {
      window.matchMedia = ((q: string) => ({
        matches: true,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {}
      })) as unknown as typeof window.matchMedia;
      const store = await freshStore();
      await store.initializeSettings({ colorScheme: host({ value: 'auto' }) });
      expect(store.getResolvedTheme()).toBe('dark');
      expect(store.getHostColorScheme()?.value).toBe('auto');
    });

    it('subscribe re-resolves on live host changes and unsubscribes on replacement', async () => {
      const store = await freshStore();
      let push: (v: 'light' | 'dark' | 'auto') => void = () => {};
      const unsubscribe = vi.fn();
      await store.initializeSettings({
        colorScheme: host({
          value: 'light',
          subscribe: (cb) => {
            push = cb;
            return unsubscribe;
          }
        })
      });
      expect(store.getResolvedTheme()).toBe('light');
      push('dark');
      expect(store.getResolvedTheme()).toBe('dark');
      store.setHostColorScheme(null);
      expect(unsubscribe).toHaveBeenCalled();
      expect(store.getHostColorScheme()).toBeNull();
    });

    it("a stored 'host' without the option falls back to auto", async () => {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ theme: { preference: 'host', explicit: true } })
      );
      const store = await freshStore();
      expect(store.getTheme()).toBe('auto');
      expect(store.getResolvedTheme()).toBe('light'); // system is light in this suite
    });

    it('resolveColorScheme covers every preference', async () => {
      const { resolveColorScheme: r } = await freshStore();
      expect(r('light', 'dark', 'dark')).toBe('light');
      expect(r('dark', null, 'light')).toBe('dark');
      expect(r('auto', 'light', 'dark')).toBe('dark');
      expect(r('host', 'light', 'dark')).toBe('light');
      expect(r('host', 'auto', 'dark')).toBe('dark');
      expect(r('host', null, 'dark')).toBe('dark');
    });

    describe('migration of a saved preference', () => {
      it("a saved 'auto' the user never chose moves to 'host'", async () => {
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({ theme: { preference: 'auto' } })
        );
        const store = await freshStore();
        await store.initializeSettings({ colorScheme: host() });
        expect(store.getTheme()).toBe('host');
      });

      it("an explicit 'auto' is kept", async () => {
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({ theme: { preference: 'auto', explicit: true } })
        );
        const store = await freshStore();
        await store.initializeSettings({ colorScheme: host() });
        expect(store.getTheme()).toBe('auto');
      });

      it('explicit Light and Dark are kept, marked or not', async () => {
        for (const preference of ['light', 'dark']) {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: { preference } }));
          const store = await freshStore();
          await store.initializeSettings({ colorScheme: host() });
          expect(store.getTheme()).toBe(preference);
        }
      });

      it('the user picking a scheme sets the marker, and it survives a reload', async () => {
        const first = await freshStore();
        await first.initializeSettings({ colorScheme: host() });
        first.setTheme('auto');
        expect(readPersisted()?.theme).toMatchObject({ preference: 'auto', explicit: true });

        const second = await freshStore();
        await second.initializeSettings({ colorScheme: host() });
        expect(second.getTheme()).toBe('auto');
      });

      it('changing the preference through updateSettings marks it too', async () => {
        const store = await freshStore();
        store.updateSettings({ theme: { preference: 'dark' } });
        expect(readPersisted()?.theme).toMatchObject({ explicit: true });
      });

      it('without the option a saved auto is untouched', async () => {
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({ theme: { preference: 'auto' } })
        );
        const store = await freshStore();
        await store.initializeSettings({});
        expect(store.getTheme()).toBe('auto');
      });

      it('migrateSavedTheme leaves snapshots without a theme alone', async () => {
        const { migrateSavedTheme } = await freshStore();
        const raw = { editor: { showGrid: false } } as never;
        expect(migrateSavedTheme(raw, true)).toBe(raw);
      });
    });

    it("reset returns to 'host' when the option is given", async () => {
      const store = await freshStore();
      await store.initializeSettings({ colorScheme: host() });
      store.setTheme('dark');
      store.resetSettings();
      expect(store.getTheme()).toBe('host');
    });

    it('cycleTheme visits the host choice instead of auto', async () => {
      const store = await freshStore();
      await store.initializeSettings({ colorScheme: host() });
      store.setTheme('light');
      store.cycleTheme();
      expect(store.getTheme()).toBe('dark');
      store.cycleTheme();
      expect(store.getTheme()).toBe('host');
    });
  });

  describe('grid size (Graphite G8, D3)', () => {
    it.each([5, 15, 25, 30, 40, 50])('migrates a stored %i to 20', async (size) => {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ editor: { gridSize: size, showGrid: false } })
      );
      const store = await freshStore();
      expect(store.getEditorSettings().gridSize).toBe(20);
      // The rest of the snapshot is untouched.
      expect(store.getEditorSettings().showGrid).toBe(false);
    });

    it.each([10, 20])('keeps a stored %i', async (size) => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ editor: { gridSize: size } }));
      const store = await freshStore();
      expect(store.getEditorSettings().gridSize).toBe(size);
    });

    it('migrates a host default and an update outside 10 or 20', async () => {
      const store = await freshStore();
      await store.initializeSettings({ defaults: { editor: { gridSize: 30 } } as never });
      expect(store.getEditorSettings().gridSize).toBe(20);
      store.updateSettings({ editor: { gridSize: 10 } });
      expect(store.getEditorSettings().gridSize).toBe(10);
      store.updateSettings({ editor: { gridSize: 15 } });
      expect(store.getEditorSettings().gridSize).toBe(20);
    });
  });
});

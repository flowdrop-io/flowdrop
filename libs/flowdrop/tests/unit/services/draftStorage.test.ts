/**
 * Unit Tests - Draft Storage Service
 *
 * Tests for localStorage-based draft saving and auto-save functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getDraftStorageKey,
  migrateLegacyDraftKey,
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftMetadata,
  clearAllDrafts,
  setDraftStorage,
  getDraftStorage,
  resolveDraftStorage,
  DraftAutoSaveManager,
  type DraftStorageAdapter
} from '$lib/services/draftStorage.js';
import { createTestWorkflow } from '../../utils/index.js';

/**
 * Build a Web Storage mock backed by a Map
 */
function createMockWebStorage(backing: Map<string, string>): Storage {
  return {
    getItem: vi.fn((key: string) => backing.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      backing.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      backing.delete(key);
    }),
    clear: vi.fn(() => {
      backing.clear();
    }),
    key: vi.fn((index: number) => {
      const keys = Array.from(backing.keys());
      return keys[index] ?? null;
    }),
    get length() {
      return backing.size;
    }
  } as Storage;
}

describe('Draft Storage Service', () => {
  // Mock localStorage / sessionStorage
  let mockStorage: Map<string, string>;
  let mockSessionStorage: Map<string, string>;

  beforeEach(() => {
    // Create fresh mock storages for each test
    mockStorage = new Map();
    mockSessionStorage = new Map();

    global.localStorage = createMockWebStorage(mockStorage);
    global.sessionStorage = createMockWebStorage(mockSessionStorage);
  });

  afterEach(() => {
    // Restore the default backend for subsequent tests
    setDraftStorage('local');
    vi.clearAllMocks();
  });

  describe('getDraftStorageKey', () => {
    it('should return custom key when provided', () => {
      const customKey = 'my-custom-draft-key';
      const key = getDraftStorageKey('workflow-id', customKey);
      expect(key).toBe(customKey);
    });

    it('should generate a default-instance-scoped key with workflow ID', () => {
      const key = getDraftStorageKey('workflow-123');
      expect(key).toBe('flowdrop:draft:default:workflow-123');
    });

    it("should use 'new' suffix when no workflow ID", () => {
      const key = getDraftStorageKey();
      expect(key).toBe('flowdrop:draft:default:new');
    });

    it('should prefer custom key over workflow ID', () => {
      const key = getDraftStorageKey('workflow-123', 'custom');
      expect(key).toBe('custom');
    });

    it('should scope by an explicit instance prefix', () => {
      const key = getDraftStorageKey('workflow-123', undefined, 'flowdrop:draft:left');
      expect(key).toBe('flowdrop:draft:left:workflow-123');
    });
  });

  describe('migrateLegacyDraftKey', () => {
    it('moves a 1.x bare-key draft to the scoped key and removes the legacy key', () => {
      mockStorage.set('flowdrop:draft:wf-1', '{"workflow":{},"metadata":{}}');

      migrateLegacyDraftKey('flowdrop:draft:wf-1', 'flowdrop:draft:default:wf-1');

      expect(mockStorage.get('flowdrop:draft:default:wf-1')).toBe('{"workflow":{},"metadata":{}}');
      expect(mockStorage.has('flowdrop:draft:wf-1')).toBe(false);
    });

    it('does not overwrite an existing scoped draft', () => {
      mockStorage.set('flowdrop:draft:wf-1', 'legacy');
      mockStorage.set('flowdrop:draft:default:wf-1', 'scoped');

      migrateLegacyDraftKey('flowdrop:draft:wf-1', 'flowdrop:draft:default:wf-1');

      expect(mockStorage.get('flowdrop:draft:default:wf-1')).toBe('scoped');
      // The legacy key is left alone when the scoped key already exists
      expect(mockStorage.get('flowdrop:draft:wf-1')).toBe('legacy');
    });

    it('is a no-op when there is no legacy draft', () => {
      migrateLegacyDraftKey('flowdrop:draft:wf-1', 'flowdrop:draft:default:wf-1');
      expect(mockStorage.size).toBe(0);
    });
  });

  describe('saveDraft', () => {
    it('should save draft to localStorage', () => {
      const workflow = createTestWorkflow();
      const storageKey = 'test-draft';

      const result = saveDraft(workflow, storageKey);

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(storageKey, expect.any(String));
    });

    it('should include metadata when saving', () => {
      const workflow = createTestWorkflow({ name: 'My Workflow' });
      const storageKey = 'test-draft';

      saveDraft(workflow, storageKey);

      const saved = mockStorage.get(storageKey);
      expect(saved).toBeDefined();

      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveProperty('workflow');
      expect(parsed).toHaveProperty('metadata');
      expect(parsed.metadata).toHaveProperty('savedAt');
      expect(parsed.metadata.workflowName).toBe('My Workflow');
    });

    it('should handle localStorage errors', () => {
      const workflow = createTestWorkflow();
      const storageKey = 'test-draft';

      // Mock localStorage error
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = saveDraft(workflow, storageKey);

      expect(result).toBe(false);
    });

    it('should save workflow ID in metadata', () => {
      const workflow = createTestWorkflow({ id: 'workflow-123' });
      const storageKey = 'test-draft';

      saveDraft(workflow, storageKey);

      const saved = mockStorage.get(storageKey);
      const parsed = JSON.parse(saved!);
      expect(parsed.metadata.workflowId).toBe('workflow-123');
    });
  });

  describe('loadDraft', () => {
    it('should load draft from localStorage', () => {
      const workflow = createTestWorkflow();
      const storageKey = 'test-draft';

      saveDraft(workflow, storageKey);
      const loaded = loadDraft(storageKey);

      expect(loaded).not.toBeNull();
      expect(loaded?.workflow).toEqual(workflow);
      expect(loaded?.metadata).toBeDefined();
    });

    it('should return null when draft does not exist', () => {
      const loaded = loadDraft('non-existent');
      expect(loaded).toBeNull();
    });

    it('should return null for invalid draft structure', () => {
      const storageKey = 'invalid-draft';
      mockStorage.set(storageKey, JSON.stringify({ invalid: 'data' }));

      const loaded = loadDraft(storageKey);
      expect(loaded).toBeNull();
    });

    it('should handle JSON parse errors', () => {
      const storageKey = 'broken-draft';
      mockStorage.set(storageKey, 'invalid json {');

      const loaded = loadDraft(storageKey);
      expect(loaded).toBeNull();
    });

    it('should handle localStorage errors', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const loaded = loadDraft('test-draft');
      expect(loaded).toBeNull();
    });
  });

  describe('deleteDraft', () => {
    it('should delete draft from localStorage', () => {
      const workflow = createTestWorkflow();
      const storageKey = 'test-draft';

      saveDraft(workflow, storageKey);
      expect(hasDraft(storageKey)).toBe(true);

      deleteDraft(storageKey);
      expect(hasDraft(storageKey)).toBe(false);
    });

    it('should handle deletion of non-existent draft', () => {
      deleteDraft('non-existent');
      expect(localStorage.removeItem).toHaveBeenCalledWith('non-existent');
    });

    it('should handle localStorage errors', () => {
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      deleteDraft('test-draft');
    });
  });

  describe('hasDraft', () => {
    it('should return true when draft exists', () => {
      const workflow = createTestWorkflow();
      const storageKey = 'test-draft';

      saveDraft(workflow, storageKey);
      expect(hasDraft(storageKey)).toBe(true);
    });

    it('should return false when draft does not exist', () => {
      expect(hasDraft('non-existent')).toBe(false);
    });

    it('should handle localStorage errors', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(hasDraft('test-draft')).toBe(false);
    });
  });

  describe('getDraftMetadata', () => {
    it('should return draft metadata without full workflow', () => {
      const workflow = createTestWorkflow({ name: 'Test Workflow' });
      const storageKey = 'test-draft';

      saveDraft(workflow, storageKey);
      const metadata = getDraftMetadata(storageKey);

      expect(metadata).not.toBeNull();
      expect(metadata?.workflowName).toBe('Test Workflow');
      expect(metadata).toHaveProperty('savedAt');
    });

    it('should return null when draft does not exist', () => {
      const metadata = getDraftMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  describe('clearAllDrafts', () => {
    it('should remove all keys with the flowdrop:draft: prefix', () => {
      const workflow = createTestWorkflow();
      saveDraft(workflow, 'flowdrop:draft:workflow-1');
      saveDraft(workflow, 'flowdrop:draft:workflow-2');
      saveDraft(workflow, 'flowdrop:draft:new');

      const removed = clearAllDrafts();

      expect(removed).toBe(3);
      expect(hasDraft('flowdrop:draft:workflow-1')).toBe(false);
      expect(hasDraft('flowdrop:draft:workflow-2')).toBe(false);
      expect(hasDraft('flowdrop:draft:new')).toBe(false);
    });

    it('should leave unrelated localStorage keys intact', () => {
      const workflow = createTestWorkflow();
      saveDraft(workflow, 'flowdrop:draft:workflow-1');
      mockStorage.set('user-token', 'abc');
      mockStorage.set('app-settings', '{"theme":"dark"}');

      clearAllDrafts();

      expect(hasDraft('flowdrop:draft:workflow-1')).toBe(false);
      expect(mockStorage.get('user-token')).toBe('abc');
      expect(mockStorage.get('app-settings')).toBe('{"theme":"dark"}');
    });

    it('should also remove explicit extra keys when provided', () => {
      const workflow = createTestWorkflow();
      saveDraft(workflow, 'flowdrop:draft:workflow-1');
      saveDraft(workflow, 'my-custom-draft-key');

      const removed = clearAllDrafts(['my-custom-draft-key']);

      expect(removed).toBe(2);
      expect(hasDraft('flowdrop:draft:workflow-1')).toBe(false);
      expect(hasDraft('my-custom-draft-key')).toBe(false);
    });

    it('should ignore extra keys that do not exist', () => {
      const workflow = createTestWorkflow();
      saveDraft(workflow, 'flowdrop:draft:workflow-1');

      const removed = clearAllDrafts(['nonexistent-key']);

      expect(removed).toBe(1);
    });

    it('should return 0 when no drafts exist', () => {
      mockStorage.set('user-token', 'abc');

      const removed = clearAllDrafts();

      expect(removed).toBe(0);
      expect(mockStorage.get('user-token')).toBe('abc');
    });

    it('should handle localStorage errors gracefully', () => {
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      mockStorage.set('flowdrop:draft:workflow-1', '{}');

      const removed = clearAllDrafts();

      expect(removed).toBe(0);
    });
  });

  describe('storage backends (setDraftStorage)', () => {
    it('defaults to localStorage', () => {
      const workflow = createTestWorkflow();
      saveDraft(workflow, 'flowdrop:draft:wf-1');

      expect(mockStorage.has('flowdrop:draft:wf-1')).toBe(true);
      expect(mockSessionStorage.has('flowdrop:draft:wf-1')).toBe(false);
    });

    it("routes all operations to sessionStorage when set to 'session'", () => {
      setDraftStorage('session');
      const workflow = createTestWorkflow();

      saveDraft(workflow, 'flowdrop:draft:wf-1');
      expect(mockSessionStorage.has('flowdrop:draft:wf-1')).toBe(true);
      expect(mockStorage.has('flowdrop:draft:wf-1')).toBe(false);

      expect(hasDraft('flowdrop:draft:wf-1')).toBe(true);
      expect(loadDraft('flowdrop:draft:wf-1')?.workflow).toEqual(workflow);

      deleteDraft('flowdrop:draft:wf-1');
      expect(mockSessionStorage.has('flowdrop:draft:wf-1')).toBe(false);
    });

    it("switching back to 'local' does not see session-stored drafts", () => {
      setDraftStorage('session');
      saveDraft(createTestWorkflow(), 'flowdrop:draft:wf-1');

      setDraftStorage('local');
      expect(hasDraft('flowdrop:draft:wf-1')).toBe(false);
    });

    it('clearAllDrafts operates on the active backend only', () => {
      const workflow = createTestWorkflow();
      saveDraft(workflow, 'flowdrop:draft:local-wf'); // localStorage (default)

      setDraftStorage('session');
      saveDraft(workflow, 'flowdrop:draft:session-wf');

      const removed = clearAllDrafts();

      expect(removed).toBe(1);
      expect(mockSessionStorage.has('flowdrop:draft:session-wf')).toBe(false);
      // localStorage draft untouched while session backend is active
      expect(mockStorage.has('flowdrop:draft:local-wf')).toBe(true);
    });

    it('supports a custom adapter', () => {
      const backing = new Map<string, string>();
      const adapter: DraftStorageAdapter = {
        getItem: (key) => backing.get(key) ?? null,
        setItem: (key, value) => {
          backing.set(key, value);
        },
        removeItem: (key) => {
          backing.delete(key);
        },
        keys: () => Array.from(backing.keys())
      };

      setDraftStorage(adapter);
      expect(getDraftStorage()).toBe(adapter);

      const workflow = createTestWorkflow();
      saveDraft(workflow, 'flowdrop:draft:wf-1');

      expect(backing.has('flowdrop:draft:wf-1')).toBe(true);
      expect(mockStorage.size).toBe(0);
      expect(mockSessionStorage.size).toBe(0);

      expect(clearAllDrafts()).toBe(1);
      expect(backing.size).toBe(0);
    });

    it('standalone helpers accept an explicit adapter, bypassing the module default', () => {
      const workflow = createTestWorkflow();
      const sessionAdapter = resolveDraftStorage('session');

      // Module default is 'local' — explicit adapter wins
      saveDraft(workflow, 'flowdrop:draft:wf-1', sessionAdapter);
      expect(mockSessionStorage.has('flowdrop:draft:wf-1')).toBe(true);
      expect(mockStorage.has('flowdrop:draft:wf-1')).toBe(false);

      expect(hasDraft('flowdrop:draft:wf-1', sessionAdapter)).toBe(true);
      expect(loadDraft('flowdrop:draft:wf-1', sessionAdapter)?.workflow).toEqual(workflow);
      expect(clearAllDrafts([], sessionAdapter)).toBe(1);
      expect(mockSessionStorage.size).toBe(0);
    });

    it('resolveDraftStorage maps names to built-ins and passes adapters through', () => {
      const adapter: DraftStorageAdapter = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        keys: () => []
      };

      expect(resolveDraftStorage(adapter)).toBe(adapter);
      expect(resolveDraftStorage('local')).toBe(resolveDraftStorage('local'));
      expect(resolveDraftStorage('local')).not.toBe(resolveDraftStorage('session'));
      // undefined resolves to the current module default
      expect(resolveDraftStorage()).toBe(getDraftStorage());
    });
  });

  describe('DraftAutoSaveManager', () => {
    let manager: DraftAutoSaveManager;
    let getWorkflow: ReturnType<typeof vi.fn>;
    let isDirty: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      getWorkflow = vi.fn();
      isDirty = vi.fn();

      manager = new DraftAutoSaveManager({
        storageKey: 'test-autosave',
        interval: 1000,
        enabled: true,
        getWorkflow,
        isDirty
      });
    });

    afterEach(() => {
      manager.stop();
      vi.useRealTimers();
    });

    describe('start and stop', () => {
      it('should start auto-save interval', () => {
        manager.start();
        expect(manager.isRunning()).toBe(true);
      });

      it('should stop auto-save interval', () => {
        manager.start();
        manager.stop();
        expect(manager.isRunning()).toBe(false);
      });

      it('should not start if already running', () => {
        manager.start();
        manager.start(); // Second call
        expect(manager.isRunning()).toBe(true);
      });

      it('should not start if disabled', () => {
        const disabledManager = new DraftAutoSaveManager({
          storageKey: 'test',
          interval: 1000,
          enabled: false,
          getWorkflow,
          isDirty
        });

        disabledManager.start();
        expect(disabledManager.isRunning()).toBe(false);
      });
    });

    describe('saveIfDirty', () => {
      it('should save when workflow is dirty', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        const result = manager.saveIfDirty();

        expect(result).toBe(true);
        expect(hasDraft('test-autosave')).toBe(true);
      });

      it('should not save when workflow is not dirty', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(false);

        const result = manager.saveIfDirty();

        expect(result).toBe(false);
        expect(hasDraft('test-autosave')).toBe(false);
      });

      it('should not save when no workflow available', () => {
        getWorkflow.mockReturnValue(null);
        isDirty.mockReturnValue(true);

        const result = manager.saveIfDirty();

        expect(result).toBe(false);
      });

      it('should not save if workflow has not changed', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        // First save
        manager.saveIfDirty();

        // Second save with same workflow
        const result = manager.saveIfDirty();

        expect(result).toBe(false);
      });

      it('should save if workflow changed', () => {
        const workflow1 = createTestWorkflow({ name: 'Version 1' });
        const workflow2 = createTestWorkflow({ name: 'Version 2' });

        getWorkflow.mockReturnValueOnce(workflow1);
        isDirty.mockReturnValue(true);

        manager.saveIfDirty();

        getWorkflow.mockReturnValueOnce(workflow2);
        const result = manager.saveIfDirty();

        expect(result).toBe(true);
      });
    });

    describe('isPersistenceAllowed (user opt-out)', () => {
      let persistenceAllowed: boolean;
      let gatedManager: DraftAutoSaveManager;

      beforeEach(() => {
        persistenceAllowed = true;
        gatedManager = new DraftAutoSaveManager({
          storageKey: 'test-gated',
          interval: 1000,
          enabled: true,
          getWorkflow,
          isDirty,
          isPersistenceAllowed: () => persistenceAllowed
        });
      });

      it('blocks saveIfDirty when persistence is not allowed', () => {
        getWorkflow.mockReturnValue(createTestWorkflow());
        isDirty.mockReturnValue(true);
        persistenceAllowed = false;

        expect(gatedManager.saveIfDirty()).toBe(false);
        expect(hasDraft('test-gated')).toBe(false);
      });

      it('blocks forceSave when persistence is not allowed', () => {
        getWorkflow.mockReturnValue(createTestWorkflow());
        persistenceAllowed = false;

        expect(gatedManager.forceSave()).toBe(false);
        expect(hasDraft('test-gated')).toBe(false);
      });

      it('takes effect immediately when toggled at runtime', () => {
        getWorkflow.mockReturnValue(createTestWorkflow());
        isDirty.mockReturnValue(true);

        persistenceAllowed = false;
        expect(gatedManager.saveIfDirty()).toBe(false);

        persistenceAllowed = true;
        expect(gatedManager.saveIfDirty()).toBe(true);
        expect(hasDraft('test-gated')).toBe(true);
      });

      it('defaults to allowed when the option is omitted', () => {
        getWorkflow.mockReturnValue(createTestWorkflow());
        isDirty.mockReturnValue(true);

        expect(manager.saveIfDirty()).toBe(true);
      });

      it('updateStorageKey deletes the old draft but does not re-save it when opted out', () => {
        // A stale draft exists under the old key (e.g. written before opting out)
        saveDraft(createTestWorkflow({ name: 'Stale' }), 'test-gated');

        persistenceAllowed = false;
        gatedManager.updateStorageKey('test-gated-migrated');

        expect(hasDraft('test-gated')).toBe(false);
        expect(hasDraft('test-gated-migrated')).toBe(false);
        expect(gatedManager.getStorageKey()).toBe('test-gated-migrated');
      });

      it('updateStorageKey migrates normally when persistence is allowed', () => {
        saveDraft(createTestWorkflow({ name: 'Live' }), 'test-gated');

        gatedManager.updateStorageKey('test-gated-migrated');

        expect(hasDraft('test-gated')).toBe(false);
        expect(loadDraft('test-gated-migrated')?.workflow.name).toBe('Live');
      });
    });

    describe('per-instance storage backend', () => {
      it('a manager constructed with storage: "session" writes there regardless of the module default', () => {
        const sessionManager = new DraftAutoSaveManager({
          storageKey: 'flowdrop:draft:wf-session',
          interval: 1000,
          enabled: true,
          getWorkflow: vi.fn().mockReturnValue(createTestWorkflow()),
          isDirty: vi.fn().mockReturnValue(true),
          storage: 'session'
        });

        sessionManager.forceSave();

        expect(mockSessionStorage.has('flowdrop:draft:wf-session')).toBe(true);
        expect(mockStorage.has('flowdrop:draft:wf-session')).toBe(false);
      });

      it('two managers with different backends do not interfere', () => {
        const make = (storage: 'local' | 'session', name: string) =>
          new DraftAutoSaveManager({
            storageKey: 'flowdrop:draft:shared-key',
            interval: 1000,
            enabled: true,
            getWorkflow: vi.fn().mockReturnValue(createTestWorkflow({ name })),
            isDirty: vi.fn().mockReturnValue(true),
            storage
          });

        const localManager = make('local', 'Local Instance');
        const sessionManager = make('session', 'Session Instance');

        localManager.forceSave();
        sessionManager.forceSave();

        expect(JSON.parse(mockStorage.get('flowdrop:draft:shared-key')!).workflow.name).toBe(
          'Local Instance'
        );
        expect(JSON.parse(mockSessionStorage.get('flowdrop:draft:shared-key')!).workflow.name).toBe(
          'Session Instance'
        );

        // Clearing one instance leaves the other's draft alone
        localManager.clearDraft();
        expect(mockStorage.has('flowdrop:draft:shared-key')).toBe(false);
        expect(mockSessionStorage.has('flowdrop:draft:shared-key')).toBe(true);
      });

      it('a later setDraftStorage() call does not retarget an existing manager', () => {
        const captured = new DraftAutoSaveManager({
          storageKey: 'flowdrop:draft:captured',
          interval: 1000,
          enabled: true,
          getWorkflow: vi.fn().mockReturnValue(createTestWorkflow()),
          isDirty: vi.fn().mockReturnValue(true)
          // no storage option — captures the module default ('local') at construction
        });

        setDraftStorage('session'); // e.g. a second mount on the same page

        captured.forceSave();

        expect(mockStorage.has('flowdrop:draft:captured')).toBe(true);
        expect(mockSessionStorage.has('flowdrop:draft:captured')).toBe(false);
      });

      it('updateStorageKey migrates within the instance backend', () => {
        const sessionManager = new DraftAutoSaveManager({
          storageKey: 'flowdrop:draft:old',
          interval: 1000,
          enabled: true,
          getWorkflow: vi.fn().mockReturnValue(createTestWorkflow()),
          isDirty: vi.fn().mockReturnValue(true),
          storage: 'session'
        });

        sessionManager.forceSave();
        sessionManager.updateStorageKey('flowdrop:draft:new-id');

        expect(mockSessionStorage.has('flowdrop:draft:old')).toBe(false);
        expect(mockSessionStorage.has('flowdrop:draft:new-id')).toBe(true);
        expect(mockStorage.size).toBe(0);
      });
    });

    describe('forceSave', () => {
      it('should save regardless of dirty state', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(false); // Not dirty

        const result = manager.forceSave();

        expect(result).toBe(true);
        expect(hasDraft('test-autosave')).toBe(true);
      });

      it('should not save when no workflow available', () => {
        getWorkflow.mockReturnValue(null);

        const result = manager.forceSave();

        expect(result).toBe(false);
      });
    });

    describe('auto-save interval', () => {
      it('should save at intervals when dirty', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        manager.start();

        // Advance time by interval
        vi.advanceTimersByTime(1000);

        expect(hasDraft('test-autosave')).toBe(true);
      });

      it('should not save at intervals when not dirty', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(false);

        manager.start();
        vi.advanceTimersByTime(1000);

        expect(hasDraft('test-autosave')).toBe(false);
      });
    });

    describe('clearDraft', () => {
      it('should clear draft from storage', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        manager.forceSave();
        expect(hasDraft('test-autosave')).toBe(true);

        manager.clearDraft();
        expect(hasDraft('test-autosave')).toBe(false);
      });
    });

    describe('markAsSaved', () => {
      it('should prevent saving unchanged workflow', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        manager.markAsSaved();

        const result = manager.saveIfDirty();
        expect(result).toBe(false);
      });
    });

    describe('updateStorageKey', () => {
      it('should update storage key', () => {
        manager.updateStorageKey('new-key');
        expect(manager.getStorageKey()).toBe('new-key');
      });

      it('should migrate existing draft to new key', () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);

        manager.forceSave();
        expect(hasDraft('test-autosave')).toBe(true);

        manager.updateStorageKey('new-key');

        expect(hasDraft('test-autosave')).toBe(false);
        expect(hasDraft('new-key')).toBe(true);
      });

      it('should not migrate if no existing draft', () => {
        manager.updateStorageKey('new-key');
        expect(hasDraft('new-key')).toBe(false);
      });
    });

    describe('cross-tab collision via flowdrop:draft:new', () => {
      it('two managers sharing the same key overwrite each other', () => {
        const workflowA = createTestWorkflow({ name: 'Tab A Workflow' });
        const workflowB = createTestWorkflow({ name: 'Tab B Workflow' });

        const managerA = new DraftAutoSaveManager({
          storageKey: 'flowdrop:draft:new',
          interval: 1000,
          enabled: true,
          getWorkflow: vi.fn().mockReturnValue(workflowA),
          isDirty: vi.fn().mockReturnValue(true)
        });
        const managerB = new DraftAutoSaveManager({
          storageKey: 'flowdrop:draft:new',
          interval: 1000,
          enabled: true,
          getWorkflow: vi.fn().mockReturnValue(workflowB),
          isDirty: vi.fn().mockReturnValue(true)
        });

        managerA.forceSave();
        managerB.forceSave(); // B overwrites A

        const loaded = loadDraft('flowdrop:draft:new');
        expect(loaded?.workflow.name).toBe('Tab B Workflow');
      });

      it('migrating key after first save isolates subsequent writes from the other tab', () => {
        const workflowA = createTestWorkflow({ name: 'Tab A Workflow' });
        const workflowB = createTestWorkflow({ name: 'Tab B Workflow' });

        const managerA = new DraftAutoSaveManager({
          storageKey: 'flowdrop:draft:new',
          interval: 1000,
          enabled: true,
          getWorkflow: vi.fn().mockReturnValue(workflowA),
          isDirty: vi.fn().mockReturnValue(true)
        });

        managerA.forceSave(); // saves to flowdrop:draft:new
        managerA.updateStorageKey('flowdrop:draft:server-id-123'); // migrated after first save

        // Tab B (still on the shared key) writes its draft
        saveDraft(workflowB, 'flowdrop:draft:new');

        const draftA = loadDraft('flowdrop:draft:server-id-123');
        const draftNew = loadDraft('flowdrop:draft:new');

        expect(draftA?.workflow.name).toBe('Tab A Workflow');
        expect(draftNew?.workflow.name).toBe('Tab B Workflow');
      });

      it('subsequent auto-saves after migration do not touch flowdrop:draft:new', () => {
        const workflow = createTestWorkflow({ name: 'My Workflow' });
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        manager.updateStorageKey('flowdrop:draft:server-id-456');
        manager.start();

        // Another tab writes to flowdrop:draft:new
        saveDraft(createTestWorkflow({ name: 'Other Tab' }), 'flowdrop:draft:new');

        vi.advanceTimersByTime(1000);

        // Our manager must not have overwritten flowdrop:draft:new
        const newDraft = loadDraft('flowdrop:draft:new');
        expect(newDraft?.workflow.name).toBe('Other Tab');

        // Our auto-save went to the migrated key
        expect(hasDraft('flowdrop:draft:server-id-456')).toBe(true);
      });
    });

    describe('getStorageKey', () => {
      it('should return current storage key', () => {
        expect(manager.getStorageKey()).toBe('test-autosave');
      });
    });

    describe('isRunning', () => {
      it('should return false when not started', () => {
        expect(manager.isRunning()).toBe(false);
      });

      it('should return true when started', () => {
        manager.start();
        expect(manager.isRunning()).toBe(true);
      });

      it('should return false after stopped', () => {
        manager.start();
        manager.stop();
        expect(manager.isRunning()).toBe(false);
      });
    });
  });
});

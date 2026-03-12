/**
 * Unit Tests - Draft Storage Service
 *
 * Tests for localStorage-based draft saving and auto-save functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getDraftStorageKey,
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftMetadata,
  DraftAutoSaveManager,
} from "$lib/services/draftStorage.js";
import { createTestWorkflow } from "../../utils/index.js";

describe("Draft Storage Service", () => {
  // Mock localStorage
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    // Create a fresh mock storage for each test
    mockStorage = new Map();

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        mockStorage.delete(key);
      }),
      clear: vi.fn(() => {
        mockStorage.clear();
      }),
      key: vi.fn((index: number) => {
        const keys = Array.from(mockStorage.keys());
        return keys[index] ?? null;
      }),
      length: mockStorage.size,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getDraftStorageKey", () => {
    it("should return custom key when provided", () => {
      const customKey = "my-custom-draft-key";
      const key = getDraftStorageKey("workflow-id", customKey);
      expect(key).toBe(customKey);
    });

    it("should generate key with workflow ID", () => {
      const key = getDraftStorageKey("workflow-123");
      expect(key).toBe("flowdrop:draft:workflow-123");
    });

    it("should use 'new' suffix when no workflow ID", () => {
      const key = getDraftStorageKey();
      expect(key).toBe("flowdrop:draft:new");
    });

    it("should prefer custom key over workflow ID", () => {
      const key = getDraftStorageKey("workflow-123", "custom");
      expect(key).toBe("custom");
    });
  });

  describe("saveDraft", () => {
    it("should save draft to localStorage", () => {
      const workflow = createTestWorkflow();
      const storageKey = "test-draft";

      const result = saveDraft(workflow, storageKey);

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        storageKey,
        expect.any(String),
      );
    });

    it("should include metadata when saving", () => {
      const workflow = createTestWorkflow({ name: "My Workflow" });
      const storageKey = "test-draft";

      saveDraft(workflow, storageKey);

      const saved = mockStorage.get(storageKey);
      expect(saved).toBeDefined();

      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveProperty("workflow");
      expect(parsed).toHaveProperty("metadata");
      expect(parsed.metadata).toHaveProperty("savedAt");
      expect(parsed.metadata.workflowName).toBe("My Workflow");
    });

    it("should handle localStorage errors", () => {
      const workflow = createTestWorkflow();
      const storageKey = "test-draft";

      // Mock localStorage error
      vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Storage full");
      });

      const result = saveDraft(workflow, storageKey);

      expect(result).toBe(false);
    });

    it("should save workflow ID in metadata", () => {
      const workflow = createTestWorkflow({ id: "workflow-123" });
      const storageKey = "test-draft";

      saveDraft(workflow, storageKey);

      const saved = mockStorage.get(storageKey);
      const parsed = JSON.parse(saved!);
      expect(parsed.metadata.workflowId).toBe("workflow-123");
    });
  });

  describe("loadDraft", () => {
    it("should load draft from localStorage", () => {
      const workflow = createTestWorkflow();
      const storageKey = "test-draft";

      saveDraft(workflow, storageKey);
      const loaded = loadDraft(storageKey);

      expect(loaded).not.toBeNull();
      expect(loaded?.workflow).toEqual(workflow);
      expect(loaded?.metadata).toBeDefined();
    });

    it("should return null when draft does not exist", () => {
      const loaded = loadDraft("non-existent");
      expect(loaded).toBeNull();
    });

    it("should return null for invalid draft structure", () => {
      const storageKey = "invalid-draft";
      mockStorage.set(storageKey, JSON.stringify({ invalid: "data" }));

      const loaded = loadDraft(storageKey);
      expect(loaded).toBeNull();
    });

    it("should handle JSON parse errors", () => {
      const storageKey = "broken-draft";
      mockStorage.set(storageKey, "invalid json {");

      const loaded = loadDraft(storageKey);
      expect(loaded).toBeNull();
    });

    it("should handle localStorage errors", () => {
      vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      const loaded = loadDraft("test-draft");
      expect(loaded).toBeNull();
    });
  });

  describe("deleteDraft", () => {
    it("should delete draft from localStorage", () => {
      const workflow = createTestWorkflow();
      const storageKey = "test-draft";

      saveDraft(workflow, storageKey);
      expect(hasDraft(storageKey)).toBe(true);

      deleteDraft(storageKey);
      expect(hasDraft(storageKey)).toBe(false);
    });

    it("should handle deletion of non-existent draft", () => {
      deleteDraft("non-existent");
      expect(localStorage.removeItem).toHaveBeenCalledWith("non-existent");
    });

    it("should handle localStorage errors", () => {
      vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Should not throw
      deleteDraft("test-draft");
    });
  });

  describe("hasDraft", () => {
    it("should return true when draft exists", () => {
      const workflow = createTestWorkflow();
      const storageKey = "test-draft";

      saveDraft(workflow, storageKey);
      expect(hasDraft(storageKey)).toBe(true);
    });

    it("should return false when draft does not exist", () => {
      expect(hasDraft("non-existent")).toBe(false);
    });

    it("should handle localStorage errors", () => {
      vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(hasDraft("test-draft")).toBe(false);
    });
  });

  describe("getDraftMetadata", () => {
    it("should return draft metadata without full workflow", () => {
      const workflow = createTestWorkflow({ name: "Test Workflow" });
      const storageKey = "test-draft";

      saveDraft(workflow, storageKey);
      const metadata = getDraftMetadata(storageKey);

      expect(metadata).not.toBeNull();
      expect(metadata?.workflowName).toBe("Test Workflow");
      expect(metadata).toHaveProperty("savedAt");
    });

    it("should return null when draft does not exist", () => {
      const metadata = getDraftMetadata("non-existent");
      expect(metadata).toBeNull();
    });
  });

  describe("DraftAutoSaveManager", () => {
    let manager: DraftAutoSaveManager;
    let getWorkflow: ReturnType<typeof vi.fn>;
    let isDirty: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      getWorkflow = vi.fn();
      isDirty = vi.fn();

      manager = new DraftAutoSaveManager({
        storageKey: "test-autosave",
        interval: 1000,
        enabled: true,
        getWorkflow,
        isDirty,
      });
    });

    afterEach(() => {
      manager.stop();
      vi.useRealTimers();
    });

    describe("start and stop", () => {
      it("should start auto-save interval", () => {
        manager.start();
        expect(manager.isRunning()).toBe(true);
      });

      it("should stop auto-save interval", () => {
        manager.start();
        manager.stop();
        expect(manager.isRunning()).toBe(false);
      });

      it("should not start if already running", () => {
        manager.start();
        manager.start(); // Second call
        expect(manager.isRunning()).toBe(true);
      });

      it("should not start if disabled", () => {
        const disabledManager = new DraftAutoSaveManager({
          storageKey: "test",
          interval: 1000,
          enabled: false,
          getWorkflow,
          isDirty,
        });

        disabledManager.start();
        expect(disabledManager.isRunning()).toBe(false);
      });
    });

    describe("saveIfDirty", () => {
      it("should save when workflow is dirty", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        const result = manager.saveIfDirty();

        expect(result).toBe(true);
        expect(hasDraft("test-autosave")).toBe(true);
      });

      it("should not save when workflow is not dirty", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(false);

        const result = manager.saveIfDirty();

        expect(result).toBe(false);
        expect(hasDraft("test-autosave")).toBe(false);
      });

      it("should not save when no workflow available", () => {
        getWorkflow.mockReturnValue(null);
        isDirty.mockReturnValue(true);

        const result = manager.saveIfDirty();

        expect(result).toBe(false);
      });

      it("should not save if workflow has not changed", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        // First save
        manager.saveIfDirty();

        // Second save with same workflow
        const result = manager.saveIfDirty();

        expect(result).toBe(false);
      });

      it("should save if workflow changed", () => {
        const workflow1 = createTestWorkflow({ name: "Version 1" });
        const workflow2 = createTestWorkflow({ name: "Version 2" });

        getWorkflow.mockReturnValueOnce(workflow1);
        isDirty.mockReturnValue(true);

        manager.saveIfDirty();

        getWorkflow.mockReturnValueOnce(workflow2);
        const result = manager.saveIfDirty();

        expect(result).toBe(true);
      });
    });

    describe("forceSave", () => {
      it("should save regardless of dirty state", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(false); // Not dirty

        const result = manager.forceSave();

        expect(result).toBe(true);
        expect(hasDraft("test-autosave")).toBe(true);
      });

      it("should not save when no workflow available", () => {
        getWorkflow.mockReturnValue(null);

        const result = manager.forceSave();

        expect(result).toBe(false);
      });
    });

    describe("auto-save interval", () => {
      it("should save at intervals when dirty", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        manager.start();

        // Advance time by interval
        vi.advanceTimersByTime(1000);

        expect(hasDraft("test-autosave")).toBe(true);
      });

      it("should not save at intervals when not dirty", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(false);

        manager.start();
        vi.advanceTimersByTime(1000);

        expect(hasDraft("test-autosave")).toBe(false);
      });
    });

    describe("clearDraft", () => {
      it("should clear draft from storage", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        manager.forceSave();
        expect(hasDraft("test-autosave")).toBe(true);

        manager.clearDraft();
        expect(hasDraft("test-autosave")).toBe(false);
      });
    });

    describe("markAsSaved", () => {
      it("should prevent saving unchanged workflow", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);
        isDirty.mockReturnValue(true);

        manager.markAsSaved();

        const result = manager.saveIfDirty();
        expect(result).toBe(false);
      });
    });

    describe("updateStorageKey", () => {
      it("should update storage key", () => {
        manager.updateStorageKey("new-key");
        expect(manager.getStorageKey()).toBe("new-key");
      });

      it("should migrate existing draft to new key", () => {
        const workflow = createTestWorkflow();
        getWorkflow.mockReturnValue(workflow);

        manager.forceSave();
        expect(hasDraft("test-autosave")).toBe(true);

        manager.updateStorageKey("new-key");

        expect(hasDraft("test-autosave")).toBe(false);
        expect(hasDraft("new-key")).toBe(true);
      });

      it("should not migrate if no existing draft", () => {
        manager.updateStorageKey("new-key");
        expect(hasDraft("new-key")).toBe(false);
      });
    });

    describe("getStorageKey", () => {
      it("should return current storage key", () => {
        expect(manager.getStorageKey()).toBe("test-autosave");
      });
    });

    describe("isRunning", () => {
      it("should return false when not started", () => {
        expect(manager.isRunning()).toBe(false);
      });

      it("should return true when started", () => {
        manager.start();
        expect(manager.isRunning()).toBe(true);
      });

      it("should return false after stopped", () => {
        manager.start();
        manager.stop();
        expect(manager.isRunning()).toBe(false);
      });
    });
  });
});

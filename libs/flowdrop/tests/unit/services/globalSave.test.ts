/**
 * Unit Tests - Global Save Service
 *
 * Tests for the globalSaveWorkflow() function, focusing on correct routing
 * between createWorkflow (POST) and updateWorkflow (PUT) based on whether
 * the workflow already has a backend-assigned id.
 *
 * Regression coverage for: UUID Workflow ID Bug (issue #26)
 * Previously a UUID regex was used to detect new workflows, which caused
 * backends that use UUIDs as primary keys to always POST instead of PUT.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { globalSaveWorkflow } from "$lib/services/globalSave.js";
import { createTestWorkflow } from "../../utils/index.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// vi.mock factories are hoisted to the top of the file, so variables they
// reference must be initialised with vi.hoisted() to be available in time.
const {
  mockGetWorkflowStore,
  mockWorkflowActionsBatchUpdate,
  mockStoreMarkAsSaved,
  mockCreateWorkflow,
  mockUpdateWorkflow,
  mockGetEndpointConfig,
} = vi.hoisted(() => ({
  mockGetWorkflowStore: vi.fn(),
  mockWorkflowActionsBatchUpdate: vi.fn(),
  mockStoreMarkAsSaved: vi.fn(),
  mockCreateWorkflow: vi.fn(),
  mockUpdateWorkflow: vi.fn(),
  mockGetEndpointConfig: vi.fn(),
}));

vi.mock("$lib/stores/workflowStore.svelte.js", () => ({
  getWorkflowStore: (...args: unknown[]) => mockGetWorkflowStore(...args),
  workflowActions: {
    batchUpdate: (...args: unknown[]) =>
      mockWorkflowActionsBatchUpdate(...args),
  },
  markAsSaved: (...args: unknown[]) => mockStoreMarkAsSaved(...args),
}));

vi.mock("$lib/services/api.js", () => ({
  workflowApi: {
    createWorkflow: (...args: unknown[]) => mockCreateWorkflow(...args),
    updateWorkflow: (...args: unknown[]) => mockUpdateWorkflow(...args),
    saveWorkflow: vi.fn(),
  },
  getEndpointConfig: (...args: unknown[]) => mockGetEndpointConfig(...args),
  setEndpointConfig: vi.fn(),
}));

vi.mock("$lib/services/toastService.js", () => ({
  apiToasts: { loading: vi.fn(() => "toast-id"), error: vi.fn() },
  workflowToasts: { saved: vi.fn() },
  dismissToast: vi.fn(),
}));

vi.mock("$lib/config/endpoints.js", () => ({
  createEndpointConfig: vi.fn(() => ({ baseUrl: "/api/flowdrop" })),
}));

vi.mock("svelte", () => ({
  tick: () => Promise.resolve(),
}));

const FIXED_UUID = "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb";
vi.mock("uuid", () => ({ v4: () => FIXED_UUID }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a workflow with the given id (use '' or undefined for new) */
function storeWorkflow(id: string) {
  return createTestWorkflow({ id });
}

/** Saved workflow returned by the backend */
function backendWorkflow(id: string) {
  return createTestWorkflow({ id });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("globalSaveWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate a valid endpoint config so ensureApiConfiguration exits early
    mockGetEndpointConfig.mockReturnValue({ baseUrl: "/api/flowdrop" });
  });

  // -------------------------------------------------------------------------
  // Legacy path (no apiClient)
  // -------------------------------------------------------------------------

  describe("legacy path (no apiClient)", () => {
    it("calls createWorkflow when workflow has no id (new workflow)", async () => {
      const workflow = storeWorkflow("");
      mockGetWorkflowStore.mockReturnValue(workflow);
      mockCreateWorkflow.mockResolvedValue(
        backendWorkflow("server-assigned-id"),
      );

      await globalSaveWorkflow({});

      expect(mockCreateWorkflow).toHaveBeenCalledTimes(1);
      expect(mockUpdateWorkflow).not.toHaveBeenCalled();

      // id should be stripped from the POST body
      const [postedWorkflow] = mockCreateWorkflow.mock.calls[0];
      expect(postedWorkflow).not.toHaveProperty("id");
    });

    it("calls updateWorkflow when workflow has a non-UUID id (existing workflow)", async () => {
      const workflow = storeWorkflow("123");
      mockGetWorkflowStore.mockReturnValue(workflow);
      mockUpdateWorkflow.mockResolvedValue(backendWorkflow("123"));

      await globalSaveWorkflow({});

      expect(mockUpdateWorkflow).toHaveBeenCalledTimes(1);
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(
        "123",
        expect.objectContaining({ id: "123" }),
      );
      expect(mockCreateWorkflow).not.toHaveBeenCalled();
    });

    it("calls updateWorkflow when workflow has a UUID id (regression: issue #26)", async () => {
      const uuidId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const workflow = storeWorkflow(uuidId);
      mockGetWorkflowStore.mockReturnValue(workflow);
      mockUpdateWorkflow.mockResolvedValue(backendWorkflow(uuidId));

      await globalSaveWorkflow({});

      expect(mockUpdateWorkflow).toHaveBeenCalledTimes(1);
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(
        uuidId,
        expect.objectContaining({ id: uuidId }),
      );
      expect(mockCreateWorkflow).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Enhanced client path
  // -------------------------------------------------------------------------

  describe("enhanced client path (apiClient provided)", () => {
    const mockApiClientSave = vi.fn();
    const mockApiClientUpdate = vi.fn();
    const apiClient = {
      saveWorkflow: (...args: unknown[]) => mockApiClientSave(...args),
      updateWorkflow: (...args: unknown[]) => mockApiClientUpdate(...args),
    };

    it("calls apiClient.saveWorkflow when workflow has no id (new workflow)", async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(""));
      mockApiClientSave.mockResolvedValue(backendWorkflow("server-uuid"));

      await globalSaveWorkflow({ apiClient });

      expect(mockApiClientSave).toHaveBeenCalledTimes(1);
      expect(mockApiClientUpdate).not.toHaveBeenCalled();
    });

    it("calls apiClient.updateWorkflow when workflow has a UUID id (regression: issue #26)", async () => {
      const uuidId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(uuidId));
      mockApiClientUpdate.mockResolvedValue(backendWorkflow(uuidId));

      await globalSaveWorkflow({ apiClient });

      expect(mockApiClientUpdate).toHaveBeenCalledTimes(1);
      expect(mockApiClientUpdate).toHaveBeenCalledWith(
        uuidId,
        expect.objectContaining({ id: uuidId }),
      );
      expect(mockApiClientSave).not.toHaveBeenCalled();
    });

    it("calls apiClient.updateWorkflow when workflow has a non-UUID id", async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow("slug-workflow"));
      mockApiClientUpdate.mockResolvedValue(backendWorkflow("slug-workflow"));

      await globalSaveWorkflow({ apiClient });

      expect(mockApiClientUpdate).toHaveBeenCalledWith(
        "slug-workflow",
        expect.objectContaining({ id: "slug-workflow" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Event handler hooks
  // -------------------------------------------------------------------------

  describe("event handlers", () => {
    it("cancels save when onBeforeSave returns false", async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(""));
      const onBeforeSave = vi.fn().mockResolvedValue(false);

      await globalSaveWorkflow({ eventHandlers: { onBeforeSave } });

      expect(mockCreateWorkflow).not.toHaveBeenCalled();
      expect(mockUpdateWorkflow).not.toHaveBeenCalled();
    });

    it("proceeds with save when onBeforeSave returns true", async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(""));
      mockCreateWorkflow.mockResolvedValue(backendWorkflow("new-id"));
      const onBeforeSave = vi.fn().mockResolvedValue(true);

      await globalSaveWorkflow({ eventHandlers: { onBeforeSave } });

      expect(mockCreateWorkflow).toHaveBeenCalledTimes(1);
    });

    it("calls onAfterSave with the saved workflow on success", async () => {
      const saved = backendWorkflow("backend-id");
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(""));
      mockCreateWorkflow.mockResolvedValue(saved);
      const onAfterSave = vi.fn().mockResolvedValue(undefined);

      await globalSaveWorkflow({ eventHandlers: { onAfterSave } });

      expect(onAfterSave).toHaveBeenCalledWith(saved);
    });
  });

  // -------------------------------------------------------------------------
  // Guard: no workflow in store
  // -------------------------------------------------------------------------

  it("returns early without making any API call when store is empty", async () => {
    mockGetWorkflowStore.mockReturnValue(null);

    await globalSaveWorkflow({});

    expect(mockCreateWorkflow).not.toHaveBeenCalled();
    expect(mockUpdateWorkflow).not.toHaveBeenCalled();
  });
});

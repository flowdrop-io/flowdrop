/**
 * Unit Tests - Global Save Service
 *
 * Tests for the globalSaveWorkflow() function, focusing on correct routing
 * between saveWorkflow (POST/create) and updateWorkflow (PUT) based on whether
 * the workflow already has a backend-assigned id.
 *
 * In 2.0 globalSave persists through the instance's API client (fd.api.client)
 * — the legacy module workflowApi path was removed. The create-vs-update
 * decision still hinges on id presence, not the id's format.
 *
 * Regression coverage for: UUID Workflow ID Bug (issue #26)
 * Previously a UUID regex was used to detect new workflows, which caused
 * backends that use UUIDs as primary keys to always POST instead of PUT.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Workflow } from '$lib/types/index.js';
import { globalSaveWorkflow, globalExportWorkflow } from '$lib/services/globalSave.js';
import { ApiError } from '$lib/api/enhanced-client.js';
import { SaveConflictStore } from '$lib/stores/saveConflictStore.svelte.js';
import { defaultMessages } from '$lib/messages/defaults.js';
import { apiToasts } from '$lib/services/toastService.js';
import { createTestNode, createTestWorkflow } from '../../utils/index.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// vi.mock factories are hoisted to the top of the file, so variables they
// reference must be initialised with vi.hoisted() to be available in time.
const {
  mockGetWorkflowStore,
  mockWorkflowActionsBatchUpdate,
  mockStoreMarkAsSaved,
  mockClientSave,
  mockClientUpdate,
  mockApiIsConfigured,
  mockApiConfigure,
  mockStoreAcknowledgeServer,
  mockNoteWorkflowSaved,
  mockReport,
  mockImpactSupported,
  mockCheckImpact,
  mockConfirmImpact,
  mockImpactPending,
  versionState,
  mockShowInfo,
  mockShowSuccess,
  mockClientLoad,
  mockStoreInitialize
} = vi.hoisted(() => ({
  mockGetWorkflowStore: vi.fn(),
  mockWorkflowActionsBatchUpdate: vi.fn(),
  mockStoreMarkAsSaved: vi.fn(),
  mockClientSave: vi.fn(),
  mockClientUpdate: vi.fn(),
  mockApiIsConfigured: vi.fn(),
  mockApiConfigure: vi.fn(),
  mockStoreAcknowledgeServer: vi.fn(),
  mockNoteWorkflowSaved: vi.fn(),
  mockReport: vi.fn(),
  mockImpactSupported: vi.fn(() => false),
  mockCheckImpact: vi.fn(),
  mockConfirmImpact: vi.fn(),
  mockImpactPending: vi.fn(() => false),
  versionState: { editVersion: 0, locked: false },
  mockShowInfo: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockClientLoad: vi.fn(),
  mockStoreInitialize: vi.fn()
}));

vi.mock('$lib/services/impactService.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/services/impactService.js')>()),
  impactSupported: (...args: unknown[]) => mockImpactSupported(...(args as [])),
  checkImpact: (...args: unknown[]) => mockCheckImpact(...args)
}));

vi.mock('$lib/services/impactGate.js', () => ({
  confirmImpact: (...args: unknown[]) => mockConfirmImpact(...args),
  impactPending: (...args: unknown[]) => mockImpactPending(...args)
}));

// globalSave resolves its target via getDefaultInstance(). Mock the instance
// container so the fake workflow store's `current` getter reads from
// mockGetWorkflowStore, mutations route to the mock fns, and the API context
// exposes a client whose save/update route to mockClientSave/mockClientUpdate.
vi.mock('$lib/stores/instanceContainer.svelte.js', () => {
  // One stable instance: per-instance state in globalSave is keyed on it.
  const instance = {
    skinScope: null,
    workflow: {
      get editVersion() {
        return versionState.editVersion;
      },
      get isDirty() {
        return true;
      },
      get locked() {
        return versionState.locked;
      },
      get current() {
        return mockGetWorkflowStore();
      },
      batchUpdate: (...args: unknown[]) => mockWorkflowActionsBatchUpdate(...args),
      markAsSaved: (...args: unknown[]) => mockStoreMarkAsSaved(...args),
      initialize: (...args: unknown[]) => mockStoreInitialize(...args),
      acknowledgeServer: (...args: unknown[]) => mockStoreAcknowledgeServer(...args)
    },
    messages: () => ({
      autoSave: { waiting: 'Autosave is waiting' },
      lock: { saveRefused: 'The editor is locked, so nothing was saved.' },
      impact: {
        refused: {
          copied: 'Saved a copy.'
        }
      }
    }),
    doctor: { canOpen: false, requestOpen: () => false, schedule: () => {} },
    saveConflict: { report: (...args: unknown[]) => mockReport(...args) },
    runs: {
      noteWorkflowSaved: (...args: unknown[]) => mockNoteWorkflowSaved(...args)
    },
    api: {
      isConfigured: (...args: unknown[]) => mockApiIsConfigured(...args),
      get config() {
        return { baseUrl: '/api/flowdrop' };
      },
      authProvider: undefined,
      configure: (...args: unknown[]) => mockApiConfigure(...args),
      get client() {
        return {
          saveWorkflow: (...args: unknown[]) => mockClientSave(...args),
          updateWorkflow: (...args: unknown[]) => mockClientUpdate(...args),
          loadWorkflow: (...args: unknown[]) => mockClientLoad(...args)
        };
      }
    }
  };
  return { getDefaultInstance: () => instance };
});

vi.mock('$lib/services/toastService.js', () => ({
  showInfo: (...args: unknown[]) => mockShowInfo(...args),
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  apiToasts: { loading: vi.fn(() => 'toast-id'), error: vi.fn() },
  workflowToasts: { saved: vi.fn() },
  showError: vi.fn(),
  dismissToast: vi.fn()
}));

vi.mock('$lib/config/endpoints.js', () => ({
  createEndpointConfig: vi.fn(() => ({ baseUrl: '/api/flowdrop' }))
}));

vi.mock('svelte', () => ({
  tick: () => Promise.resolve()
}));

const FIXED_UUID = 'aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb';
vi.mock('uuid', () => ({ v4: () => FIXED_UUID }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a workflow with the given id (use '' or undefined for new) */
function storeWorkflow(id: string) {
  return createTestWorkflow({ id });
}

/** A workflow with the given id and nodes */
function storeWorkflowWith(id: string, nodes: Workflow['nodes']) {
  return createTestWorkflow({ id, nodes });
}

/** Saved workflow returned by the backend */
function backendWorkflow(id: string) {
  return createTestWorkflow({ id });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('globalSaveWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate a configured API context so ensureApiConfiguration exits early.
    mockApiIsConfigured.mockReturnValue(true);
    mockImpactSupported.mockReturnValue(false);
    mockImpactPending.mockReturnValue(false);
    // The instance is shared, and autosave refusals are remembered per version.
    versionState.editVersion += 1000;
  });

  describe('impact check', () => {
    const report = {
      confirm: true,
      interfaceLevel: 'breaking',
      interfaceBreaking: true,
      items: [{ kind: 'profile', severity: 'breaks', label: 'Quick', message: 'off', url: null }]
    };

    beforeEach(() => {
      mockImpactSupported.mockReturnValue(true);
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));
      mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));
    });

    it('saves without a dialog when nothing needs confirming', async () => {
      mockCheckImpact.mockResolvedValue({ status: 'ok', report: { ...report, confirm: false } });

      expect(await globalSaveWorkflow({})).toBe(true);

      expect(mockConfirmImpact).not.toHaveBeenCalled();
      expect(mockClientUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not save and returns false when the person cancels', async () => {
      mockCheckImpact.mockResolvedValue({ status: 'ok', report });
      mockConfirmImpact.mockResolvedValue({ action: 'cancel' });

      expect(await globalSaveWorkflow({})).toBe(false);

      expect(mockConfirmImpact).toHaveBeenCalledWith(expect.objectContaining({ report }));
      expect(mockClientUpdate).not.toHaveBeenCalled();
      expect(apiToasts.loading).not.toHaveBeenCalled();
      expect(mockStoreMarkAsSaved).not.toHaveBeenCalled();
    });

    it('saves after Save anyway', async () => {
      mockCheckImpact.mockResolvedValue({ status: 'ok', report });
      mockConfirmImpact.mockResolvedValue({ action: 'save' });

      expect(await globalSaveWorkflow({})).toBe(true);

      expect(mockClientUpdate).toHaveBeenCalledTimes(1);
    });

    describe('renames and refusals', () => {
      const renameReport = {
        ...report,
        confirm: false,
        renames: [
          {
            direction: 'output',
            from: 'node',
            to: 'article',
            places: [
              { kind: 'block', severity: 'changes', label: 'Tags', message: 'maps', url: null }
            ] as unknown[]
          }
        ]
      };
      const refusedReport = {
        ...report,
        refused: true,
        refusedMessage: null,
        copyUrl: '/workflow/wf-1/copy',
        renames: []
      };

      it('asks when only a rename needs an answer, and sends followRenames as ticked', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: renameReport });
        mockConfirmImpact.mockResolvedValue({ action: 'save', followRenames: true });

        expect(await globalSaveWorkflow({})).toBe(true);

        expect(mockConfirmImpact).toHaveBeenCalledTimes(1);
        expect(mockClientUpdate).toHaveBeenCalledWith('wf-1', expect.anything(), {
          followRenames: true
        });
      });

      it('a rename nothing uses neither asks nor stops autosave', async () => {
        const unused = {
          ...renameReport,
          renames: [{ direction: 'input', from: 'a', to: 'b', places: [] as unknown[] }]
        };
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: unused });

        expect(await globalSaveWorkflow({})).toBe(true);
        expect(await globalSaveWorkflow({ interactive: false })).toBe(true);

        expect(mockConfirmImpact).not.toHaveBeenCalled();
        expect(mockClientUpdate.mock.calls[0]).toHaveLength(2);
      });

      it('offers no Save as a copy for a copy url on another origin', async () => {
        mockCheckImpact.mockResolvedValue({
          status: 'ok',
          report: { ...refusedReport, copyUrl: 'https://evil.example.com/copy' }
        });
        mockConfirmImpact.mockResolvedValue({ action: 'cancel' });

        await globalSaveWorkflow({});

        expect(mockConfirmImpact.mock.calls[0][0].saveAsCopy).toBeUndefined();
      });

      it('sends followRenames false when the box stays unticked', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: renameReport });
        mockConfirmImpact.mockResolvedValue({ action: 'save', followRenames: false });

        await globalSaveWorkflow({});

        expect(mockClientUpdate).toHaveBeenCalledWith('wf-1', expect.anything(), {
          followRenames: false
        });
      });

      it('sends no followRenames when the report has no renames', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report });
        mockConfirmImpact.mockResolvedValue({ action: 'save' });

        await globalSaveWorkflow({});

        expect(mockClientUpdate.mock.calls[0]).toHaveLength(2);
      });

      it('autosave does not save past a rename that needs an answer', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: renameReport });

        expect(await globalSaveWorkflow({ interactive: false })).toBe(false);

        expect(mockClientUpdate).not.toHaveBeenCalled();
      });

      it('a refused check never saves, whatever the dialog answers', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact.mockResolvedValue({ action: 'cancel' });

        expect(await globalSaveWorkflow({})).toBe(false);

        expect(mockConfirmImpact).toHaveBeenCalledWith(
          expect.objectContaining({ report: refusedReport, saveAsCopy: expect.any(Function) })
        );
        expect(mockClientUpdate).not.toHaveBeenCalled();
      });

      it('hands a saved copy to onSavedAsCopy and does not save the original', async () => {
        const copy = { id: '9', editorUrl: '/admin/9' };
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact.mockResolvedValue({ action: 'copied', copy });
        const onSavedAsCopy = vi.fn(async () => {});

        expect(await globalSaveWorkflow({ eventHandlers: { onSavedAsCopy } })).toBe(false);

        expect(onSavedAsCopy).toHaveBeenCalledWith(copy, expect.objectContaining({ id: 'wf-1' }));
        expect(mockClientUpdate).not.toHaveBeenCalled();
      });

      it('follows the copy editor url when the host has no handler', async () => {
        const assign = vi.fn();
        vi.stubGlobal('window', { ...globalThis.window, location: { assign } });
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact.mockResolvedValue({
          action: 'copied',
          copy: { id: '9', editorUrl: '/admin/9' }
        });

        await globalSaveWorkflow({});

        expect(assign).toHaveBeenCalledWith('/admin/9');
        vi.unstubAllGlobals();
      });

      it('marks the workflow saved and drops the draft before following the copy', async () => {
        const order: string[] = [];
        const assign = vi.fn(() => order.push('assign'));
        vi.stubGlobal('window', { ...globalThis.window, location: { assign } });
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact.mockResolvedValue({
          action: 'copied',
          copy: { id: '9', editorUrl: '/admin/9' }
        });
        mockStoreMarkAsSaved.mockImplementation(() => order.push('saved'));
        const onDiscardDraft = vi.fn(() => order.push('draft'));

        await globalSaveWorkflow({ onDiscardDraft });

        expect(order).toEqual(['saved', 'draft', 'assign']);
        mockStoreMarkAsSaved.mockReset();
        vi.unstubAllGlobals();
      });

      it('says the copy was saved and stays put with no url and no handler', async () => {
        const assign = vi.fn();
        vi.stubGlobal('window', { ...globalThis.window, location: { assign } });
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact.mockResolvedValue({
          action: 'copied',
          copy: { id: '9', editorUrl: null }
        });

        await globalSaveWorkflow({});

        expect(mockShowSuccess).toHaveBeenCalledWith('Saved a copy.');
        expect(assign).not.toHaveBeenCalled();
        expect(mockStoreMarkAsSaved).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
      });

      it('an onSavedAsCopy that throws is logged, not a failed save (check refused)', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact.mockResolvedValue({
          action: 'copied',
          copy: { id: '9', editorUrl: null }
        });
        const onSaveError = vi.fn();
        const onSavedAsCopy = vi.fn(async () => {
          throw new Error('host broke');
        });

        expect(await globalSaveWorkflow({ eventHandlers: { onSavedAsCopy, onSaveError } })).toBe(
          false
        );

        expect(onSaveError).not.toHaveBeenCalled();
        expect(apiToasts.error).not.toHaveBeenCalled();
      });

      it('an onSavedAsCopy that throws does not escape a save refused as breaking', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact
          .mockResolvedValueOnce({ action: 'save' })
          .mockResolvedValueOnce({ action: 'copied', copy: { id: '9', editorUrl: null } });
        mockClientUpdate.mockRejectedValue(
          new ApiError('Refused', 409, 'update workflow', {
            error_code: 'WORKFLOW_IN_USE_BREAKING',
            error: 'Refused'
          })
        );
        const onSavedAsCopy = vi.fn(async () => {
          throw new Error('host broke');
        });

        expect(await globalSaveWorkflow({ eventHandlers: { onSavedAsCopy } })).toBe(false);
      });

      it('offers Discard my changes only when the draft has an id', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact.mockResolvedValue({ action: 'cancel' });

        await globalSaveWorkflow({});

        expect(mockConfirmImpact.mock.calls[0][0].discard).toEqual(expect.any(Function));
      });

      it('Discard my changes loads the saved version, drops the stored draft and tells the host', async () => {
        const saved = { id: 'wf-1', name: 'Saved', nodes: [], edges: [] };
        mockClientLoad.mockResolvedValue(saved);
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        mockConfirmImpact.mockImplementationOnce(
          async (options: { discard: () => Promise<void> }) => {
            await options.discard();
            return { action: 'discarded' };
          }
        );
        const onDiscardDraft = vi.fn();
        const onWorkflowLoad = vi.fn();

        expect(
          await globalSaveWorkflow({ onDiscardDraft, eventHandlers: { onWorkflowLoad } })
        ).toBe(false);

        expect(mockStoreInitialize).toHaveBeenCalledWith(saved);
        expect(onDiscardDraft).toHaveBeenCalledTimes(1);
        expect(onWorkflowLoad).toHaveBeenCalledWith(saved);
        expect(mockClientUpdate).not.toHaveBeenCalled();
      });

      it('shows the refused state when the save itself is refused as breaking', async () => {
        mockCheckImpact.mockResolvedValue({
          status: 'ok',
          report: { ...renameReport, copyUrl: '/workflow/wf-1/copy' }
        });
        mockConfirmImpact
          .mockResolvedValueOnce({ action: 'save', followRenames: false })
          .mockResolvedValueOnce({ action: 'cancel' });
        mockClientUpdate.mockRejectedValue(
          new ApiError('Breaking change refused', 409, 'update workflow', {
            error_code: 'WORKFLOW_IN_USE_BREAKING',
            error: 'Breaking change refused',
            details: [
              { kind: 'block', severity: 'breaks', label: 'Tags', message: 'maps node', url: null }
            ]
          })
        );

        expect(await globalSaveWorkflow({})).toBe(false);

        expect(mockConfirmImpact).toHaveBeenCalledTimes(2);
        expect(mockConfirmImpact.mock.calls[1][0].report).toMatchObject({
          refused: true,
          refusedMessage: 'Breaking change refused',
          copyUrl: '/workflow/wf-1/copy',
          items: [{ label: 'Tags' }]
        });
        expect(apiToasts.error).not.toHaveBeenCalled();
      });

      it('tells onRefused what the person did about a refused check', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report: refusedReport });
        const onRefused = vi.fn();

        mockConfirmImpact.mockResolvedValueOnce({ action: 'cancel' });
        expect(await globalSaveWorkflow({ onRefused })).toBe(false);
        mockConfirmImpact.mockResolvedValueOnce({ action: 'discarded' });
        await globalSaveWorkflow({ onRefused });
        mockConfirmImpact.mockResolvedValueOnce({
          action: 'copied',
          copy: { id: '9', editorUrl: null }
        });
        await globalSaveWorkflow({ onRefused, features: { showToasts: false } });

        expect(onRefused.mock.calls).toEqual([['kept'], ['discarded'], ['copied']]);
      });

      it('does not call onRefused for an ordinary cancel', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'ok', report });
        mockConfirmImpact.mockResolvedValue({ action: 'cancel' });
        const onRefused = vi.fn();

        expect(await globalSaveWorkflow({ onRefused })).toBe(false);

        expect(onRefused).not.toHaveBeenCalled();
      });

      it('calls onRefused when the save itself is refused as breaking', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'unavailable' });
        mockConfirmImpact.mockResolvedValue({ action: 'cancel' });
        mockClientUpdate.mockRejectedValue(
          new ApiError('Breaking change refused', 409, 'update workflow', {
            error_code: 'WORKFLOW_IN_USE_BREAKING',
            error: 'Breaking change refused'
          })
        );
        const onRefused = vi.fn();

        expect(await globalSaveWorkflow({ onRefused })).toBe(false);

        expect(onRefused).toHaveBeenCalledWith('kept');
      });

      it('another failed save still throws and toasts', async () => {
        mockCheckImpact.mockResolvedValue({ status: 'unavailable' });
        mockClientUpdate.mockRejectedValue(
          new ApiError('Nope', 422, 'update workflow', { error_code: 'OTHER' })
        );

        await expect(globalSaveWorkflow({})).rejects.toThrow('Nope');
        expect(mockConfirmImpact).not.toHaveBeenCalled();
      });
    });

    it('saves when the backend has no impact route', async () => {
      mockCheckImpact.mockResolvedValue({ status: 'unavailable' });

      expect(await globalSaveWorkflow({})).toBe(true);

      expect(mockConfirmImpact).not.toHaveBeenCalled();
      expect(mockClientUpdate).toHaveBeenCalledTimes(1);
    });

    it('shows a failed check and does not save when the person cancels', async () => {
      mockCheckImpact.mockResolvedValue({ status: 'error', message: 'boom' });
      mockConfirmImpact.mockResolvedValue({ action: 'cancel' });

      expect(await globalSaveWorkflow({})).toBe(false);

      expect(mockConfirmImpact).toHaveBeenCalledWith(expect.objectContaining({ error: 'boom' }));
      expect(mockClientUpdate).not.toHaveBeenCalled();
    });

    it('autosave (interactive: false) neither asks nor saves when the check needs an answer', async () => {
      mockCheckImpact.mockResolvedValue({ status: 'ok', report });

      expect(await globalSaveWorkflow({ interactive: false })).toBe(false);

      expect(mockConfirmImpact).not.toHaveBeenCalled();
      expect(mockClientUpdate).not.toHaveBeenCalled();
      expect(mockStoreMarkAsSaved).not.toHaveBeenCalled();
    });

    it('autosave does not ask about a failed check either', async () => {
      mockCheckImpact.mockResolvedValue({ status: 'error', message: 'boom' });

      expect(await globalSaveWorkflow({ interactive: false })).toBe(false);

      expect(mockConfirmImpact).not.toHaveBeenCalled();
      expect(mockClientUpdate).not.toHaveBeenCalled();
    });

    it('autosave still saves when nothing needs confirming', async () => {
      mockCheckImpact.mockResolvedValue({ status: 'ok', report: { ...report, confirm: false } });

      expect(await globalSaveWorkflow({ interactive: false })).toBe(true);

      expect(mockClientUpdate).toHaveBeenCalledTimes(1);
    });

    it('a second save while a question is open opens no second dialog and saves nothing', async () => {
      mockImpactPending.mockReturnValue(true);

      expect(await globalSaveWorkflow({})).toBe(false);

      expect(mockCheckImpact).not.toHaveBeenCalled();
      expect(mockConfirmImpact).not.toHaveBeenCalled();
      expect(mockClientUpdate).not.toHaveBeenCalled();
    });

    it('does not ask for a new workflow', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockResolvedValue(backendWorkflow('new-id'));

      await globalSaveWorkflow({});

      expect(mockCheckImpact).not.toHaveBeenCalled();
      expect(mockClientSave).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // create vs update routing (id-presence decides — never UUID-regex)
  // -------------------------------------------------------------------------

  describe('create vs update routing', () => {
    it('calls client.saveWorkflow when workflow has no id (new workflow)', async () => {
      const workflow = storeWorkflow('');
      mockGetWorkflowStore.mockReturnValue(workflow);
      mockClientSave.mockResolvedValue(backendWorkflow('server-assigned-id'));

      await globalSaveWorkflow({});

      expect(mockClientSave).toHaveBeenCalledTimes(1);
      expect(mockClientUpdate).not.toHaveBeenCalled();

      // The new workflow is sent with the client-generated uuid fallback as its id.
      const [postedWorkflow] = mockClientSave.mock.calls[0];
      expect(postedWorkflow.id).toBe(FIXED_UUID);
    });

    it('calls client.updateWorkflow when workflow has a non-UUID id (existing workflow)', async () => {
      const workflow = storeWorkflow('123');
      mockGetWorkflowStore.mockReturnValue(workflow);
      mockClientUpdate.mockResolvedValue(backendWorkflow('123'));

      await globalSaveWorkflow({});

      expect(mockClientUpdate).toHaveBeenCalledTimes(1);
      expect(mockClientUpdate).toHaveBeenCalledWith('123', expect.objectContaining({ id: '123' }));
      expect(mockClientSave).not.toHaveBeenCalled();
    });

    it('calls client.updateWorkflow when workflow has a UUID id (regression: issue #26)', async () => {
      const uuidId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const workflow = storeWorkflow(uuidId);
      mockGetWorkflowStore.mockReturnValue(workflow);
      mockClientUpdate.mockResolvedValue(backendWorkflow(uuidId));

      await globalSaveWorkflow({});

      expect(mockClientUpdate).toHaveBeenCalledTimes(1);
      expect(mockClientUpdate).toHaveBeenCalledWith(
        uuidId,
        expect.objectContaining({ id: uuidId })
      );
      expect(mockClientSave).not.toHaveBeenCalled();
    });

    it('calls client.updateWorkflow when workflow has a slug id', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('slug-workflow'));
      mockClientUpdate.mockResolvedValue(backendWorkflow('slug-workflow'));

      await globalSaveWorkflow({});

      expect(mockClientUpdate).toHaveBeenCalledWith(
        'slug-workflow',
        expect.objectContaining({ id: 'slug-workflow' })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Event handler hooks
  // -------------------------------------------------------------------------

  describe('event handlers', () => {
    it('cancels save when onBeforeSave returns false', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      const onBeforeSave = vi.fn().mockResolvedValue(false);

      await globalSaveWorkflow({ eventHandlers: { onBeforeSave } });

      expect(mockClientSave).not.toHaveBeenCalled();
      expect(mockClientUpdate).not.toHaveBeenCalled();
    });

    it('proceeds with save when onBeforeSave returns true', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockResolvedValue(backendWorkflow('new-id'));
      const onBeforeSave = vi.fn().mockResolvedValue(true);

      await globalSaveWorkflow({ eventHandlers: { onBeforeSave } });

      expect(mockClientSave).toHaveBeenCalledTimes(1);
    });

    it('tells the run controller after a write, so an open conversation marks the version', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockResolvedValue(backendWorkflow('backend-id'));

      await globalSaveWorkflow({});

      expect(mockNoteWorkflowSaved).toHaveBeenCalledTimes(1);
    });

    it('does not tell the run controller when the save fails or is cancelled', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockRejectedValue(new Error('boom'));
      await expect(globalSaveWorkflow({})).rejects.toThrow('boom');

      await globalSaveWorkflow({
        eventHandlers: { onBeforeSave: vi.fn().mockResolvedValue(false) }
      });

      expect(mockNoteWorkflowSaved).not.toHaveBeenCalled();
    });

    it('calls onAfterSave with the saved workflow on success', async () => {
      const saved = backendWorkflow('backend-id');
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockResolvedValue(saved);
      const onAfterSave = vi.fn().mockResolvedValue(undefined);

      await globalSaveWorkflow({ eventHandlers: { onAfterSave } });

      expect(onAfterSave).toHaveBeenCalledWith(saved);
    });
  });

  // -------------------------------------------------------------------------
  // Guard: no workflow in store
  // -------------------------------------------------------------------------

  it('returns early without making any API call when store is empty', async () => {
    mockGetWorkflowStore.mockReturnValue(null);

    await globalSaveWorkflow({});

    expect(mockClientSave).not.toHaveBeenCalled();
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });

  describe('a locked editor', () => {
    afterEach(() => {
      versionState.locked = false;
    });

    it("saves nothing and says so when a person saves (a host's own Save button)", async () => {
      versionState.locked = true;
      mockGetWorkflowStore.mockReturnValue({ id: 'wf-1', name: 'W', nodes: [], edges: [] });

      expect(await globalSaveWorkflow({})).toBe(false);

      expect(mockClientUpdate).not.toHaveBeenCalled();
      expect(mockShowInfo).toHaveBeenCalledWith(
        'The editor is locked, so nothing was saved.',
        expect.objectContaining({ id: expect.stringContaining('save-locked') })
      );
    });

    it('stays quiet for autosave and when toasts are off', async () => {
      versionState.locked = true;
      mockGetWorkflowStore.mockReturnValue({ id: 'wf-1', name: 'W', nodes: [], edges: [] });

      expect(await globalSaveWorkflow({ interactive: false })).toBe(false);
      expect(await globalSaveWorkflow({ features: { showToasts: false } })).toBe(false);

      expect(mockClientUpdate).not.toHaveBeenCalled();
      expect(mockShowInfo).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // onSaved callback
  // -------------------------------------------------------------------------

  describe('onSaved callback', () => {
    it('is called with the server-returned workflow after a create', async () => {
      const serverWorkflow = backendWorkflow('server-assigned-id');
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockResolvedValue(serverWorkflow);
      const onSaved = vi.fn();

      await globalSaveWorkflow({ onSaved });

      expect(onSaved).toHaveBeenCalledOnce();
      expect(onSaved).toHaveBeenCalledWith(serverWorkflow);
    });

    it('receives the server-assigned ID, not the client UUID, for new workflows', async () => {
      const serverWorkflow = backendWorkflow('server-integer-42');
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockResolvedValue(serverWorkflow);
      const onSaved = vi.fn();

      await globalSaveWorkflow({ onSaved });

      const [calledWith] = onSaved.mock.calls[0];
      expect(calledWith.id).toBe('server-integer-42');
      expect(calledWith.id).not.toBe(FIXED_UUID);
    });

    it('is called with the server-returned workflow after an update', async () => {
      const serverWorkflow = backendWorkflow('existing-id');
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('existing-id'));
      mockClientUpdate.mockResolvedValue(serverWorkflow);
      const onSaved = vi.fn();

      await globalSaveWorkflow({ onSaved });

      expect(onSaved).toHaveBeenCalledWith(serverWorkflow);
    });

    it('is not called when the API call fails', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockRejectedValue(new Error('Network error'));
      const onSaved = vi.fn();

      await expect(globalSaveWorkflow({ onSaved })).rejects.toThrow('Network error');
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('is not called when cancelled by onBeforeSave returning false', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      const onSaved = vi.fn();

      await globalSaveWorkflow({
        eventHandlers: { onBeforeSave: vi.fn().mockResolvedValue(false) },
        onSaved
      });

      expect(onSaved).not.toHaveBeenCalled();
      expect(mockClientSave).not.toHaveBeenCalled();
    });

    it('is not called when the store is empty', async () => {
      mockGetWorkflowStore.mockReturnValue(null);
      const onSaved = vi.fn();

      await globalSaveWorkflow({ onSaved });

      expect(onSaved).not.toHaveBeenCalled();
    });

    it('is called after onMarkAsSaved', async () => {
      const callOrder: string[] = [];
      mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
      mockClientSave.mockResolvedValue(backendWorkflow('new-id'));

      await globalSaveWorkflow({
        onMarkAsSaved: () => callOrder.push('markAsSaved'),
        onSaved: () => callOrder.push('onSaved')
      });

      expect(callOrder).toEqual(['markAsSaved', 'onSaved']);
    });
  });

  // -------------------------------------------------------------------------
  // interface round-trip (the payload is an explicit key list — a contract
  // field missing from it is silently stripped on every save)
  // -------------------------------------------------------------------------

  describe('revision round trip', () => {
    it('sends the loaded revision on update and takes the new one from the response', async () => {
      mockGetWorkflowStore.mockReturnValue({ ...storeWorkflow('wf-1'), revision: '100' });
      mockClientUpdate.mockResolvedValue({
        ...backendWorkflow('wf-1'),
        revision: '101',
        can: { save: true, run: false }
      });

      await globalSaveWorkflow();

      expect(mockClientUpdate).toHaveBeenCalledWith(
        'wf-1',
        expect.objectContaining({ revision: '100' })
      );
      expect(mockStoreAcknowledgeServer).toHaveBeenCalledWith({
        revision: '101',
        can: { save: true, run: false }
      });
    });

    it('omits revision when the workflow carries none', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));
      mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));

      await globalSaveWorkflow();

      const sent = mockClientUpdate.mock.calls[0][1] as Record<string, unknown>;
      expect(sent).not.toHaveProperty('revision');
      expect(sent).not.toHaveProperty('can');
    });
  });

  describe('a clashing save (409 CONFLICT)', () => {
    const conflict = () =>
      new ApiError('Conflict', 409, 'update workflow', {
        error_code: 'CONFLICT',
        details: { current: '200', sent: '100' }
      });

    it('reports the clash with the server revision, skips the generic toast and still rejects', async () => {
      mockGetWorkflowStore.mockReturnValue({ ...storeWorkflow('wf-1'), revision: '100' });
      mockClientUpdate.mockRejectedValue(conflict());

      await expect(globalSaveWorkflow()).rejects.toBeInstanceOf(ApiError);

      expect(mockReport).toHaveBeenCalledWith(
        expect.objectContaining({ currentRevision: '200' }),
        true
      );
      expect(apiToasts.error).not.toHaveBeenCalled();
    });

    it('keepMine takes the new revision and sends the save again', async () => {
      mockGetWorkflowStore.mockReturnValue({ ...storeWorkflow('wf-1'), revision: '100' });
      mockClientUpdate.mockRejectedValueOnce(conflict());
      mockClientUpdate.mockResolvedValueOnce({ ...backendWorkflow('wf-1'), revision: '201' });
      await expect(globalSaveWorkflow()).rejects.toBeInstanceOf(ApiError);
      const report = mockReport.mock.calls[0][0] as {
        currentRevision: string;
        retry: () => Promise<boolean>;
      };

      const acknowledgeServer = vi.fn();
      const store = new SaveConflictStore({
        workflow: { acknowledgeServer },
        loadWorkflow: vi.fn(),
        schedule: vi.fn(),
        messages: () => defaultMessages
      } as never);
      store.report(report);
      await store.keepMine();

      expect(acknowledgeServer).toHaveBeenCalledWith({ revision: '200' });
      expect(mockClientUpdate).toHaveBeenCalledTimes(2);
      expect(mockStoreMarkAsSaved).toHaveBeenCalled();
    });

    it('loadTheirs loads the saved version and leaves the editor clean', async () => {
      const loadWorkflow = vi.fn().mockResolvedValue(backendWorkflow('wf-1'));
      const initialize = vi.fn();
      const schedule = vi.fn();
      const store = new SaveConflictStore({
        workflow: { current: storeWorkflow('wf-1'), initialize },
        loadWorkflow,
        schedule,
        messages: () => defaultMessages
      } as never);
      store.report({ currentRevision: '200', retry: async () => true });

      await store.loadTheirs();

      expect(loadWorkflow).toHaveBeenCalledWith('wf-1');
      expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ id: 'wf-1' }));
      expect(schedule).toHaveBeenCalled();
      expect(store.comparing).toBe(false);
    });

    it('reports a missing revision as null', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));
      mockClientUpdate.mockRejectedValue(
        new ApiError('Conflict', 409, 'update workflow', { error_code: 'CONFLICT' })
      );
      await expect(globalSaveWorkflow()).rejects.toBeInstanceOf(ApiError);
      expect(mockReport).toHaveBeenCalledWith(
        expect.objectContaining({ currentRevision: null }),
        true
      );
    });

    it('still reports the clash, without the toast, when toasts are off or the host handles the error', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));
      mockClientUpdate.mockRejectedValue(conflict());
      await expect(globalSaveWorkflow({ features: { showToasts: false } })).rejects.toBeInstanceOf(
        ApiError
      );
      expect(mockReport).toHaveBeenLastCalledWith(expect.anything(), false);

      await expect(
        globalSaveWorkflow({ eventHandlers: { onApiError: () => true } })
      ).rejects.toBeInstanceOf(ApiError);
      expect(mockReport).toHaveBeenLastCalledWith(expect.anything(), false);
      expect(apiToasts.error).not.toHaveBeenCalled();
    });

    it('keeps the old toast for a 409 that is not a revision clash', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));
      mockClientUpdate.mockRejectedValue(
        new ApiError('Taken', 409, 'update workflow', { error_code: 'WORKFLOW_ID_CONFLICT' })
      );

      await expect(globalSaveWorkflow()).rejects.toBeInstanceOf(ApiError);

      expect(mockReport).not.toHaveBeenCalled();
      expect(apiToasts.error).toHaveBeenCalled();
    });
  });

  describe('workflow interface serialization', () => {
    const iface = {
      inputs: [
        {
          id: 'customer_name',
          dataType: 'string',
          required: true,
          bindings: [{ nodeId: 'node-1', portId: 'name' }]
        }
      ],
      outputs: []
    };

    it('sends interface on update when the workflow declares one', async () => {
      mockGetWorkflowStore.mockReturnValue({ ...storeWorkflow('wf-1'), interface: iface });
      mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));

      await globalSaveWorkflow();

      expect(mockClientUpdate).toHaveBeenCalledWith(
        'wf-1',
        expect.objectContaining({ interface: iface })
      );
    });

    it('sends interface on create when the workflow declares one', async () => {
      mockGetWorkflowStore.mockReturnValue({ ...storeWorkflow(''), interface: iface });
      mockClientSave.mockResolvedValue(backendWorkflow('new-id'));

      await globalSaveWorkflow();

      expect(mockClientSave).toHaveBeenCalledWith(expect.objectContaining({ interface: iface }));
    });

    it('omits the interface key entirely when the workflow declares none', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));
      mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));

      await globalSaveWorkflow();

      const payload = mockClientUpdate.mock.calls[0][1] as Record<string, unknown>;
      expect('interface' in payload).toBe(false);
    });
  });
  describe('run status is never saved', () => {
    const status = { status: 'completed', executionCount: 1, isExecuting: false };
    function withStatus(id: string) {
      const node = createTestNode({ id: 'n1' });
      return storeWorkflowWith(id, [{ ...node, data: { ...node.data, executionInfo: status } }]);
    }

    it('strips executionInfo from the nodes sent on update', async () => {
      mockGetWorkflowStore.mockReturnValue(withStatus('wf-1'));
      mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));

      await globalSaveWorkflow();

      const payload = mockClientUpdate.mock.calls[0][1] as { nodes: { data: object }[] };
      expect(payload.nodes.length).toBeGreaterThan(0);
      for (const node of payload.nodes) expect('executionInfo' in node.data).toBe(false);
    });

    it('strips executionInfo from the nodes sent on create', async () => {
      mockGetWorkflowStore.mockReturnValue(withStatus(''));
      mockClientSave.mockResolvedValue(backendWorkflow('new-id'));

      await globalSaveWorkflow();

      const payload = mockClientSave.mock.calls[0][0] as { nodes: { data: object }[] };
      for (const node of payload.nodes) expect('executionInfo' in node.data).toBe(false);
    });
  });

  describe('Playground settings serialization', () => {
    const chat = {
      message: 'msg',
      history: { input: 'hist', limit: 5 },
      session_id: null,
      message_id: null,
      replies: [{ node_id: 'n1', port: 'text' }],
      sub_workflow_replies: false
    };

    it('sends only { chat } on update, dropping resolved and source', async () => {
      mockGetWorkflowStore.mockReturnValue({
        ...storeWorkflow('wf-1'),
        playground: { chat, resolved: { ...chat, message: 'stale' }, source: 'settings' }
      });
      mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));

      await globalSaveWorkflow();

      const payload = mockClientUpdate.mock.calls[0][1] as Record<string, unknown>;
      expect(payload.playground).toEqual({ chat });
      expect(Object.keys(payload.playground as object)).toEqual(['chat']);
    });

    it('sends only { chat } on create', async () => {
      mockGetWorkflowStore.mockReturnValue({ ...storeWorkflow(''), playground: { chat } });
      mockClientSave.mockResolvedValue(backendWorkflow('new-id'));

      await globalSaveWorkflow();

      expect(mockClientSave).toHaveBeenCalledWith(
        expect.objectContaining({ playground: { chat } })
      );
    });

    it('sends { chat: null } when the workflow carries settings with no stored chat', async () => {
      mockGetWorkflowStore.mockReturnValue({
        ...storeWorkflow('wf-1'),
        playground: { chat: null, resolved: chat, source: 'interface_turn' }
      });
      mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));

      await globalSaveWorkflow();

      const payload = mockClientUpdate.mock.calls[0][1] as Record<string, unknown>;
      expect(payload.playground).toEqual({ chat: null });
    });

    it('omits the playground key entirely when the workflow has none', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));
      mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));

      await globalSaveWorkflow();

      const payload = mockClientUpdate.mock.calls[0][1] as Record<string, unknown>;
      expect('playground' in payload).toBe(false);
    });
  });

  describe('Playground settings in the export', () => {
    /** Run an export and return the JSON it downloaded. */
    async function exportedJson(): Promise<Record<string, unknown>> {
      let blob: Blob | undefined;
      const create = vi.fn((b: Blob) => {
        blob = b;
        return 'blob:test';
      });
      const originalCreate = URL.createObjectURL;
      const originalRevoke = URL.revokeObjectURL;
      URL.createObjectURL = create as unknown as typeof URL.createObjectURL;
      URL.revokeObjectURL = vi.fn();
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      try {
        await globalExportWorkflow({ features: { showToasts: false } });
      } finally {
        URL.createObjectURL = originalCreate;
        URL.revokeObjectURL = originalRevoke;
        click.mockRestore();
      }
      if (!blob) throw new Error('nothing was exported');
      return JSON.parse(await blob.text());
    }

    const chat = {
      message: 'msg',
      history: null,
      session_id: null,
      message_id: null,
      replies: [{ node_id: 'n1', port: 'text' }],
      sub_workflow_replies: true
    };

    it('carries { chat } only', async () => {
      mockGetWorkflowStore.mockReturnValue({
        ...storeWorkflow('wf-1'),
        playground: { chat, resolved: chat, source: 'settings' }
      });

      const exported = await exportedJson();

      expect(exported.playground).toEqual({ chat });
    });

    it('omits playground when the workflow has none', async () => {
      mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));

      const exported = await exportedJson();

      expect('playground' in exported).toBe(false);
    });

    it('strips executionInfo from the exported nodes', async () => {
      const node = createTestNode({ id: 'n1' });
      mockGetWorkflowStore.mockReturnValue(
        storeWorkflowWith('wf-1', [
          {
            ...node,
            data: { ...node.data, executionInfo: { status: 'failed', executionCount: 2 } }
          }
        ])
      );

      const exported = await exportedJson();

      const nodes = exported.nodes as { data: object }[];
      expect(nodes.length).toBeGreaterThan(0);
      for (const node of nodes) expect('executionInfo' in node.data).toBe(false);
    });
  });
});

describe('globalSaveWorkflow: versions, joining, ordering, autosave', () => {
  const report = {
    confirm: true,
    interfaceLevel: 'breaking',
    interfaceBreaking: true,
    items: [{ kind: 'profile', severity: 'breaks', label: 'Quick', message: 'off', url: null }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    versionState.editVersion = 5;
    mockApiIsConfigured.mockReturnValue(true);
    mockImpactSupported.mockReturnValue(false);
    mockImpactPending.mockReturnValue(false);
    mockGetWorkflowStore.mockReturnValue(storeWorkflow('wf-1'));
    mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));
  });

  it('marks saved only up to the version the snapshot was taken at', async () => {
    mockClientUpdate.mockImplementation(async () => {
      versionState.editVersion = 6; // an edit lands during the PUT
      return backendWorkflow('wf-1');
    });
    await globalSaveWorkflow({});
    expect(mockStoreMarkAsSaved).toHaveBeenCalledWith(5);

    const onMarkAsSaved = vi.fn();
    versionState.editVersion = 8;
    await globalSaveWorkflow({ onMarkAsSaved });
    expect(onMarkAsSaved).toHaveBeenCalledWith(8);
  });

  it('counts the new-id sync as saved when nothing else changed first', async () => {
    mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
    mockClientSave.mockResolvedValue(backendWorkflow('server-1'));
    mockWorkflowActionsBatchUpdate.mockImplementation(() => {
      versionState.editVersion += 1;
    });
    await globalSaveWorkflow({});
    expect(mockStoreMarkAsSaved).toHaveBeenCalledWith(6);
  });

  it('does not count the sync when another edit came first', async () => {
    mockGetWorkflowStore.mockReturnValue(storeWorkflow(''));
    mockClientSave.mockImplementation(async () => {
      versionState.editVersion = 6; // edit during the POST
      return backendWorkflow('server-1');
    });
    mockWorkflowActionsBatchUpdate.mockImplementation(() => {
      versionState.editVersion += 1;
    });
    await globalSaveWorkflow({});
    expect(mockStoreMarkAsSaved).toHaveBeenCalledWith(5);
  });

  it('joins a save already in flight: one PUT, same result', async () => {
    let release!: (w: Workflow) => void;
    mockClientUpdate.mockReturnValue(new Promise<Workflow>((r) => (release = r)));
    const first = globalSaveWorkflow({});
    const second = globalSaveWorkflow({});
    expect(second).toBe(first);
    await vi.waitFor(() => expect(mockClientUpdate).toHaveBeenCalledTimes(1));
    release(backendWorkflow('wf-1'));
    expect(await first).toBe(true);
    expect(mockClientUpdate).toHaveBeenCalledTimes(1);

    // Settled: a later save (the keepMine retry) runs again.
    mockClientUpdate.mockResolvedValue(backendWorkflow('wf-1'));
    expect(await globalSaveWorkflow({})).toBe(true);
    expect(mockClientUpdate).toHaveBeenCalledTimes(2);
  });

  it('a save while the impact dialog is open neither blurs nor calls onBeforeSave', async () => {
    mockImpactPending.mockReturnValue(true);
    const onBeforeSave = vi.fn();
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    expect(await globalSaveWorkflow({ eventHandlers: { onBeforeSave } })).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(onBeforeSave).not.toHaveBeenCalled();
    button.remove();
  });

  it('does not call onBeforeSave when the person cancels the impact question', async () => {
    mockImpactSupported.mockReturnValue(true);
    mockCheckImpact.mockResolvedValue({ status: 'ok', report });
    mockConfirmImpact.mockResolvedValue({ action: 'cancel' });
    const onBeforeSave = vi.fn();
    expect(await globalSaveWorkflow({ eventHandlers: { onBeforeSave } })).toBe(false);
    expect(onBeforeSave).not.toHaveBeenCalled();
  });

  it('calls onBeforeSave after the impact question is answered yes', async () => {
    mockImpactSupported.mockReturnValue(true);
    mockCheckImpact.mockResolvedValue({ status: 'ok', report });
    mockConfirmImpact.mockResolvedValue({ action: 'save' });
    const onBeforeSave = vi.fn().mockResolvedValue(true);
    expect(await globalSaveWorkflow({ eventHandlers: { onBeforeSave } })).toBe(true);
    expect(onBeforeSave).toHaveBeenCalledTimes(1);
  });

  describe('autosave that needs an answer', () => {
    beforeEach(() => {
      mockImpactSupported.mockReturnValue(true);
      mockCheckImpact.mockResolvedValue({ status: 'ok', report });
    });

    it('asks /impact once per version and shows one toast', async () => {
      versionState.editVersion = 20;
      expect(await globalSaveWorkflow({ interactive: false })).toBe(false);
      expect(await globalSaveWorkflow({ interactive: false })).toBe(false);
      expect(await globalSaveWorkflow({ interactive: false })).toBe(false);
      expect(mockCheckImpact).toHaveBeenCalledTimes(1);
      expect(mockShowInfo).toHaveBeenCalledTimes(1);
      expect(mockShowInfo.mock.calls[0][0]).toBe('Autosave is waiting');
      expect(mockConfirmImpact).not.toHaveBeenCalled();
      expect(mockClientUpdate).not.toHaveBeenCalled();

      // A new edit asks again, and notes it again.
      versionState.editVersion = 21;
      await globalSaveWorkflow({ interactive: false });
      expect(mockCheckImpact).toHaveBeenCalledTimes(2);
      expect(mockShowInfo).toHaveBeenCalledTimes(2);
    });

    it('a manual save that lands on a refused autosave asks the question itself', async () => {
      versionState.editVersion = 40;
      let answer!: (r: unknown) => void;
      mockCheckImpact.mockReturnValueOnce(new Promise((r) => (answer = r)));
      const autosave = globalSaveWorkflow({ interactive: false });
      mockConfirmImpact.mockResolvedValue({ action: 'save' });
      const manual = globalSaveWorkflow({});
      answer({ status: 'ok', report });
      expect(await autosave).toBe(false);
      expect(await manual).toBe(true);
      expect(mockConfirmImpact).toHaveBeenCalledTimes(1);
      expect(mockClientUpdate).toHaveBeenCalledTimes(1);
    });

    it('a manual save at the same version still asks and dismisses the toast on success', async () => {
      versionState.editVersion = 30;
      await globalSaveWorkflow({ interactive: false });
      mockConfirmImpact.mockResolvedValue({ action: 'save' });
      expect(await globalSaveWorkflow({})).toBe(true);
      expect(mockConfirmImpact).toHaveBeenCalledTimes(1);
      const { dismissToast } = await import('$lib/services/toastService.js');
      expect(dismissToast).toHaveBeenCalledWith(
        expect.stringContaining('flowdrop:autosave-waiting')
      );
    });
  });
});

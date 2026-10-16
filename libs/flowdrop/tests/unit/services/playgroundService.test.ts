/**
 * Tests for PlaygroundService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaygroundService } from '$lib/services/playgroundService.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';

// Mock dependencies
const mockBuildEndpointUrl = vi.fn();
const mockGetEndpointHeaders = vi.fn();

// Endpoint config is threaded explicitly into each service method (was a module
// singleton). Tests set this and pass it as the first argument.
let endpointConfig: EndpointConfig | null = null;

vi.mock('$lib/config/endpoints.js', async () => ({
  // The group resolver is pure; the real one is what the service must obey.
  resolveSessionEndpoint: (
    await vi.importActual<typeof import('$lib/config/endpoints.js')>('$lib/config/endpoints.js')
  ).resolveSessionEndpoint,
  resolveSessionRunsEndpoint: (
    await vi.importActual<typeof import('$lib/config/endpoints.js')>('$lib/config/endpoints.js')
  ).resolveSessionRunsEndpoint,
  buildEndpointUrl: (...args: unknown[]) => mockBuildEndpointUrl(...args),
  getEndpointHeaders: (...args: unknown[]) => mockGetEndpointHeaders(...args),
  // Mirrors the real helper: static endpoint headers merged with the auth
  // provider's headers (when one is supplied).
  getRequestHeaders: async (
    config: unknown,
    endpointKey: unknown,
    authProvider?: { getAuthHeaders: () => Promise<Record<string, string>> }
  ) => {
    const headers = { ...(mockGetEndpointHeaders(config, endpointKey) ?? {}) };
    if (authProvider) {
      Object.assign(headers, await authProvider.getAuthHeaders());
    }
    return headers;
  }
}));

vi.mock('$lib/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

function createMockPlaygroundConfig() {
  return {
    baseUrl: '/api',
    endpoints: {
      playground: {
        listSessions: '/workflows/{id}/sessions',
        createSession: '/workflows/{id}/sessions',
        getSession: '/sessions/{sessionId}',
        deleteSession: '/sessions/{sessionId}',
        getMessages: '/sessions/{sessionId}/messages',
        sendMessage: '/sessions/{sessionId}/messages',
        stopExecution: '/sessions/{sessionId}/stop'
      }
    }
  };
}

describe('PlaygroundService', () => {
  let service: PlaygroundService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    // @ts-expect-error Accessing private static for test reset
    PlaygroundService.instance = undefined;
    service = PlaygroundService.getInstance();

    global.fetch = vi.fn();
    endpointConfig = createMockPlaygroundConfig() as unknown as EndpointConfig;
    mockBuildEndpointUrl.mockImplementation(
      (_config: unknown, path: string, params?: Record<string, string>) => {
        let url = `/api${path}`;
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, value);
          }
        }
        return url;
      }
    );
    mockGetEndpointHeaders.mockReturnValue({
      'Content-Type': 'application/json'
    });
  });

  afterEach(() => {
    service.stopPolling();
    global.fetch = originalFetch;
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = PlaygroundService.getInstance();
      const instance2 = PlaygroundService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('listSessions', () => {
    it('should fetch sessions for workflow', async () => {
      const mockSessions = [{ id: 'session-1', name: 'Test Session' }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSessions })
      });

      const result = await service.listSessions(endpointConfig, 'workflow-1');
      expect(result).toEqual(mockSessions);
    });

    it('should return empty array when no data', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null })
      });

      const result = await service.listSessions(endpointConfig, 'workflow-1');
      expect(result).toEqual([]);
    });

    it('should throw when no endpoint config', async () => {
      await expect(service.listSessions(null, 'workflow-1')).rejects.toThrow(
        'Endpoint configuration not set'
      );
    });
  });

  describe('createSession', () => {
    it('should POST new session', async () => {
      const mockSession = { id: 'session-1', name: 'New Session' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSession })
      });

      const result = await service.createSession(endpointConfig, 'workflow-1', 'New Session');
      expect(result).toEqual(mockSession);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[1].method).toBe('POST');
      expect(JSON.parse(fetchCall[1].body)).toEqual({
        name: 'New Session',
        metadata: undefined
      });
    });

    it('should throw when no data returned', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null })
      });

      await expect(service.createSession(endpointConfig, 'workflow-1')).rejects.toThrow(
        'Failed to create session'
      );
    });
  });

  describe('getSession', () => {
    it('should fetch session by ID', async () => {
      const mockSession = { id: 'session-1', name: 'Test' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSession })
      });

      const result = await service.getSession(endpointConfig, 'session-1');
      expect(result).toEqual(mockSession);
    });

    it('should throw when session not found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null })
      });

      await expect(service.getSession(endpointConfig, 'nonexistent')).rejects.toThrow(
        'Session not found'
      );
    });
  });

  describe('deleteSession', () => {
    it('should send DELETE request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await service.deleteSession(endpointConfig, 'session-1');

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[1].method).toBe('DELETE');
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for session', async () => {
      const mockResponse = {
        data: [{ id: 'msg-1', content: 'Hello' }],
        sessionStatus: 'running'
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getMessages(endpointConfig, 'session-1');
      expect(result.data).toEqual(mockResponse.data);
    });

    function fetchedUrl(): string {
      return (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    }

    it('should send no pagination params for a bare fetch', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      });
      await service.getMessages(endpointConfig, 'session-1');
      expect(fetchedUrl()).toBe('/api/sessions/session-1/messages');
    });

    it('should send the forward cursor via since', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      });
      await service.getMessages(endpointConfig, 'session-1', { since: 42, limit: 50 });
      expect(fetchedUrl()).toContain('since=42');
      expect(fetchedUrl()).toContain('limit=50');
      expect(fetchedUrl()).not.toContain('before=');
      expect(fetchedUrl()).not.toContain('latest=');
    });

    it('should request the tail via latest', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      });
      await service.getMessages(endpointConfig, 'session-1', { latest: true, limit: 50 });
      expect(fetchedUrl()).toContain('latest=true');
      expect(fetchedUrl()).toContain('limit=50');
      expect(fetchedUrl()).not.toContain('since=');
    });

    it('should send the backward cursor via before', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      });
      await service.getMessages(endpointConfig, 'session-1', { before: 100, limit: 50 });
      expect(fetchedUrl()).toContain('before=100');
      expect(fetchedUrl()).toContain('limit=50');
      expect(fetchedUrl()).not.toContain('since=');
    });

    it('should omit latest=false rather than sending it', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      });
      await service.getMessages(endpointConfig, 'session-1', { latest: false });
      expect(fetchedUrl()).toBe('/api/sessions/session-1/messages');
    });

    it('should throw on HTTP error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not found' })
      });

      await expect(service.getMessages(endpointConfig, 'session-1')).rejects.toThrow('Not found');
    });
  });

  describe('sendMessage', () => {
    it('should POST message content', async () => {
      const mockMessage = { id: 'msg-1', content: 'Hello', role: 'user' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockMessage })
      });

      const result = await service.sendMessage(endpointConfig, 'session-1', 'Hello');
      expect(result).toEqual(mockMessage);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[1].method).toBe('POST');
      expect(JSON.parse(fetchCall[1].body)).toEqual({ content: 'Hello' });
    });

    it('should include inputs when provided', async () => {
      const mockMessage = { id: 'msg-1', content: 'Hello' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockMessage })
      });

      await service.sendMessage(endpointConfig, 'session-1', 'Hello', { key: 'value' });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(JSON.parse(fetchCall[1].body)).toEqual({
        content: 'Hello',
        inputs: { key: 'value' }
      });
    });

    it('should throw when no data returned', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: null })
      });

      await expect(service.sendMessage(endpointConfig, 'session-1', 'Hello')).rejects.toThrow(
        'Failed to send message'
      );
    });

    it('should attach auth headers from the provider', async () => {
      const mockMessage = { id: 'msg-1', content: 'Hello' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockMessage })
      });

      const authProvider = {
        getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer token-123' })
      };

      await service.sendMessage(endpointConfig, 'session-1', 'Hello', undefined, authProvider);

      expect(authProvider.getAuthHeaders).toHaveBeenCalledOnce();
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[1].headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123'
      });
    });
  });

  describe('sendTurn', () => {
    it('sends inputs without content, and omits keys left undefined', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 'msg-1', role: 'user', content: '' } })
      });

      const response = await service.sendTurn(endpointConfig, 'session-1', {
        inputs: { topic: 'cats' }
      });

      expect(response).toEqual({
        kind: 'message',
        message: { id: 'msg-1', role: 'user', content: '' }
      });
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/sessions/session-1/messages');
      expect(JSON.parse(fetchCall[1].body)).toEqual({ inputs: { topic: 'cats' } });
    });

    it('surfaces the server message of a 400 refusal', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          success: false,
          error: 'This workflow takes no message; declare a message port or send inputs'
        })
      });

      await expect(
        service.sendTurn(endpointConfig, 'session-1', { content: 'hi' })
      ).rejects.toThrow('This workflow takes no message');
    });
  });

  describe('sessions endpoint group', () => {
    beforeEach(() => {
      const config = createMockPlaygroundConfig() as unknown as EndpointConfig;
      config.endpoints.sessions = {
        get: '/s/{sessionId}',
        delete: '/s/{sessionId}',
        messages: '/s/{sessionId}/messages',
        turn: '/s/{sessionId}/turn',
        stop: '/s/{sessionId}/stop',
        reset: '/s/{sessionId}/reset'
      };
      endpointConfig = config;
    });

    function urlOf(call = 0): string {
      return (global.fetch as ReturnType<typeof vi.fn>).mock.calls[call][0];
    }

    it('routes every per-session call through the group', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { id: 'session-1' } })
      });

      await service.getSession(endpointConfig, 'session-1');
      await service.deleteSession(endpointConfig, 'session-1');
      await service.getMessages(endpointConfig, 'session-1', { latest: true });
      await service.stopExecution(endpointConfig, 'session-1');
      await service.resetSession(endpointConfig, 'session-1');

      expect(urlOf(0)).toBe('/api/s/session-1');
      expect(urlOf(1)).toBe('/api/s/session-1');
      expect(urlOf(2)).toBe('/api/s/session-1/messages?latest=true');
      expect(urlOf(3)).toBe('/api/s/session-1/stop');
      expect(urlOf(4)).toBe('/api/s/session-1/reset');
    });

    describe('getSessionRuns', () => {
      const runs = { workflowVersion: 'v2', runs: [{ id: 'p1', workflowVersion: 'v1' }] };

      it('reads the runs from the sessions group, with the limit', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: runs })
        });

        const result = await service.getSessionRuns(endpointConfig, 'session-1', { limit: 20 });

        expect(urlOf()).toBe('/api/sessions/session-1/runs?limit=20');
        expect(result).toEqual(runs);
      });

      it('uses the configured path when the group names one', async () => {
        (endpointConfig as EndpointConfig).endpoints.sessions!.runs = '/s/{sessionId}/runs';
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: runs })
        });

        await service.getSessionRuns(endpointConfig, 'session-1');

        expect(urlOf()).toBe('/api/s/session-1/runs');
      });

      it.each([404, 405, 501])('resolves null on an older server (%i)', async (status) => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          status,
          statusText: 'Not Found',
          json: async () => ({})
        });

        expect(await service.getSessionRuns(endpointConfig, 'session-1')).toBeNull();
      });

      it('resolves null without calling when there is no sessions group', async () => {
        endpointConfig = createMockPlaygroundConfig() as unknown as EndpointConfig;

        expect(await service.getSessionRuns(endpointConfig, 'session-1')).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('throws on any other failure, and resolves null for a payload without runs', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Server Error',
          json: async () => ({})
        });
        await expect(service.getSessionRuns(endpointConfig, 'session-1')).rejects.toThrow('500');

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: {} })
        });
        expect(await service.getSessionRuns(endpointConfig, 'session-1')).toBeNull();
      });
    });

    it('keeps listing and creating sessions on the playground group', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

      await service.listSessions(endpointConfig, 'wf-1');

      expect(urlOf()).toBe('/api/workflows/wf-1/sessions');
    });

    it('returns the turn result tagged as such', async () => {
      const result = {
        sessionId: '7',
        userMessageId: '42',
        pipelineId: null,
        status: 'queued'
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: result })
      });

      const response = await service.sendTurn(endpointConfig, 'session-1', { content: 'hi' });

      expect(urlOf()).toBe('/api/s/session-1/turn');
      expect(response).toEqual({ kind: 'turn', result });
      await expect(service.sendMessage(endpointConfig, 'session-1', 'hi')).rejects.toThrow(
        'use sendTurn()'
      );
    });

    it('decides the answer kind by the endpoint group, not the payload shape', async () => {
      const userRow = {
        id: 'm-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'hi',
        timestamp: '2026-10-06T10:00:00Z'
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: userRow })
      });

      // Sessions door: always a turn result, whatever it looks like.
      const turn = await service.sendTurn(endpointConfig, 'session-1', { content: 'hi' });
      expect(turn.kind).toBe('turn');

      // Legacy door: always the user's row.
      const legacy = createMockPlaygroundConfig() as unknown as EndpointConfig;
      const message = await service.sendTurn(legacy, 'session-1', { content: 'hi' });
      expect(message).toEqual({ kind: 'message', message: userRow });
    });

    it('treats a group without reset as a backend that cannot reset', async () => {
      delete endpointConfig!.endpoints.sessions!.reset;

      await expect(service.resetSession(endpointConfig, 'session-1')).rejects.toThrow(
        'not supported'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('stopExecution', () => {
    it('should POST stop request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await expect(service.stopExecution(endpointConfig, 'session-1')).resolves.toBe('stopped');

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[1].method).toBe('POST');
    });

    it('reports a 409 as nothing to stop instead of throwing', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ error: 'Nothing to stop' })
      });

      await expect(service.stopExecution(endpointConfig, 'session-1')).resolves.toBe(
        'nothing-to-stop'
      );
    });

    it('still throws other failures, with the status', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Boom',
        json: async () => ({})
      });

      await expect(service.stopExecution(endpointConfig, 'session-1')).rejects.toMatchObject({
        status: 500
      });
    });
  });

  describe('polling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      service.stopPolling();
      vi.useRealTimers();
    });

    it('should track polling state', () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], sessionStatus: 'running' })
      });

      service.startPolling(endpointConfig, 'session-1', vi.fn());
      expect(service.isPolling()).toBe(true);
      expect(service.getPollingSessionId()).toBe('session-1');
    });

    it('should stop polling', () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], sessionStatus: 'running' })
      });

      service.startPolling(endpointConfig, 'session-1', vi.fn());
      service.stopPolling();

      expect(service.isPolling()).toBe(false);
      expect(service.getPollingSessionId()).toBeNull();
    });

    it('should stop previous polling when starting new', () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], sessionStatus: 'running' })
      });

      service.startPolling(endpointConfig, 'session-1', vi.fn());
      service.startPolling(endpointConfig, 'session-2', vi.fn());

      expect(service.getPollingSessionId()).toBe('session-2');
    });
  });
});

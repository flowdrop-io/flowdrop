/**
 * Tests for PlaygroundService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PlaygroundService } from "$lib/services/playgroundService.js";

// Mock dependencies
const mockGetEndpointConfig = vi.fn();
const mockBuildEndpointUrl = vi.fn();
const mockGetEndpointHeaders = vi.fn();

vi.mock("$lib/services/api.js", () => ({
  getEndpointConfig: () => mockGetEndpointConfig(),
}));

vi.mock("$lib/config/endpoints.js", () => ({
  buildEndpointUrl: (...args: unknown[]) => mockBuildEndpointUrl(...args),
  getEndpointHeaders: (...args: unknown[]) => mockGetEndpointHeaders(...args),
}));

vi.mock("$lib/utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function createMockPlaygroundConfig() {
  return {
    baseUrl: "/api",
    endpoints: {
      playground: {
        listSessions: "/workflows/{id}/sessions",
        createSession: "/workflows/{id}/sessions",
        getSession: "/sessions/{sessionId}",
        deleteSession: "/sessions/{sessionId}",
        getMessages: "/sessions/{sessionId}/messages",
        sendMessage: "/sessions/{sessionId}/messages",
        stopExecution: "/sessions/{sessionId}/stop",
      },
    },
  };
}

describe("PlaygroundService", () => {
  let service: PlaygroundService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    // @ts-expect-error Accessing private static for test reset
    PlaygroundService.instance = undefined;
    service = PlaygroundService.getInstance();

    global.fetch = vi.fn();
    mockGetEndpointConfig.mockReturnValue(createMockPlaygroundConfig());
    mockBuildEndpointUrl.mockImplementation(
      (_config: unknown, path: string, params?: Record<string, string>) => {
        let url = `/api${path}`;
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, value);
          }
        }
        return url;
      },
    );
    mockGetEndpointHeaders.mockReturnValue({
      "Content-Type": "application/json",
    });
  });

  afterEach(() => {
    service.stopPolling();
    global.fetch = originalFetch;
  });

  describe("singleton", () => {
    it("should return the same instance", () => {
      const instance1 = PlaygroundService.getInstance();
      const instance2 = PlaygroundService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("listSessions", () => {
    it("should fetch sessions for workflow", async () => {
      const mockSessions = [{ id: "session-1", name: "Test Session" }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSessions }),
      });

      const result = await service.listSessions("workflow-1");
      expect(result).toEqual(mockSessions);
    });

    it("should return empty array when no data", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null }),
      });

      const result = await service.listSessions("workflow-1");
      expect(result).toEqual([]);
    });

    it("should throw when no endpoint config", async () => {
      mockGetEndpointConfig.mockReturnValue(null);
      await expect(service.listSessions("workflow-1")).rejects.toThrow(
        "Endpoint configuration not set",
      );
    });
  });

  describe("createSession", () => {
    it("should POST new session", async () => {
      const mockSession = { id: "session-1", name: "New Session" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSession }),
      });

      const result = await service.createSession("workflow-1", "New Session");
      expect(result).toEqual(mockSession);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(fetchCall[1].method).toBe("POST");
      expect(JSON.parse(fetchCall[1].body)).toEqual({
        name: "New Session",
        metadata: undefined,
      });
    });

    it("should throw when no data returned", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null }),
      });

      await expect(service.createSession("workflow-1")).rejects.toThrow(
        "Failed to create session",
      );
    });
  });

  describe("getSession", () => {
    it("should fetch session by ID", async () => {
      const mockSession = { id: "session-1", name: "Test" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSession }),
      });

      const result = await service.getSession("session-1");
      expect(result).toEqual(mockSession);
    });

    it("should throw when session not found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null }),
      });

      await expect(service.getSession("nonexistent")).rejects.toThrow(
        "Session not found",
      );
    });
  });

  describe("deleteSession", () => {
    it("should send DELETE request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.deleteSession("session-1");

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(fetchCall[1].method).toBe("DELETE");
    });
  });

  describe("getMessages", () => {
    it("should fetch messages for session", async () => {
      const mockResponse = {
        data: [{ id: "msg-1", content: "Hello" }],
        sessionStatus: "running",
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getMessages("session-1");
      expect(result.data).toEqual(mockResponse.data);
    });

    it("should throw on HTTP error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Not found" }),
      });

      await expect(service.getMessages("session-1")).rejects.toThrow(
        "Not found",
      );
    });
  });

  describe("sendMessage", () => {
    it("should POST message content", async () => {
      const mockMessage = { id: "msg-1", content: "Hello", role: "user" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockMessage }),
      });

      const result = await service.sendMessage("session-1", "Hello");
      expect(result).toEqual(mockMessage);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(fetchCall[1].method).toBe("POST");
      expect(JSON.parse(fetchCall[1].body)).toEqual({ content: "Hello" });
    });

    it("should include inputs when provided", async () => {
      const mockMessage = { id: "msg-1", content: "Hello" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockMessage }),
      });

      await service.sendMessage("session-1", "Hello", { key: "value" });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(JSON.parse(fetchCall[1].body)).toEqual({
        content: "Hello",
        inputs: { key: "value" },
      });
    });

    it("should throw when no data returned", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: null }),
      });

      await expect(service.sendMessage("session-1", "Hello")).rejects.toThrow(
        "Failed to send message",
      );
    });
  });

  describe("stopExecution", () => {
    it("should POST stop request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.stopExecution("session-1");

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(fetchCall[1].method).toBe("POST");
    });
  });

  describe("polling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      service.stopPolling();
      vi.useRealTimers();
    });

    it("should track polling state", () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], sessionStatus: "running" }),
      });

      service.startPolling("session-1", vi.fn());
      expect(service.isPolling()).toBe(true);
      expect(service.getPollingSessionId()).toBe("session-1");
    });

    it("should stop polling", () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], sessionStatus: "running" }),
      });

      service.startPolling("session-1", vi.fn());
      service.stopPolling();

      expect(service.isPolling()).toBe(false);
      expect(service.getPollingSessionId()).toBeNull();
    });

    it("should stop previous polling when starting new", () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], sessionStatus: "running" }),
      });

      service.startPolling("session-1", vi.fn());
      service.startPolling("session-2", vi.fn());

      expect(service.getPollingSessionId()).toBe("session-2");
    });
  });
});

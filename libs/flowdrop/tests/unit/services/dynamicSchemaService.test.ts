/**
 * Unit Tests - Dynamic Schema Service
 *
 * Tests for the service that fetches configuration schemas from REST endpoints
 * at runtime and resolves template variables in URLs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fetchDynamicSchema,
  resolveExternalEditUrl,
  getEffectiveConfigEditOptions,
  clearSchemaCache,
  invalidateSchemaCache,
  hasConfigEditOptions,
  shouldShowExternalEdit,
  shouldUseDynamicSchema,
} from "$lib/services/dynamicSchemaService.js";
import type {
  WorkflowNode,
  DynamicSchemaEndpoint,
  ExternalEditLink,
} from "$lib/types/index.js";

// --- Mocks ---

const mockGetEndpointConfig = vi.fn();

vi.mock("$lib/services/api.js", () => ({
  getEndpointConfig: () => mockGetEndpointConfig(),
}));

vi.mock("$lib/config/constants.js", () => ({
  DEFAULT_CACHE_TTL_MS: 300_000,
}));

// --- Helpers ---

function makeNode(overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return {
    id: "node-1",
    type: "llm",
    position: { x: 0, y: 0 },
    data: {
      label: "LLM Node",
      config: { apiKey: "secret" },
      metadata: {
        id: "llm-node",
        name: "LLM Node",
        description: "An LLM node",
        category: "ai",
        version: "1.0.0",
        type: "llm",
        inputs: [],
        outputs: [],
        configSchema: { type: "object", properties: {} },
      },
    },
    ...overrides,
  } as WorkflowNode;
}

function makeEndpoint(
  overrides: Partial<DynamicSchemaEndpoint> = {},
): DynamicSchemaEndpoint {
  return {
    url: "/api/nodes/{nodeTypeId}/schema",
    method: "GET",
    parameterMapping: { nodeTypeId: "metadata.id" },
    ...overrides,
  };
}

const validSchema = {
  type: "object",
  properties: { name: { type: "string", title: "Name" } },
};

function fetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

function fetchFail(status: number, text = "Error") {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: text,
    json: async () => ({}),
    text: async () => text,
  });
}

// --- Tests ---

describe("dynamicSchemaService", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearSchemaCache();
    vi.clearAllMocks();
    mockGetEndpointConfig.mockReturnValue(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("fetchDynamicSchema", () => {
    describe("cache behaviour", () => {
      it("caches a successful fetch and returns fromCache on subsequent calls", async () => {
        global.fetch = fetchOk(validSchema);
        const node = makeNode();
        const endpoint = makeEndpoint();

        const first = await fetchDynamicSchema(endpoint, node);
        expect(first.success).toBe(true);
        expect(first.fromCache).toBe(false);

        const second = await fetchDynamicSchema(endpoint, node);
        expect(second.success).toBe(true);
        expect(second.fromCache).toBe(true);

        // fetch was only called once — second request used cache
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("skips cache and always fetches when cacheSchema is false", async () => {
        global.fetch = fetchOk(validSchema);
        const node = makeNode();
        const endpoint = makeEndpoint({ cacheSchema: false });

        await fetchDynamicSchema(endpoint, node);
        await fetchDynamicSchema(endpoint, node);

        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      it("bypasses expired cache entries and re-fetches", async () => {
        global.fetch = fetchOk(validSchema);
        const node = makeNode();
        const endpoint = makeEndpoint();

        await fetchDynamicSchema(endpoint, node);

        // Advance time past TTL (300 000 ms)
        vi.setSystemTime(Date.now() + 400_000);

        const result = await fetchDynamicSchema(endpoint, node);
        expect(result.fromCache).toBe(false);
        expect(global.fetch).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
      });
    });

    describe("response shape parsing", () => {
      it("accepts a direct ConfigSchema response", async () => {
        global.fetch = fetchOk(validSchema);
        const result = await fetchDynamicSchema(makeEndpoint(), makeNode());
        expect(result.success).toBe(true);
        expect(result.schema).toEqual(validSchema);
      });

      it("accepts a response wrapped in { data: ... }", async () => {
        global.fetch = fetchOk({ data: validSchema });
        const result = await fetchDynamicSchema(makeEndpoint(), makeNode());
        expect(result.success).toBe(true);
        expect(result.schema).toEqual(validSchema);
      });

      it("accepts a response wrapped in { schema: ... }", async () => {
        global.fetch = fetchOk({ schema: validSchema });
        const result = await fetchDynamicSchema(makeEndpoint(), makeNode());
        expect(result.success).toBe(true);
        expect(result.schema).toEqual(validSchema);
      });

      it("accepts a response wrapped in { success: true, data: ... }", async () => {
        global.fetch = fetchOk({ success: true, data: validSchema });
        const result = await fetchDynamicSchema(makeEndpoint(), makeNode());
        expect(result.success).toBe(true);
        expect(result.schema).toEqual(validSchema);
      });

      it("returns failure for an unrecognised schema shape", async () => {
        global.fetch = fetchOk({ unknownKey: "value" });
        const result = await fetchDynamicSchema(makeEndpoint(), makeNode());
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Invalid schema format/);
      });
    });

    describe("error handling", () => {
      it("returns failure on HTTP error responses", async () => {
        global.fetch = fetchFail(404, "Not Found");
        const result = await fetchDynamicSchema(makeEndpoint(), makeNode());
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/404/);
      });

      it("returns failure on timeout (AbortError)", async () => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";
        global.fetch = vi.fn().mockRejectedValue(abortError);

        const result = await fetchDynamicSchema(
          makeEndpoint({ timeout: 100 }),
          makeNode(),
        );
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/timed out/);
      });

      it("returns failure on generic network errors", async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));
        const result = await fetchDynamicSchema(makeEndpoint(), makeNode());
        expect(result.success).toBe(false);
        expect(result.error).toBe("Network failure");
      });

      it("returns a generic message for non-Error throws", async () => {
        global.fetch = vi.fn().mockRejectedValue("string error");
        const result = await fetchDynamicSchema(makeEndpoint(), makeNode());
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Unknown error/);
      });
    });

    describe("URL resolution", () => {
      it("replaces template variables using parameterMapping", async () => {
        global.fetch = fetchOk(validSchema);
        const node = makeNode();
        const endpoint = makeEndpoint({
          url: "/api/nodes/{nodeTypeId}/schema?instance={instanceId}",
          parameterMapping: { nodeTypeId: "metadata.id", instanceId: "id" },
        });

        await fetchDynamicSchema(endpoint, node);

        const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
          .calls[0][0] as string;
        expect(calledUrl).toContain("llm-node");
        expect(calledUrl).toContain("node-1");
      });

      it("prepends baseUrl for relative URLs when endpoint config is available", async () => {
        global.fetch = fetchOk(validSchema);
        mockGetEndpointConfig.mockReturnValue({
          baseUrl: "https://api.example.com",
        });

        const endpoint = makeEndpoint({
          url: "/api/schema",
          parameterMapping: undefined,
        });
        await fetchDynamicSchema(endpoint, makeNode());

        const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
          .calls[0][0] as string;
        expect(calledUrl).toBe("https://api.example.com/api/schema");
      });

      it("resolves unmapped template variables directly from context", async () => {
        global.fetch = fetchOk(validSchema);
        const node = makeNode();
        // `id` is a top-level context field, not in parameterMapping
        const endpoint = makeEndpoint({
          url: "/api/schema/{id}",
          parameterMapping: {},
        });

        await fetchDynamicSchema(endpoint, node);

        const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
          .calls[0][0] as string;
        expect(calledUrl).toContain("node-1");
      });
    });

    describe("authentication headers", () => {
      it("adds Bearer token when auth type is bearer", async () => {
        global.fetch = fetchOk(validSchema);
        mockGetEndpointConfig.mockReturnValue({
          baseUrl: "",
          auth: { type: "bearer", token: "my-token" },
        });

        await fetchDynamicSchema(
          makeEndpoint({ url: "https://api/schema" }),
          makeNode(),
        );

        const headers = (global.fetch as ReturnType<typeof vi.fn>).mock
          .calls[0][1].headers as Record<string, string>;
        expect(headers["Authorization"]).toBe("Bearer my-token");
      });

      it("adds X-API-Key header when auth type is api_key", async () => {
        global.fetch = fetchOk(validSchema);
        mockGetEndpointConfig.mockReturnValue({
          baseUrl: "",
          auth: { type: "api_key", apiKey: "key-123" },
        });

        await fetchDynamicSchema(
          makeEndpoint({ url: "https://api/schema" }),
          makeNode(),
        );

        const headers = (global.fetch as ReturnType<typeof vi.fn>).mock
          .calls[0][1].headers as Record<string, string>;
        expect(headers["X-API-Key"]).toBe("key-123");
      });

      it("merges custom auth headers when auth type is custom", async () => {
        global.fetch = fetchOk(validSchema);
        mockGetEndpointConfig.mockReturnValue({
          baseUrl: "",
          auth: { type: "custom", headers: { "X-Custom": "value" } },
        });

        await fetchDynamicSchema(
          makeEndpoint({ url: "https://api/schema" }),
          makeNode(),
        );

        const headers = (global.fetch as ReturnType<typeof vi.fn>).mock
          .calls[0][1].headers as Record<string, string>;
        expect(headers["X-Custom"]).toBe("value");
      });
    });

    describe("POST body", () => {
      it("serialises body to JSON for non-GET requests", async () => {
        global.fetch = fetchOk(validSchema);
        const endpoint = makeEndpoint({
          url: "https://api/schema",
          method: "POST",
          parameterMapping: { nodeTypeId: "metadata.id" },
          body: { nodeType: "{nodeTypeId}", static: 42 },
        });

        await fetchDynamicSchema(endpoint, makeNode());

        const fetchOpts = (global.fetch as ReturnType<typeof vi.fn>).mock
          .calls[0][1];
        expect(fetchOpts.method).toBe("POST");
        const body = JSON.parse(fetchOpts.body as string);
        expect(body.nodeType).toBe("llm-node"); // template resolved
        expect(body.static).toBe(42); // non-string values pass through
      });
    });
  });

  describe("resolveExternalEditUrl", () => {
    const link: ExternalEditLink = {
      url: "https://admin.example.com/nodes/{nodeTypeId}/edit/{instanceId}",
      parameterMapping: { nodeTypeId: "metadata.id", instanceId: "id" },
    };

    it("resolves template variables in the URL", () => {
      const url = resolveExternalEditUrl(link, makeNode());
      expect(url).toBe("https://admin.example.com/nodes/llm-node/edit/node-1");
    });

    it("appends callback URL when callbackUrlParam is configured", () => {
      const linkWithCallback: ExternalEditLink = {
        ...link,
        callbackUrlParam: "return",
      };
      const url = resolveExternalEditUrl(
        linkWithCallback,
        makeNode(),
        undefined,
        "https://app.example.com/back",
      );
      expect(url).toContain("return=");
      expect(url).toContain(encodeURIComponent("https://app.example.com/back"));
    });

    it("uses & separator when URL already has query params", () => {
      const linkWithQuery: ExternalEditLink = {
        url: "https://admin.example.com/edit?nodeType={nodeTypeId}",
        parameterMapping: { nodeTypeId: "metadata.id" },
        callbackUrlParam: "return",
      };
      const url = resolveExternalEditUrl(
        linkWithQuery,
        makeNode(),
        undefined,
        "https://app.example.com",
      );
      expect(url).toContain("&return=");
    });

    it("does not append callback URL when callbackUrlParam is absent", () => {
      const url = resolveExternalEditUrl(
        link,
        makeNode(),
        undefined,
        "https://app.example.com",
      );
      expect(url).not.toContain("return=");
    });
  });

  describe("getEffectiveConfigEditOptions", () => {
    it("returns undefined when neither type nor instance config exists", () => {
      const node = makeNode();
      expect(getEffectiveConfigEditOptions(node)).toBeUndefined();
    });

    it("returns type config when only metadata.configEdit is set", () => {
      const typeConfig = {
        dynamicSchema: { url: "/schema", method: "GET" as const },
      };
      const node = makeNode({
        data: {
          ...makeNode().data,
          metadata: { ...makeNode().data.metadata, configEdit: typeConfig },
        },
      });
      expect(getEffectiveConfigEditOptions(node)).toEqual(typeConfig);
    });

    it("returns instance config when only extensions.configEdit is set", () => {
      const instanceConfig = {
        externalEditLink: { url: "https://admin.example.com" },
      };
      const node = makeNode({
        data: {
          ...makeNode().data,
          extensions: { configEdit: instanceConfig },
        },
      });
      expect(getEffectiveConfigEditOptions(node)).toEqual(instanceConfig);
    });

    it("merges type and instance configs with instance taking precedence", () => {
      const typeConfig = {
        dynamicSchema: { url: "/type-schema", method: "GET" as const },
        externalEditLink: { url: "https://type.example.com" },
      };
      const instanceConfig = {
        dynamicSchema: { url: "/instance-schema", method: "POST" as const },
      };
      const node = makeNode({
        data: {
          ...makeNode().data,
          metadata: { ...makeNode().data.metadata, configEdit: typeConfig },
          extensions: { configEdit: instanceConfig },
        },
      });
      const result = getEffectiveConfigEditOptions(node);
      // Instance dynamicSchema overrides type dynamicSchema
      expect(result?.dynamicSchema?.url).toBe("/instance-schema");
      // externalEditLink comes from type (instance didn't set it)
      expect(result?.externalEditLink?.url).toBe("https://type.example.com");
    });
  });

  describe("clearSchemaCache", () => {
    it("clears all cached schemas when called without a pattern", async () => {
      global.fetch = fetchOk(validSchema);
      const node = makeNode();
      const endpoint = makeEndpoint();

      await fetchDynamicSchema(endpoint, node);
      clearSchemaCache();

      // Next call should fetch again
      await fetchDynamicSchema(endpoint, node);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("clears only matching entries when called with a pattern", async () => {
      global.fetch = fetchOk(validSchema);

      const node1 = makeNode({ id: "node-1" });
      const node2 = makeNode({ id: "node-2", type: "other" });
      const endpoint1 = makeEndpoint({
        url: "https://api/llm-node/schema",
        parameterMapping: {},
      });
      const endpoint2 = makeEndpoint({
        url: "https://api/other-node/schema",
        parameterMapping: {},
      });

      await fetchDynamicSchema(endpoint1, node1);
      await fetchDynamicSchema(endpoint2, node2);

      // Clear only entries matching 'llm-node'
      clearSchemaCache("llm-node");

      // node1 cache cleared — will fetch again
      await fetchDynamicSchema(endpoint1, node1);
      // node2 cache preserved — will NOT fetch again
      await fetchDynamicSchema(endpoint2, node2);

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("invalidateSchemaCache", () => {
    it("removes a specific node/endpoint cache entry", async () => {
      global.fetch = fetchOk(validSchema);
      const node = makeNode();
      const endpoint = makeEndpoint();

      await fetchDynamicSchema(endpoint, node);
      invalidateSchemaCache(node, endpoint);

      // Cache was invalidated — should fetch again
      await fetchDynamicSchema(endpoint, node);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("hasConfigEditOptions", () => {
    it("returns false when no config edit options are set", () => {
      expect(hasConfigEditOptions(makeNode())).toBe(false);
    });

    it("returns true when metadata.configEdit is set", () => {
      const node = makeNode({
        data: {
          ...makeNode().data,
          metadata: {
            ...makeNode().data.metadata,
            configEdit: { dynamicSchema: { url: "/schema", method: "GET" } },
          },
        },
      });
      expect(hasConfigEditOptions(node)).toBe(true);
    });
  });

  describe("shouldShowExternalEdit", () => {
    it("returns false when no config edit options exist", () => {
      expect(shouldShowExternalEdit(makeNode())).toBe(false);
    });

    it("returns true when externalEditLink is configured without a dynamic schema", () => {
      const node = makeNode({
        data: {
          ...makeNode().data,
          metadata: {
            ...makeNode().data.metadata,
            configEdit: {
              externalEditLink: { url: "https://admin.example.com" },
            },
          },
        },
      });
      expect(shouldShowExternalEdit(node)).toBe(true);
    });

    it("returns false when preferDynamicSchema is true even with externalEditLink", () => {
      const node = makeNode({
        data: {
          ...makeNode().data,
          metadata: {
            ...makeNode().data.metadata,
            configEdit: {
              externalEditLink: { url: "https://admin.example.com" },
              dynamicSchema: { url: "/schema", method: "GET" },
              preferDynamicSchema: true,
            },
          },
        },
      });
      expect(shouldShowExternalEdit(node)).toBe(false);
    });
  });

  describe("shouldUseDynamicSchema", () => {
    it("returns false when no config edit options exist", () => {
      expect(shouldUseDynamicSchema(makeNode())).toBe(false);
    });

    it("returns true when dynamicSchema is configured", () => {
      const node = makeNode({
        data: {
          ...makeNode().data,
          metadata: {
            ...makeNode().data.metadata,
            configEdit: { dynamicSchema: { url: "/schema", method: "GET" } },
          },
        },
      });
      expect(shouldUseDynamicSchema(node)).toBe(true);
    });

    it("returns false when only externalEditLink is configured", () => {
      const node = makeNode({
        data: {
          ...makeNode().data,
          metadata: {
            ...makeNode().data.metadata,
            configEdit: {
              externalEditLink: { url: "https://admin.example.com" },
            },
          },
        },
      });
      expect(shouldUseDynamicSchema(node)).toBe(false);
    });
  });
});

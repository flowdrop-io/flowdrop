/**
 * WebMCP adapter — a fake runtime for tests and demos.
 *
 * Browsers without the origin trial have no `document.modelContext`, and CI
 * never will. This records `registerTool` calls, honours the abort signal the
 * way the spec describes, and lets a test or a storybook panel invoke a tool
 * by name. Install it with `attachWebMCP(instance, { modelContext: fake })`
 * or assign it to `document.modelContext` before mounting.
 *
 * @module webmcp/fake
 */

import type {
  ModelContextLike,
  RegisteredToolDefinition,
  RegisterToolOptions,
  ToolResult
} from './types.js';

export interface FakeModelContext extends ModelContextLike {
  /** Registered tools by name, in registration order. */
  readonly tools: Map<string, RegisteredToolDefinition>;
  /** Invoke a tool by its full name; returns the runtime's result envelope. */
  executeTool(name: string, input?: unknown): Promise<ToolResult>;
  /** Invoke a tool and parse the JSON text it returns. */
  call(name: string, input?: unknown): Promise<Record<string, unknown>>;
  /** Fires after every register / unregister, like the spec's `toolchange`. */
  onToolChange(listener: () => void): () => void;
}

export function createFakeModelContext(): FakeModelContext {
  const tools = new Map<string, RegisteredToolDefinition>();
  const listeners = new Set<() => void>();
  const notify = (): void => listeners.forEach((l) => l());

  return {
    tools,
    registerTool(tool: RegisteredToolDefinition, options?: RegisterToolOptions): Promise<void> {
      tools.set(tool.name, tool);
      options?.signal?.addEventListener(
        'abort',
        () => {
          tools.delete(tool.name);
          notify();
        },
        { once: true }
      );
      notify();
      return Promise.resolve();
    },
    async executeTool(name, input = {}) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`[fake modelContext] no tool named "${name}"`);
      return tool.execute(input);
    },
    async call(name, input = {}) {
      const result = await this.executeTool(name, input);
      return JSON.parse(result.content[0].text) as Record<string, unknown>;
    },
    onToolChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

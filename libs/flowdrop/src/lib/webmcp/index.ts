/**
 * FlowDrop WebMCP adapter — `@flowdrop/flowdrop/webmcp`
 *
 * Exposes the editor's typed commands as WebMCP **editor tools** that a
 * browser-resident agent (Chrome's, Edge's, Brave Leo, ChatGPT Desktop, …)
 * can discover on the page and call: add and connect nodes, set config, list
 * and inspect, undo. Reads run at once; anything that changes the workflow
 * waits for the person at the keyboard unless the host says otherwise.
 *
 * These are tools for *editing* a workflow in the browser. They are unrelated
 * to the tools a running workflow hands to an LLM node.
 *
 * @module webmcp
 *
 * @example Svelte host
 * ```ts
 * import { attachWebMCP } from '@flowdrop/flowdrop/webmcp';
 * const handle = attachWebMCP(app.instance, { nodeTypes });
 * // later: handle?.detach() — or let instance.destroy() do it
 * ```
 *
 * @example Vanilla / Drupal host
 * ```ts
 * const app = await mountFlowDropApp(el, { endpointConfig, webmcp: true });
 * ```
 */

export { attachWebMCP, detectModelContext, DEFAULT_PREFIX } from './register.js';
export {
  buildToolDescriptors,
  describeCommand,
  validateToolArgs,
  EXPOSED_COMMAND_TYPES,
  VIEW_COMMAND_TYPES,
  EXCLUDED_COMMAND_TYPES,
  COMPOSITE_VERBS
} from './descriptors.js';
export type { BuildDescriptorsOptions } from './descriptors.js';
export { ToolArgumentError } from './types.js';
export { createFakeModelContext } from './fake.js';
export type { FakeModelContext } from './fake.js';
export type {
  ToolDescriptor,
  ToolInputSchema,
  ToolSchemaProperty,
  ToolResult,
  ToolExecuteOptions,
  RegisteredToolDefinition,
  RegisterToolOptions,
  ModelContextLike,
  WebMCPApproval,
  WebMCPOptions,
  WebMCPMountOptions,
  WebMCPHandle
} from './types.js';

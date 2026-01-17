/**
 * FlowDrop Playground Module
 *
 * Provides the Playground feature for interactive workflow testing with
 * chat interface, session management, and real-time execution logs.
 *
 * @module playground
 *
 * @example
 * ```typescript
 * import { Playground, playgroundService } from "@d34dman/flowdrop/playground";
 * import type { PlaygroundSession, PlaygroundMessage } from "@d34dman/flowdrop/playground";
 * ```
 *
 * @example In Svelte (Standalone mode):
 * ```svelte
 * <script>
 *   import { Playground } from "@d34dman/flowdrop/playground";
 * </script>
 *
 * <Playground workflowId="wf-123" mode="standalone" />
 * ```
 *
 * @example In Svelte (Embedded mode):
 * ```svelte
 * <script>
 *   import { Playground } from "@d34dman/flowdrop/playground";
 *   let showPlayground = false;
 * </script>
 *
 * {#if showPlayground}
 *   <Playground
 *     workflowId="wf-123"
 *     workflow={myWorkflow}
 *     mode="embedded"
 *     onClose={() => showPlayground = false}
 *   />
 * {/if}
 * ```
 */

// ============================================================================
// Playground Components
// ============================================================================

export { default as Playground } from '../components/playground/Playground.svelte';
export { default as ChatPanel } from '../components/playground/ChatPanel.svelte';
export { default as SessionManager } from '../components/playground/SessionManager.svelte';
export { default as InputCollector } from '../components/playground/InputCollector.svelte';
export { default as ExecutionLogs } from '../components/playground/ExecutionLogs.svelte';
export { default as MessageBubble } from '../components/playground/MessageBubble.svelte';

// ============================================================================
// Playground Service
// ============================================================================

export { PlaygroundService, playgroundService } from '../services/playgroundService.js';

// ============================================================================
// Playground Store
// ============================================================================

export {
	// Core stores
	currentSession,
	sessions,
	messages,
	isExecuting,
	isLoading,
	error as playgroundError,
	currentWorkflow,
	lastPollTimestamp,
	// Derived stores
	sessionStatus,
	messageCount,
	chatMessages,
	logMessages,
	latestMessage,
	inputFields,
	hasChatInput,
	sessionCount,
	// Actions
	playgroundActions,
	// Utilities
	getCurrentSessionId,
	isSessionSelected,
	getMessagesSnapshot,
	getLatestMessageTimestamp
} from '../stores/playgroundStore.js';

// ============================================================================
// Playground Types
// ============================================================================

export type {
	PlaygroundSession,
	PlaygroundMessage,
	PlaygroundInputField,
	PlaygroundMessageRequest,
	PlaygroundMessagesResult,
	PlaygroundConfig,
	PlaygroundMode,
	PlaygroundSessionStatus,
	PlaygroundMessageRole,
	PlaygroundMessageLevel,
	PlaygroundMessageMetadata,
	PlaygroundApiResponse,
	PlaygroundSessionsResponse,
	PlaygroundSessionResponse,
	PlaygroundMessageResponse,
	PlaygroundMessagesApiResponse
} from '../types/playground.js';

export { isChatInputNode, CHAT_INPUT_PATTERNS } from '../types/playground.js';

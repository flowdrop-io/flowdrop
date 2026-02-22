/**
 * FlowDrop Playground Module
 *
 * Provides the Playground feature for interactive workflow testing with
 * chat interface, session management, and real-time execution logs.
 *
 * @module playground
 *
 * @example Using mountPlayground for vanilla JS / Drupal / IIFE:
 * ```typescript
 * import { mountPlayground, createEndpointConfig } from "@d34dman/flowdrop/playground";
 *
 * const app = await mountPlayground(
 *   document.getElementById("playground-container"),
 *   {
 *     workflowId: "wf-123",
 *     endpointConfig: createEndpointConfig("/api/flowdrop"),
 *     mode: "standalone"
 *   }
 * );
 *
 * // Later, to cleanup:
 * app.destroy();
 * ```
 *
 * @example Drupal Behaviors integration:
 * ```javascript
 * (function (Drupal, FlowDrop) {
 *   Drupal.behaviors.flowdropPlayground = {
 *     attach: function (context, settings) {
 *       var container = document.getElementById("playground-container");
 *       if (!container || container.dataset.initialized) return;
 *       container.dataset.initialized = "true";
 *
 *       FlowDrop.mountPlayground(container, {
 *         workflowId: settings.flowdrop.workflowId,
 *         endpointConfig: FlowDrop.createEndpointConfig(settings.flowdrop.apiBaseUrl),
 *         mode: "standalone"
 *       }).then(function (app) {
 *         container._flowdropApp = app;
 *       });
 *     },
 *     detach: function (context, settings, trigger) {
 *       if (trigger === "unload") {
 *         var container = document.getElementById("playground-container");
 *         if (container && container._flowdropApp) {
 *           container._flowdropApp.destroy();
 *         }
 *       }
 *     }
 *   };
 * })(Drupal, window.FlowDrop);
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
 *
 * @example In Svelte (Modal mode):
 * ```svelte
 * <script>
 *   import { PlaygroundModal } from "@d34dman/flowdrop/playground";
 *   let showPlayground = false;
 * </script>
 *
 * <PlaygroundModal
 *   isOpen={showPlayground}
 *   workflowId="wf-123"
 *   workflow={myWorkflow}
 *   onClose={() => showPlayground = false}
 * />
 * ```
 *
 * @example Using mountPlayground with modal mode:
 * ```typescript
 * import { mountPlayground, createEndpointConfig } from "@d34dman/flowdrop/playground";
 *
 * const app = await mountPlayground(
 *   document.getElementById("playground-container"),
 *   {
 *     workflowId: "wf-123",
 *     endpointConfig: createEndpointConfig("/api/flowdrop"),
 *     mode: "modal",
 *     onClose: () => {
 *       app.destroy();
 *     }
 *   }
 * );
 * ```
 */

// ============================================================================
// Playground Components
// ============================================================================

export { default as Playground } from '../components/playground/Playground.svelte';
export { default as PlaygroundModal } from '../components/playground/PlaygroundModal.svelte';
export { default as ChatPanel } from '../components/playground/ChatPanel.svelte';
export { default as SessionManager } from '../components/playground/SessionManager.svelte';
export { default as InputCollector } from '../components/playground/InputCollector.svelte';
export { default as ExecutionLogs } from '../components/playground/ExecutionLogs.svelte';
export { default as MessageBubble } from '../components/playground/MessageBubble.svelte';

// ============================================================================
// Interrupt Components (Human-in-the-Loop)
// ============================================================================

export {
	InterruptBubble,
	ConfirmationPrompt,
	ChoicePrompt,
	TextInputPrompt,
	FormPrompt
} from '../components/interrupt/index.js';

// ============================================================================
// Playground Service
// ============================================================================

export { PlaygroundService, playgroundService } from '../services/playgroundService.js';

// ============================================================================
// Interrupt Service (Human-in-the-Loop)
// ============================================================================

export { InterruptService, interruptService } from '../services/interruptService.js';

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
	// Polling callback factory
	createPollingCallback,
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

export {
	isChatInputNode,
	CHAT_INPUT_PATTERNS,
	defaultShouldStopPolling,
	defaultIsTerminalStatus,
	DEFAULT_STOP_POLLING_STATUSES,
	DEFAULT_TERMINAL_STATUSES
} from '../types/playground.js';

// ============================================================================
// Interrupt Types (Human-in-the-Loop)
// ============================================================================

export type {
	InterruptType,
	InterruptStatus,
	Interrupt,
	InterruptChoice,
	InterruptConfig,
	ConfirmationConfig,
	ChoiceConfig,
	TextConfig,
	FormConfig,
	InterruptResolution,
	InterruptApiResponse,
	InterruptListResponse,
	InterruptResponse,
	InterruptMessageMetadata,
	InterruptPollingConfig
} from '../types/interrupt.js';

export {
	isInterruptMetadata,
	extractInterruptMetadata,
	metadataToInterrupt,
	defaultInterruptPollingConfig
} from '../types/interrupt.js';

// ============================================================================
// Interrupt Store (Human-in-the-Loop)
// ============================================================================

export {
	// Core stores
	interrupts,
	// Derived stores
	pendingInterruptIds,
	pendingInterrupts,
	pendingInterruptCount,
	resolvedInterrupts,
	isAnySubmitting,
	// Actions
	interruptActions,
	// Utilities
	getInterrupt,
	isInterruptPending,
	isInterruptSubmitting,
	getInterruptError,
	getInterruptByMessageId
} from '../stores/interruptStore.js';

// ============================================================================
// Playground Mount Functions (for vanilla JS / Drupal / IIFE integration)
// ============================================================================

export {
	mountPlayground,
	unmountPlayground,
	type PlaygroundMountOptions,
	type MountedPlayground
} from './mount.js';

// ============================================================================
// Endpoint Configuration (re-exported for convenience)
// ============================================================================

export {
	createEndpointConfig,
	defaultEndpointConfig,
	buildEndpointUrl,
	type EndpointConfig
} from '../config/endpoints.js';

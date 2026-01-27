<!--
  ChatPanel Component
  
  Clean conversational chat interface for the playground.
  Displays messages with chat bubbles and includes a simple input area.
  Styled with BEM syntax for a Langflow-like appearance.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';
	import MessageBubble from './MessageBubble.svelte';
	import { InterruptBubble } from '../interrupt/index.js';
	import type { PlaygroundMessage } from '../../types/playground.js';
	import { hasEnableRunFlag } from '../../types/playground.js';
	import {
		isInterruptMetadata,
		extractInterruptMetadata,
		metadataToInterrupt
	} from '../../types/interrupt.js';
	import {
		messages,
		chatMessages,
		isExecuting,
		sessionStatus,
		currentSession
	} from '../../stores/playgroundStore.js';
	import {
		interrupts,
		interruptActions,
		getInterruptByMessageId
	} from '../../stores/interruptStore.js';

	/**
	 * Component props
	 */
	interface Props {
		/** Whether to show timestamps on messages */
		showTimestamps?: boolean;
		/** Whether to auto-scroll to bottom on new messages */
		autoScroll?: boolean;
		/** Placeholder text for the input */
		placeholder?: string;
		/** Callback when user sends a message */
		onSendMessage?: (content: string) => void;
		/** Callback when user requests to stop execution */
		onStopExecution?: () => void;
		/** Whether to show log messages inline (false = hide them) */
		showLogsInline?: boolean;
		/** Whether to enable markdown rendering in messages */
		enableMarkdown?: boolean;
		/** Callback when an interrupt is resolved (to refresh messages) */
		onInterruptResolved?: () => void;
		/**
		 * Whether to show the chat text input (default: true)
		 * When false, only the "Run" button is displayed.
		 */
		showChatInput?: boolean;
		/**
		 * Whether to show the "Run" button (default: true)
		 * When false, the Run button is hidden.
		 */
		showRunButton?: boolean;
		/**
		 * Predefined message to send when "Run" button is clicked
		 * Used when showChatInput is false.
		 */
		predefinedMessage?: string;
	}

	let {
		showTimestamps = true,
		autoScroll = true,
		placeholder = 'Type your message...',
		onSendMessage,
		onStopExecution,
		showLogsInline = false,
		enableMarkdown = true,
		onInterruptResolved,
		showChatInput = true,
		showRunButton = true,
		predefinedMessage = 'Run workflow'
	}: Props = $props();

	/**
	 * Tracks whether the Run button is enabled.
	 * Starts as true, becomes false after Run is clicked,
	 * and is re-enabled when backend sends a message with enableRun: true metadata.
	 */
	let runEnabled = $state(true);

	/**
	 * Computed flag: true if both chat input and run button are hidden.
	 * In this case, we show a helpful message to the user.
	 */
	const noInputsAvailable = $derived(!showChatInput && !showRunButton);

	/** Input field value */
	let inputValue = $state('');

	/** Reference to the messages container for scrolling */
	let messagesContainer = $state<HTMLDivElement>();

	/** Reference to the input field */
	let inputField = $state<HTMLTextAreaElement>();

	/**
	 * Filter messages based on showLogsInline setting
	 */
	const displayMessages = $derived(showLogsInline ? $messages : $chatMessages);

	/**
	 * Check if a message is an interrupt request
	 */
	function isInterruptMessage(message: PlaygroundMessage): boolean {
		return isInterruptMetadata(message.metadata as Record<string, unknown> | undefined);
	}

	/**
	 * Sync interrupt messages to the interrupt store.
	 * This effect runs when messages change and adds any new interrupt messages
	 * to the interrupt store. We do this in an effect rather than during render
	 * to avoid Svelte 5's state_unsafe_mutation error.
	 *
	 * If a message has status 'completed', the interrupt is marked as resolved
	 * to show the "Confirmation Submitted" header, disabled buttons, and
	 * "Response submitted" indicator.
	 */
	$effect(() => {
		// Get all messages that are interrupt requests
		const interruptMessages = displayMessages.filter(isInterruptMessage);

		for (const message of interruptMessages) {
			// Check if we already have this interrupt in the store
			const existing = getInterruptByMessageId(message.id);
			if (!existing) {
				// Extract and validate interrupt metadata
				const metadata = extractInterruptMetadata(
					message.metadata as Record<string, unknown> | undefined
				);
				if (metadata) {
					const interrupt = metadataToInterrupt(metadata, message.id, message.content);
					interruptActions.addInterrupt(interrupt);

					// If the message status is 'completed', mark the interrupt as resolved
					// This ensures completed interrupts show proper UI state:
					// - "Confirmation Submitted" header
					// - Disabled buttons
					// - "Response submitted" indicator
					if (message.status === 'completed') {
						interruptActions.resolveInterrupt(interrupt.id, metadata.response_value);
					}
				}
			}
		}
	});

	/**
	 * Reactive map of message IDs to interrupts.
	 * This ensures the component re-renders when interrupts are added to the store.
	 */
	const interruptsByMessageId = $derived(
		new Map(
			Array.from($interrupts.values())
				.filter((i) => i.messageId)
				.map((i) => [i.messageId, i])
		)
	);

	/**
	 * Get interrupt data for a message from the reactive map
	 */
	function getInterruptForMessage(message: PlaygroundMessage) {
		return interruptsByMessageId.get(message.id);
	}

	/**
	 * Check if we should show the welcome state
	 */
	const showWelcome = $derived(!$currentSession && displayMessages.length === 0);

	/**
	 * Check if we should show the empty chat state (session exists but no messages)
	 */
	const showEmptyChat = $derived($currentSession && displayMessages.length === 0);

	/**
	 * Handle sending a message
	 */
	function handleSend(): void {
		const trimmedValue = inputValue.trim();
		if (!trimmedValue || $isExecuting) {
			return;
		}

		onSendMessage?.(trimmedValue);
		inputValue = '';

		// Reset textarea height
		if (inputField) {
			inputField.style.height = 'auto';
		}

		// Re-focus the input
		tick().then(() => {
			inputField?.focus();
		});
	}

	/**
	 * Handle keyboard events in the input
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSend();
		}
	}

	/**
	 * Handle stop execution
	 */
	function handleStop(): void {
		onStopExecution?.();
	}

	/**
	 * Handle "Run" button click when chat input is hidden.
	 * Sends the predefined message to execute the workflow.
	 * Disables the Run button after clicking until backend re-enables it.
	 */
	function handleRun(): void {
		if ($isExecuting || !runEnabled) {
			return;
		}
		// Disable the Run button after clicking
		runEnabled = false;
		onSendMessage?.(predefinedMessage);
	}

	/**
	 * Track processed message IDs for enableRun detection
	 * to avoid re-processing the same messages.
	 */
	let processedEnableRunIds = $state(new Set<string>());

	/**
	 * Watch for messages with enableRun: true metadata from the backend.
	 * When detected, re-enable the Run button.
	 */
	$effect(() => {
		// Check all messages for enableRun flag
		for (const message of displayMessages) {
			// Skip if already processed
			if (processedEnableRunIds.has(message.id)) {
				continue;
			}
			// Check if this message has the enableRun flag
			if (hasEnableRunFlag(message.metadata)) {
				// Mark as processed
				processedEnableRunIds = new Set([...processedEnableRunIds, message.id]);
				// Re-enable the Run button
				runEnabled = true;
			}
		}
	});

	/**
	 * Reset runEnabled state when session changes.
	 * This ensures a fresh state for each session.
	 */
	$effect(() => {
		const session = $currentSession;
		if (session) {
			// Reset to enabled state for new/changed sessions
			runEnabled = true;
			// Clear processed IDs for the new session
			processedEnableRunIds = new Set();
		}
	});

	/**
	 * Auto-scroll to bottom when messages change
	 */
	$effect(() => {
		if (autoScroll && messagesContainer && displayMessages.length > 0) {
			tick().then(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			});
		}
	});

	/**
	 * Track previous executing state to detect when execution completes
	 */
	let wasExecuting = $state(false);

	/**
	 * Auto-focus input when execution completes or session becomes ready
	 */
	$effect(() => {
		const currentlyExecuting = $isExecuting;

		// Focus input when execution completes (was executing, now not)
		if (wasExecuting && !currentlyExecuting && inputField) {
			tick().then(() => {
				inputField?.focus();
			});
		}

		// Update tracking state
		wasExecuting = currentlyExecuting;
	});

	/**
	 * Focus input when session status changes to idle or completed
	 */
	$effect(() => {
		const status = $sessionStatus;
		if ((status === 'idle' || status === 'completed') && inputField && !$isExecuting) {
			tick().then(() => {
				inputField?.focus();
			});
		}
	});

	/**
	 * Focus input when a new session is created/loaded
	 */
	$effect(() => {
		const session = $currentSession;
		if (session && inputField && !$isExecuting) {
			tick().then(() => {
				inputField?.focus();
			});
		}
	});

	/**
	 * Auto-resize textarea based on content
	 */
	function handleInput(): void {
		if (inputField) {
			inputField.style.height = 'auto';
			inputField.style.height = `${Math.min(inputField.scrollHeight, 120)}px`;
		}
	}
</script>

<div class="chat-panel">
	<!-- Messages Container -->
	<div class="chat-panel__messages" bind:this={messagesContainer}>
		{#if showWelcome}
			<!-- Welcome State (no session) -->
			<div class="chat-panel__welcome">
				<div class="chat-panel__welcome-icon">
					<svg
						width="48"
						height="48"
						viewBox="0 0 48 48"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M8 16L24 8L40 16V32L24 40L8 32V16Z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/>
						<path
							d="M8 16L24 24L40 16"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/>
						<path d="M24 24V40" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
						<path d="M16 12L32 20" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
						<path d="M16 36L32 28" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
					</svg>
				</div>
				{#if noInputsAvailable}
					<h2 class="chat-panel__welcome-title">View only</h2>
					<p class="chat-panel__welcome-text">This playground is in view-only mode. No inputs are available.</p>
				{:else if showChatInput}
					<h2 class="chat-panel__welcome-title">New chat</h2>
					<p class="chat-panel__welcome-text">Test your flow with a chat prompt</p>
				{:else}
					<h2 class="chat-panel__welcome-title">Ready to run</h2>
					<p class="chat-panel__welcome-text">Click Run to execute your workflow</p>
				{/if}
			</div>
		{:else if showEmptyChat}
			<!-- Empty Chat State (session exists but no messages) -->
			<div class="chat-panel__welcome">
				<div class="chat-panel__welcome-icon">
					<svg
						width="48"
						height="48"
						viewBox="0 0 48 48"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M8 16L24 8L40 16V32L24 40L8 32V16Z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/>
						<path
							d="M8 16L24 24L40 16"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/>
						<path d="M24 24V40" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
						<path d="M16 12L32 20" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
						<path d="M16 36L32 28" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
					</svg>
				</div>
				{#if noInputsAvailable}
					<h2 class="chat-panel__welcome-title">View only</h2>
					<p class="chat-panel__welcome-text">This playground is in view-only mode. No inputs are available.</p>
				{:else if showChatInput}
					<h2 class="chat-panel__welcome-title">New chat</h2>
					<p class="chat-panel__welcome-text">Test your flow with a chat prompt</p>
				{:else}
					<h2 class="chat-panel__welcome-title">Ready to run</h2>
					<p class="chat-panel__welcome-text">Click Run to execute your workflow</p>
				{/if}
			</div>
		{:else}
			<!-- Messages -->
			{#each displayMessages as message, index (message.id)}
				{#if isInterruptMessage(message)}
					<!-- Render interrupt inline -->
					{@const interrupt = getInterruptForMessage(message)}
					{#if interrupt}
						<InterruptBubble
							{interrupt}
							showTimestamp={showTimestamps}
							onResolved={onInterruptResolved}
						/>
					{/if}
				{:else}
					<MessageBubble
						{message}
						showTimestamp={showTimestamps}
						isLast={index === displayMessages.length - 1}
						{enableMarkdown}
					/>
				{/if}
			{/each}

			{#if $isExecuting}
				<div class="chat-panel__typing">
					<div class="chat-panel__typing-indicator">
						<span></span>
						<span></span>
						<span></span>
					</div>
					<span class="chat-panel__typing-text">Processing...</span>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Input Area -->
	<div class="chat-panel__input-area">
		{#if noInputsAvailable}
			<!-- No inputs available - show informational message -->
			<div class="chat-panel__no-inputs">
				<Icon icon="mdi:information-outline" />
				<span>View-only mode. Workflow execution is controlled externally.</span>
			</div>
		{:else}
			<div class="chat-panel__input-container" class:chat-panel__input-container--run-only={!showChatInput}>
				{#if showChatInput}
					<div class="chat-panel__input-wrapper">
						<textarea
							bind:this={inputField}
							bind:value={inputValue}
							class="chat-panel__input"
							{placeholder}
							rows="1"
							disabled={$isExecuting}
							onkeydown={handleKeydown}
							oninput={handleInput}
						></textarea>
					</div>
				{/if}

				{#if $sessionStatus === 'running' || $isExecuting}
					<button
						type="button"
						class="chat-panel__stop-btn"
						onclick={handleStop}
						title="Stop execution"
					>
						<Icon icon="mdi:stop" />
						Stop
					</button>
				{:else if showChatInput}
					<button
						type="button"
						class="chat-panel__send-btn"
						onclick={handleSend}
						disabled={!inputValue.trim()}
						title="Send message"
					>
						Send
					</button>
				{:else if showRunButton}
					<button
						type="button"
						class="chat-panel__run-btn"
						onclick={handleRun}
						disabled={!runEnabled}
						title={runEnabled ? 'Run workflow' : 'Waiting for workflow to be ready...'}
					>
						<Icon icon="mdi:play" />
						Run
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.chat-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0; /* Critical: allows flexbox to shrink properly */
		background-color: #ffffff;
	}

	/* Messages Container - Scrollable area that takes remaining space */
	.chat-panel__messages {
		flex: 1;
		min-height: 0; /* Critical: allows overflow to work in flex container */
		overflow-y: auto;
		padding: 1.5rem;
		scroll-behavior: smooth;
	}

	/* Welcome State */
	.chat-panel__welcome {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		padding: 2rem;
	}

	.chat-panel__welcome-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		margin-bottom: 1.5rem;
		color: #1f2937;
	}

	.chat-panel__welcome-icon svg {
		width: 100%;
		height: 100%;
	}

	.chat-panel__welcome-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.chat-panel__welcome-text {
		font-size: 1rem;
		color: #6b7280;
		margin: 0;
	}

	/* Typing Indicator */
	.chat-panel__typing {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		margin-top: 0.5rem;
		background-color: #f3f4f6;
		border-radius: 1rem;
		width: fit-content;
	}

	.chat-panel__typing-indicator {
		display: flex;
		gap: 0.25rem;
	}

	.chat-panel__typing-indicator span {
		width: 0.375rem;
		height: 0.375rem;
		background-color: #9ca3af;
		border-radius: 50%;
		animation: bounce 1.4s ease-in-out infinite;
	}

	.chat-panel__typing-indicator span:nth-child(1) {
		animation-delay: 0s;
	}

	.chat-panel__typing-indicator span:nth-child(2) {
		animation-delay: 0.2s;
	}

	.chat-panel__typing-indicator span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes bounce {
		0%,
		60%,
		100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-0.25rem);
		}
	}

	.chat-panel__typing-text {
		font-size: 0.8125rem;
		color: #6b7280;
	}

	/* Input Area - Always stays at bottom, never shrinks */
	.chat-panel__input-area {
		flex-shrink: 0;
		padding: 1rem 1.5rem 1.5rem;
		background-color: #ffffff;
		border-top: 1px solid #f3f4f6;
	}

	.chat-panel__input-container {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.chat-panel__input-wrapper {
		flex: 1;
		display: flex;
		align-items: flex-end;
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 0.625rem 0.75rem;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.chat-panel__input-wrapper:focus-within {
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.chat-panel__input {
		flex: 1;
		border: none;
		outline: none;
		resize: none;
		font-family: inherit;
		font-size: 0.9375rem;
		line-height: 1.5;
		max-height: 120px;
		background: transparent;
		color: #1f2937;
	}

	.chat-panel__input::placeholder {
		color: #9ca3af;
	}

	.chat-panel__input:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.chat-panel__send-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 0.5rem;
		background-color: #1f2937;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.chat-panel__send-btn:hover:not(:disabled) {
		background-color: #374151;
	}

	.chat-panel__send-btn:disabled {
		background-color: #e5e7eb;
		color: #9ca3af;
		cursor: not-allowed;
	}

	.chat-panel__stop-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.625rem 1rem;
		border: none;
		border-radius: 0.5rem;
		background-color: #ef4444;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.15s ease;
		flex-shrink: 0;
	}

	.chat-panel__stop-btn:hover {
		background-color: #dc2626;
	}

	/* Run button (when chat input is hidden) */
	.chat-panel__run-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 0.5rem;
		background-color: #10b981;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.chat-panel__run-btn:hover:not(:disabled) {
		background-color: #059669;
	}

	.chat-panel__run-btn:disabled {
		background-color: #e5e7eb;
		color: #9ca3af;
		cursor: not-allowed;
	}

	/* Container modifier for run-only mode (no text input) */
	.chat-panel__input-container--run-only {
		justify-content: flex-end;
	}

	/* No inputs available message (view-only mode) */
	.chat-panel__no-inputs {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #f3f4f6;
		border-radius: 0.5rem;
		color: #6b7280;
		font-size: 0.875rem;
		max-width: 800px;
		margin: 0 auto;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.chat-panel__messages {
			padding: 1rem;
		}

		.chat-panel__input-area {
			padding: 0.75rem 1rem 1rem;
		}

		.chat-panel__input-container {
			gap: 0.5rem;
		}

		.chat-panel__send-btn,
		.chat-panel__stop-btn,
		.chat-panel__run-btn {
			padding: 0.5rem 1rem;
		}
	}
</style>

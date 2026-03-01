<!--
  MessageBubble Component
  
  Renders individual messages in the playground chat interface.
  Supports different message roles with distinct styling.
  Supports markdown rendering for message content.
  Supports compact mode for system messages to reduce visual noise.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { marked } from 'marked';
	import { sanitizeHtml } from '../../utils/sanitize.js';
	import type {
		PlaygroundMessage,
		PlaygroundMessageMetadata,
		PlaygroundMessageRole
	} from '../../types/playground.js';

	/**
	 * Component props
	 */
	interface Props {
		/** The message to display */
		message: PlaygroundMessage;
		/** Whether to show the timestamp */
		showTimestamp?: boolean;
		/** Whether this is the last message (affects styling) */
		isLast?: boolean;
		/** Whether to render markdown content */
		enableMarkdown?: boolean;
		/**
		 * Use compact display mode for system messages.
		 * When true, system messages are rendered as minimal inline text
		 * instead of full chat bubbles to reduce visual noise.
		 * @default true
		 */
		compactSystemMessages?: boolean;
	}

	let {
		message,
		showTimestamp = true,
		isLast = false,
		enableMarkdown = true,
		compactSystemMessages = true
	}: Props = $props();

	/**
	 * Determine if this message should render in compact mode.
	 * Only system messages use compact mode when enabled.
	 */
	const useCompactMode = $derived(message.role === 'system' && compactSystemMessages);

	/**
	 * Render content as markdown or plain text
	 */
	const renderedContent = $derived(
		enableMarkdown && message.role !== 'log'
			? sanitizeHtml(marked.parse(message.content || '') as string)
			: message.content
	);

	/**
	 * Get the icon for the message role
	 *
	 * @param role - The message role
	 * @returns Iconify icon string
	 */
	function getRoleIcon(role: PlaygroundMessageRole): string {
		switch (role) {
			case 'user':
				return 'mdi:account';
			case 'assistant':
				return 'mdi:robot';
			case 'system':
				return 'mdi:cog';
			case 'log':
				return 'mdi:console';
			default:
				return 'mdi:message';
		}
	}

	/**
	 * Get the display label for the message role
	 *
	 * @param role - The message role
	 * @param metadata - Optional message metadata containing userName for user messages
	 * @returns Display label
	 */
	function getRoleLabel(role: PlaygroundMessageRole, metadata?: PlaygroundMessageMetadata): string {
		switch (role) {
			case 'user':
				return metadata?.userName ?? 'You';
			case 'assistant':
				return 'Assistant';
			case 'system':
				return 'System';
			case 'log':
				return metadata?.nodeLabel ?? 'Log';
			default:
				return 'Message';
		}
	}

	/**
	 * Format timestamp for display
	 *
	 * @param timestamp - ISO 8601 timestamp
	 * @returns Formatted time string
	 */
	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	/**
	 * Get log level icon
	 */
	function getLogLevelIcon(): string {
		const level = message.metadata?.level;
		switch (level) {
			case 'error':
				return 'mdi:alert-circle';
			case 'warning':
				return 'mdi:alert';
			case 'debug':
				return 'mdi:bug';
			default:
				return 'mdi:information';
		}
	}

	/**
	 * Format duration for display
	 */
	function formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${ms}ms`;
		}
		return `${(ms / 1000).toFixed(2)}s`;
	}
</script>

{#if useCompactMode}
	<!-- Compact system message: minimal inline text without bubble -->
	<div class="system-notice" class:system-notice--last={isLast}>
		<Icon icon="mdi:information-outline" class="system-notice__icon" />
		<span class="system-notice__text">{message.content}</span>
		{#if showTimestamp}
			<span class="system-notice__timestamp">{formatTimestamp(message.timestamp)}</span>
		{/if}
	</div>
{:else}
	<div
		class="message-bubble"
		class:message-bubble--user={message.role === 'user'}
		class:message-bubble--assistant={message.role === 'assistant'}
		class:message-bubble--system={message.role === 'system'}
		class:message-bubble--log={message.role === 'log'}
		class:message-bubble--log-error={message.role === 'log' && message.metadata?.level === 'error'}
		class:message-bubble--log-warning={message.role === 'log' &&
			message.metadata?.level === 'warning'}
		class:message-bubble--last={isLast}
	>
		<!-- Avatar / Icon -->
		<div class="message-bubble__avatar">
			<Icon icon={getRoleIcon(message.role)} />
		</div>

		<!-- Content -->
		<div class="message-bubble__content">
			<!-- Header -->
			<div class="message-bubble__header">
				<span class="message-bubble__role">{getRoleLabel(message.role, message.metadata)}</span>
				{#if message.role === 'log' && message.metadata?.level}
					<span
						class="message-bubble__log-level message-bubble__log-level--{message.metadata.level}"
					>
						<Icon icon={getLogLevelIcon()} />
						{message.metadata.level.toUpperCase()}
					</span>
				{/if}
				{#if showTimestamp}
					<span class="message-bubble__timestamp">{formatTimestamp(message.timestamp)}</span>
				{/if}
			</div>

			<!-- Message Text -->
			<div class="message-bubble__text">
				{#if enableMarkdown && message.role !== 'log'}
					<!-- Markdown content - sanitized with DOMPurify to prevent XSS -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderedContent}
				{:else}
					{message.content}
				{/if}
			</div>

			<!-- Metadata Footer -->
			{#if message.metadata?.duration !== undefined || message.nodeId}
				<div class="message-bubble__footer">
					{#if message.nodeId}
						<span class="message-bubble__node" title="Node ID: {message.nodeId}">
							<Icon icon="mdi:graph" />
							{message.metadata?.nodeLabel ?? message.nodeId}
						</span>
					{/if}
					{#if message.metadata?.duration !== undefined}
						<span class="message-bubble__duration" title="Execution duration">
							<Icon icon="mdi:timer-outline" />
							{formatDuration(message.metadata.duration)}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.message-bubble {
		display: flex;
		gap: var(--fd-space-md);
		padding: var(--fd-space-md) var(--fd-space-xl);
		margin-bottom: var(--fd-space-xs);
		border-radius: var(--fd-radius-xl);
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Role-specific styling - Neutral theme */
	.message-bubble--user {
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		color: var(--fd-foreground);
		margin-left: var(--fd-space-4xl);
		flex-direction: row-reverse;
	}

	.message-bubble--assistant {
		background-color: var(--fd-card);
		border: 1px solid var(--fd-border);
		color: var(--fd-card-foreground);
		margin-right: var(--fd-space-4xl);
	}

	.message-bubble--system {
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		color: var(--fd-muted-foreground);
		margin: 0 var(--fd-space-xl);
		font-size: var(--fd-text-sm);
	}

	.message-bubble--log {
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		color: var(--fd-muted-foreground);
		margin: 0 var(--fd-space-xl);
		font-size: var(--fd-text-sm);
		font-family: var(--fd-font-mono);
	}

	.message-bubble--log-error {
		background-color: var(--fd-error-muted);
		border-color: var(--fd-error);
		color: var(--fd-error);
	}

	.message-bubble--log-warning {
		background-color: var(--fd-warning-muted);
		border-color: var(--fd-warning);
		color: var(--fd-warning);
	}

	.message-bubble--last {
		margin-bottom: var(--fd-space-xl);
	}

	/* Avatar */
	.message-bubble__avatar {
		flex-shrink: 0;
		width: var(--fd-space-4xl);
		height: var(--fd-space-4xl);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--fd-radius-full);
		font-size: var(--fd-text-lg);
	}

	.message-bubble--user .message-bubble__avatar {
		background-color: var(--fd-secondary);
		color: var(--fd-secondary-foreground);
	}

	.message-bubble--assistant .message-bubble__avatar {
		background-color: var(--fd-secondary);
		color: var(--fd-secondary-foreground);
	}

	.message-bubble--system .message-bubble__avatar {
		background-color: var(--fd-muted);
		color: var(--fd-muted-foreground);
	}

	.message-bubble--log .message-bubble__avatar {
		background-color: var(--fd-secondary);
		color: var(--fd-muted-foreground);
		width: var(--fd-space-3xl);
		height: var(--fd-space-3xl);
		font-size: var(--fd-text-sm);
	}

	/* Content */
	.message-bubble__content {
		flex: 1;
		min-width: 0;
	}

	/* Header */
	.message-bubble__header {
		display: flex;
		align-items: center;
		gap: var(--fd-space-xs);
		margin-bottom: var(--fd-space-3xs);
	}

	.message-bubble--user .message-bubble__header {
		flex-direction: row-reverse;
	}

	.message-bubble__role {
		font-weight: 600;
		font-size: var(--fd-text-sm);
		color: var(--fd-foreground);
	}

	.message-bubble--user .message-bubble__role {
		color: var(--fd-foreground);
	}

	.message-bubble--assistant .message-bubble__role {
		color: var(--fd-foreground);
	}

	.message-bubble--log .message-bubble__role {
		font-weight: 500;
	}

	.message-bubble__log-level {
		display: flex;
		align-items: center;
		gap: var(--fd-space-3xs);
		font-size: var(--fd-text-xs);
		font-weight: 600;
		padding: 0.125rem var(--fd-space-3xs);
		border-radius: var(--fd-radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.message-bubble__log-level--info {
		background-color: var(--fd-info-muted);
		color: var(--fd-info);
	}

	.message-bubble__log-level--warning {
		background-color: var(--fd-warning-muted);
		color: var(--fd-warning);
	}

	.message-bubble__log-level--error {
		background-color: var(--fd-error-muted);
		color: var(--fd-error);
	}

	.message-bubble__log-level--debug {
		background-color: var(--fd-accent-muted);
		color: var(--fd-accent);
	}

	.message-bubble__timestamp {
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
		font-family: var(--fd-font-mono);
	}

	.message-bubble--user .message-bubble__timestamp {
		color: var(--fd-muted-foreground);
	}

	/* Message text */
	.message-bubble__text {
		line-height: var(--fd-leading-relaxed);
		word-break: break-word;
	}

	.message-bubble--log .message-bubble__text {
		font-size: var(--fd-text-sm);
		line-height: var(--fd-leading-tight);
		white-space: pre-wrap;
	}

	/* Markdown styling for message content */
	.message-bubble__text :global(p) {
		margin: 0 0 var(--fd-space-md) 0;
	}

	.message-bubble__text :global(p:last-child) {
		margin-bottom: 0;
	}

	.message-bubble__text :global(h1),
	.message-bubble__text :global(h2),
	.message-bubble__text :global(h3),
	.message-bubble__text :global(h4),
	.message-bubble__text :global(h5),
	.message-bubble__text :global(h6) {
		margin: var(--fd-space-xl) 0 var(--fd-space-xs) 0;
		font-weight: 600;
		line-height: 1.3;
	}

	.message-bubble__text :global(h1:first-child),
	.message-bubble__text :global(h2:first-child),
	.message-bubble__text :global(h3:first-child),
	.message-bubble__text :global(h4:first-child),
	.message-bubble__text :global(h5:first-child),
	.message-bubble__text :global(h6:first-child) {
		margin-top: 0;
	}

	.message-bubble__text :global(h1) {
		font-size: var(--fd-text-xl);
	}

	.message-bubble__text :global(h2) {
		font-size: var(--fd-text-lg);
	}

	.message-bubble__text :global(h3) {
		font-size: var(--fd-text-base);
	}

	.message-bubble__text :global(ul),
	.message-bubble__text :global(ol) {
		margin: var(--fd-space-xs) 0;
		padding-left: var(--fd-space-3xl);
	}

	.message-bubble__text :global(li) {
		margin: var(--fd-space-3xs) 0;
	}

	.message-bubble__text :global(code) {
		background-color: var(--fd-secondary);
		padding: 0.125rem var(--fd-space-3xs);
		border-radius: var(--fd-radius-sm);
		font-family: var(--fd-font-mono);
		font-size: 0.875em;
	}

	.message-bubble__text :global(pre) {
		background-color: var(--fd-foreground);
		color: var(--fd-background);
		padding: var(--fd-space-md) var(--fd-space-xl);
		border-radius: var(--fd-radius-lg);
		overflow-x: auto;
		margin: var(--fd-space-md) 0;
		font-size: var(--fd-text-sm);
		line-height: var(--fd-leading-normal);
	}

	.message-bubble__text :global(pre code) {
		background-color: transparent;
		padding: 0;
		border-radius: 0;
		color: inherit;
		font-size: inherit;
	}

	.message-bubble__text :global(blockquote) {
		border-left: 3px solid var(--fd-border-strong);
		padding-left: var(--fd-space-xl);
		margin: var(--fd-space-md) 0;
		color: var(--fd-muted-foreground);
		font-style: italic;
	}

	.message-bubble__text :global(a) {
		color: var(--fd-primary);
		text-decoration: none;
	}

	.message-bubble__text :global(a:hover) {
		text-decoration: underline;
	}

	.message-bubble__text :global(hr) {
		border: none;
		border-top: 1px solid var(--fd-border);
		margin: var(--fd-space-xl) 0;
	}

	.message-bubble__text :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: var(--fd-space-md) 0;
		font-size: var(--fd-text-sm);
	}

	.message-bubble__text :global(th),
	.message-bubble__text :global(td) {
		border: 1px solid var(--fd-border);
		padding: var(--fd-space-xs) var(--fd-space-md);
		text-align: left;
	}

	.message-bubble__text :global(th) {
		background-color: var(--fd-muted);
		font-weight: 600;
	}

	.message-bubble__text :global(strong) {
		font-weight: 600;
	}

	.message-bubble__text :global(em) {
		font-style: italic;
	}

	/* Footer */
	.message-bubble__footer {
		display: flex;
		align-items: center;
		gap: var(--fd-space-md);
		margin-top: var(--fd-space-xs);
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
	}

	.message-bubble--user .message-bubble__footer {
		justify-content: flex-end;
	}

	.message-bubble__node,
	.message-bubble__duration {
		display: flex;
		align-items: center;
		gap: var(--fd-space-3xs);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.message-bubble--user,
		.message-bubble--assistant {
			margin-left: 0;
			margin-right: 0;
		}

		.message-bubble__avatar {
			width: 1.75rem;
			height: 1.75rem;
			font-size: var(--fd-text-base);
		}
	}

	/* ========================================
	   Compact System Notice Styles
	   Minimal inline display for system messages
	   ======================================== */

	.system-notice {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--fd-space-3xs);
		padding: var(--fd-space-3xs) var(--fd-space-md);
		margin: var(--fd-space-3xs) 0;
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
		text-align: center;
	}

	.system-notice--last {
		margin-bottom: var(--fd-space-md);
	}

	/* Icon styling - using :global for Iconify component */
	.system-notice :global(.system-notice__icon) {
		flex-shrink: 0;
		font-size: var(--fd-text-sm);
		color: var(--fd-border-strong);
	}

	.system-notice__text {
		color: var(--fd-muted-foreground);
		line-height: var(--fd-leading-tight);
	}

	.system-notice__timestamp {
		flex-shrink: 0;
		font-size: 0.625rem;
		color: var(--fd-border-strong);
		font-family: var(--fd-font-mono);
	}

	/* Responsive: hide timestamp on small screens for compactness */
	@media (max-width: 640px) {
		.system-notice__timestamp {
			display: none;
		}
	}
</style>

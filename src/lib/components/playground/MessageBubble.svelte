<!--
  MessageBubble Component
  
  Renders individual messages in the playground chat interface.
  Supports different message roles with distinct styling.
  Supports markdown rendering for message content.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { marked } from 'marked';
	import type { PlaygroundMessage, PlaygroundMessageRole } from '../../types/playground.js';

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
	}

	let { message, showTimestamp = true, isLast = false, enableMarkdown = true }: Props = $props();

	/**
	 * Render content as markdown or plain text
	 */
	const renderedContent = $derived(
		enableMarkdown && message.role !== 'log' ? marked.parse(message.content || '') : message.content
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
	 * @returns Display label
	 */
	function getRoleLabel(role: PlaygroundMessageRole): string {
		switch (role) {
			case 'user':
				return 'You';
			case 'assistant':
				return 'Assistant';
			case 'system':
				return 'System';
			case 'log':
				return message.metadata?.nodeLabel ?? 'Log';
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
			<span class="message-bubble__role">{getRoleLabel(message.role)}</span>
			{#if message.role === 'log' && message.metadata?.level}
				<span class="message-bubble__log-level message-bubble__log-level--{message.metadata.level}">
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
				<!-- Markdown content - marked.js sanitizes content by default -->
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

<style>
	.message-bubble {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		margin-bottom: 0.5rem;
		border-radius: 0.75rem;
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
		background-color: #f1f5f9;
		border: 1px solid #e2e8f0;
		color: #1e293b;
		margin-left: 2rem;
		flex-direction: row-reverse;
	}

	.message-bubble--assistant {
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		color: #1f2937;
		margin-right: 2rem;
	}

	.message-bubble--system {
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		color: #6b7280;
		margin: 0 1rem;
		font-size: 0.875rem;
	}

	.message-bubble--log {
		background-color: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #475569;
		margin: 0 1rem;
		font-size: 0.8125rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.message-bubble--log-error {
		background-color: #fef2f2;
		border-color: #fecaca;
		color: #991b1b;
	}

	.message-bubble--log-warning {
		background-color: #fffbeb;
		border-color: #fde68a;
		color: #92400e;
	}

	.message-bubble--last {
		margin-bottom: 1rem;
	}

	/* Avatar */
	.message-bubble__avatar {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-size: 1.125rem;
	}

	.message-bubble--user .message-bubble__avatar {
		background-color: #e2e8f0;
		color: #475569;
	}

	.message-bubble--assistant .message-bubble__avatar {
		background-color: #e5e7eb;
		color: #374151;
	}

	.message-bubble--system .message-bubble__avatar {
		background-color: #f3f4f6;
		color: #6b7280;
	}

	.message-bubble--log .message-bubble__avatar {
		background-color: #e2e8f0;
		color: #64748b;
		width: 1.5rem;
		height: 1.5rem;
		font-size: 0.875rem;
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
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.message-bubble--user .message-bubble__header {
		flex-direction: row-reverse;
	}

	.message-bubble__role {
		font-weight: 600;
		font-size: 0.8125rem;
		color: #374151;
	}

	.message-bubble--user .message-bubble__role {
		color: #475569;
	}

	.message-bubble--assistant .message-bubble__role {
		color: #374151;
	}

	.message-bubble--log .message-bubble__role {
		font-weight: 500;
	}

	.message-bubble__log-level {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.message-bubble__log-level--info {
		background-color: #e0f2fe;
		color: #0369a1;
	}

	.message-bubble__log-level--warning {
		background-color: #fef3c7;
		color: #b45309;
	}

	.message-bubble__log-level--error {
		background-color: #fee2e2;
		color: #dc2626;
	}

	.message-bubble__log-level--debug {
		background-color: #f3e8ff;
		color: #7c3aed;
	}

	.message-bubble__timestamp {
		font-size: 0.6875rem;
		color: #9ca3af;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.message-bubble--user .message-bubble__timestamp {
		color: #9ca3af;
	}

	/* Message text */
	.message-bubble__text {
		line-height: 1.6;
		word-break: break-word;
	}

	.message-bubble--log .message-bubble__text {
		font-size: 0.8125rem;
		line-height: 1.4;
		white-space: pre-wrap;
	}

	/* Markdown styling for message content */
	.message-bubble__text :global(p) {
		margin: 0 0 0.75rem 0;
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
		margin: 1rem 0 0.5rem 0;
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
		font-size: 1.25rem;
	}

	.message-bubble__text :global(h2) {
		font-size: 1.125rem;
	}

	.message-bubble__text :global(h3) {
		font-size: 1rem;
	}

	.message-bubble__text :global(ul),
	.message-bubble__text :global(ol) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.message-bubble__text :global(li) {
		margin: 0.25rem 0;
	}

	.message-bubble__text :global(code) {
		background-color: rgba(0, 0, 0, 0.06);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875em;
	}

	.message-bubble__text :global(pre) {
		background-color: #1e293b;
		color: #e2e8f0;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin: 0.75rem 0;
		font-size: 0.8125rem;
		line-height: 1.5;
	}

	.message-bubble__text :global(pre code) {
		background-color: transparent;
		padding: 0;
		border-radius: 0;
		color: inherit;
		font-size: inherit;
	}

	.message-bubble__text :global(blockquote) {
		border-left: 3px solid #d1d5db;
		padding-left: 1rem;
		margin: 0.75rem 0;
		color: #6b7280;
		font-style: italic;
	}

	.message-bubble__text :global(a) {
		color: #2563eb;
		text-decoration: none;
	}

	.message-bubble__text :global(a:hover) {
		text-decoration: underline;
	}

	.message-bubble__text :global(hr) {
		border: none;
		border-top: 1px solid #e5e7eb;
		margin: 1rem 0;
	}

	.message-bubble__text :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.75rem 0;
		font-size: 0.875rem;
	}

	.message-bubble__text :global(th),
	.message-bubble__text :global(td) {
		border: 1px solid #e5e7eb;
		padding: 0.5rem 0.75rem;
		text-align: left;
	}

	.message-bubble__text :global(th) {
		background-color: #f9fafb;
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
		gap: 0.75rem;
		margin-top: 0.5rem;
		font-size: 0.6875rem;
		color: #9ca3af;
	}

	.message-bubble--user .message-bubble__footer {
		justify-content: flex-end;
	}

	.message-bubble__node,
	.message-bubble__duration {
		display: flex;
		align-items: center;
		gap: 0.25rem;
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
			font-size: 1rem;
		}
	}
</style>

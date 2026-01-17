<!--
  MessageBubble Component
  
  Renders individual messages in the playground chat interface.
  Supports different message roles with distinct styling.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
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
	}

	let { message, showTimestamp = true, isLast = false }: Props = $props();

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
			{message.content}
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

	/* Role-specific styling */
	.message-bubble--user {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		color: #ffffff;
		margin-left: 2rem;
		flex-direction: row-reverse;
	}

	.message-bubble--assistant {
		background-color: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #1e293b;
		margin-right: 2rem;
	}

	.message-bubble--system {
		background-color: #fef3c7;
		border: 1px solid #fcd34d;
		color: #92400e;
		margin: 0 1rem;
		font-size: 0.875rem;
	}

	.message-bubble--log {
		background-color: #f1f5f9;
		border: 1px solid #cbd5e1;
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
		background-color: rgba(255, 255, 255, 0.2);
		color: #ffffff;
	}

	.message-bubble--assistant .message-bubble__avatar {
		background-color: #dbeafe;
		color: #2563eb;
	}

	.message-bubble--system .message-bubble__avatar {
		background-color: #fde68a;
		color: #92400e;
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
	}

	.message-bubble--user .message-bubble__role {
		color: rgba(255, 255, 255, 0.9);
	}

	.message-bubble--assistant .message-bubble__role {
		color: #3b82f6;
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
		background-color: #dbeafe;
		color: #1d4ed8;
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
		opacity: 0.7;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.message-bubble--user .message-bubble__timestamp {
		color: rgba(255, 255, 255, 0.7);
	}

	/* Message text */
	.message-bubble__text {
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.message-bubble--log .message-bubble__text {
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	/* Footer */
	.message-bubble__footer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
		font-size: 0.6875rem;
		opacity: 0.7;
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

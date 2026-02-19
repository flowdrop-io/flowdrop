<!--
  Logs Sidebar Component
  Right-side sliding sidebar for real-time execution logs
  Similar to ConfigSidebar but for logs display
  Styled with BEM syntax
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { createEventDispatcher } from 'svelte';
	import type { WorkflowNode as WorkflowNodeType } from '../types/index.js';

	const dispatch = createEventDispatcher();

	interface LogEntry {
		timestamp: string;
		level: string;
		message: string;
		nodeId?: string;
	}

	interface Props {
		isOpen: boolean;
		logs: LogEntry[];
		selectedNode?: WorkflowNodeType | null;
		onClose?: () => void;
	}

	let props: Props = $props();

	// Focus management and body scroll control
	$effect(() => {
		if (props.isOpen) {
			// Focus management - focus the sidebar when it opens
			setTimeout(() => {
				const sidebar = document.querySelector('.logs-sidebar--open');
				if (sidebar) {
					(sidebar as HTMLElement).focus();
				}
			}, 100);

			// Prevent body scroll
			document.body.style.overflow = 'hidden';
		} else {
			// Restore body scroll
			document.body.style.overflow = '';
		}
	});

	/**
	 * Handle close action
	 */
	function handleClose(): void {
		props.onClose?.();
		dispatch('close');
	}

	/**
	 * Handle keyboard shortcuts
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	/**
	 * Get log level color
	 * Returns CSS variable references for theme consistency
	 */
	function getLogLevelColor(level: string): string {
		switch (level) {
			case 'error':
				return 'var(--fd-error)';
			case 'warning':
				return 'var(--fd-warning)';
			case 'success':
				return 'var(--fd-success)';
			case 'info':
				return 'var(--fd-info)';
			default:
				return 'var(--fd-muted-foreground)';
		}
	}

	/**
	 * Get log level icon
	 */
	function getLogLevelIcon(level: string): string {
		switch (level) {
			case 'error':
				return 'mdi:alert-circle';
			case 'warning':
				return 'mdi:alert';
			case 'success':
				return 'mdi:check-circle';
			case 'info':
				return 'mdi:information';
			default:
				return 'mdi:circle';
		}
	}

	/**
	 * Format timestamp for display
	 */
	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	/**
	 * Filter logs by selected node
	 */
	let filteredLogs = $derived(() => {
		if (props.selectedNode) {
			return props.logs.filter((log) => log.nodeId === props.selectedNode?.id);
		}
		return props.logs;
	});

	/**
	 * Clear logs
	 */
	function clearLogs(): void {
		dispatch('clear');
	}

	/**
	 * Export logs
	 */
	function exportLogs(): void {
		const logText = filteredLogs()
			.map(
				(log) =>
					`[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}${log.nodeId ? ` (Node: ${log.nodeId})` : ''}`
			)
			.join('\n');

		const blob = new Blob([logText], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `pipeline-logs-${new Date().toISOString().split('T')[0]}.txt`;
		link.click();
		URL.revokeObjectURL(url);
	}

	// Auto-scroll to bottom when new logs arrive
	let logsContainer = $state<HTMLElement>();
	$effect(() => {
		if (logsContainer && props.logs.length > 0) {
			logsContainer.scrollTop = logsContainer.scrollHeight;
		}
	});
</script>

<!-- Sidebar -->
<div
	class="logs-sidebar"
	class:logs-sidebar--open={props.isOpen}
	role="dialog"
	aria-label="Execution logs sidebar"
	aria-modal="true"
	tabindex="-1"
	onkeydown={handleKeydown}
>
	<!-- Header -->
	<div class="logs-sidebar__header">
		<div class="logs-sidebar__title-section">
			<h2 class="logs-sidebar__title">
				{#if props.selectedNode}
					Logs: {props.selectedNode.data.label}
				{:else}
					Execution Logs
				{/if}
			</h2>
			{#if props.logs.length > 0}
				<div class="logs-sidebar__count" title="Total log entries">
					<Icon icon="mdi:file-document-outline" />
					{props.logs.length}
				</div>
			{/if}
		</div>
		<button
			class="logs-sidebar__close-btn"
			onclick={handleClose}
			title="Close logs sidebar (Esc)"
			aria-label="Close logs sidebar"
		>
			<Icon icon="mdi:close" />
		</button>
	</div>

	<!-- Content -->
	<div class="logs-sidebar__content">
		<!-- Logs List -->
		{#if filteredLogs().length > 0}
			<div class="logs-sidebar__logs" bind:this={logsContainer}>
				{#each filteredLogs() as log, index (index)}
					<div
						class="logs-sidebar__log-entry"
						class:logs-sidebar__log-entry--error={log.level === 'error'}
						class:logs-sidebar__log-entry--warning={log.level === 'warning'}
						class:logs-sidebar__log-entry--success={log.level === 'success'}
						class:logs-sidebar__log-entry--info={log.level === 'info'}
					>
						<div class="logs-sidebar__log-header">
							<div class="logs-sidebar__log-level">
								<Icon
									icon={getLogLevelIcon(log.level)}
									style="color: {getLogLevelColor(log.level)}"
								/>
								<span class="logs-sidebar__log-level-text">{log.level.toUpperCase()}</span>
							</div>
							<div class="logs-sidebar__log-timestamp">
								{formatTimestamp(log.timestamp)}
							</div>
						</div>
						<div class="logs-sidebar__log-message">
							{log.message}
						</div>
						{#if log.nodeId}
							<div class="logs-sidebar__log-node">
								<Icon icon="mdi:graph" />
								Node: {log.nodeId}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="logs-sidebar__empty">
				<Icon icon="mdi:file-document-outline" class="logs-sidebar__empty-icon" />
				<p class="logs-sidebar__empty-text">
					{#if props.selectedNode}
						No logs available for this node
					{:else}
						No execution logs yet
					{/if}
				</p>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="logs-sidebar__footer">
		<div class="logs-sidebar__actions">
			<button
				type="button"
				class="logs-sidebar__btn logs-sidebar__btn--secondary"
				onclick={clearLogs}
				disabled={props.logs.length === 0}
			>
				<Icon icon="mdi:delete" />
				Clear
			</button>
			<button
				type="button"
				class="logs-sidebar__btn logs-sidebar__btn--outline"
				onclick={exportLogs}
				disabled={props.logs.length === 0}
			>
				<Icon icon="mdi:download" />
				Export
			</button>
		</div>

		{#if props.logs.length > 0}
			<p class="logs-sidebar__info-text">
				{filteredLogs().length} of {props.logs.length} log entries
			</p>
		{/if}
	</div>
</div>

<style>
	.logs-sidebar {
		position: fixed;
		top: var(--fd-navbar-height); /* Start below navbar */
		right: 0;
		width: 400px;
		height: calc(100vh - var(--fd-navbar-height)); /* Account for navbar height */
		background-color: #ffffff;
		border-left: 1px solid #e5e7eb;
		box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
		transform: translateX(100%);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: -1;
		display: flex;
		flex-direction: column;
		pointer-events: none;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.logs-sidebar {
			width: 100vw;
			border-left: none;
		}
	}

	@media (max-width: 480px) {
		.logs-sidebar {
			width: 100vw;
		}
	}

	.logs-sidebar--open {
		transform: translateX(0);
		z-index: 999;
		pointer-events: auto;
	}

	/* Prevent body scroll when sidebar is open */
	:global(body:has(.logs-sidebar--open)) {
		overflow: hidden;
	}

	.logs-sidebar__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #f9fafb;
		flex-shrink: 0;
	}

	.logs-sidebar__title-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logs-sidebar__title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.logs-sidebar__count {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
		background-color: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
	}

	.logs-sidebar__close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		background: transparent;
		color: #6b7280;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: all 0.2s ease-in-out;
	}

	.logs-sidebar__close-btn:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	.logs-sidebar__content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.logs-sidebar__logs {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.logs-sidebar__log-entry {
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		padding: 0.75rem;
		transition: all var(--fd-transition-fast);
	}

	.logs-sidebar__log-entry--error {
		border-left: 4px solid var(--fd-error);
		background-color: var(--fd-error-muted);
	}

	.logs-sidebar__log-entry--warning {
		border-left: 4px solid var(--fd-warning);
		background-color: var(--fd-warning-muted);
	}

	.logs-sidebar__log-entry--success {
		border-left: 4px solid var(--fd-success);
		background-color: var(--fd-success-muted);
	}

	.logs-sidebar__log-entry--info {
		border-left: 4px solid var(--fd-info);
		background-color: var(--fd-info-muted);
	}

	.logs-sidebar__log-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.logs-sidebar__log-level {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.logs-sidebar__log-level-text {
		font-size: 0.75rem;
		font-weight: 600;
	}

	.logs-sidebar__log-timestamp {
		font-size: 0.75rem;
		color: #6b7280;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.logs-sidebar__log-message {
		font-size: 0.875rem;
		color: #374151;
		line-height: 1.5;
		margin-bottom: 0.5rem;
		word-break: break-word;
	}

	.logs-sidebar__log-node {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
		background-color: #ffffff;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid #e5e7eb;
		width: fit-content;
	}

	.logs-sidebar__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
	}

	:global(.logs-sidebar__empty-icon) {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.logs-sidebar__empty-text {
		font-size: 0.875rem;
		margin: 0;
	}

	.logs-sidebar__footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid #e5e7eb;
		background-color: #f9fafb;
		flex-shrink: 0;
	}

	.logs-sidebar__actions {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.logs-sidebar__btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		flex: 1;
		justify-content: center;
	}

	.logs-sidebar__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.logs-sidebar__btn--secondary {
		background-color: #ef4444;
		border-color: #ef4444;
		color: #ffffff;
	}

	.logs-sidebar__btn--secondary:hover:not(:disabled) {
		background-color: #dc2626;
		border-color: #dc2626;
	}

	.logs-sidebar__btn--outline {
		background-color: transparent;
		border-color: #d1d5db;
		color: #374151;
	}

	.logs-sidebar__btn--outline:hover:not(:disabled) {
		background-color: #f3f4f6;
		border-color: #9ca3af;
	}

	.logs-sidebar__info-text {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0;
		text-align: center;
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.logs-sidebar {
			width: 100vw;
		}
	}

	@media (max-width: 480px) {
		.logs-sidebar__header,
		.logs-sidebar__content,
		.logs-sidebar__footer {
			padding-left: 1rem;
			padding-right: 1rem;
		}
	}
</style>

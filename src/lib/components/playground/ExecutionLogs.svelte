<!--
  ExecutionLogs Component
  
  Collapsible panel for displaying execution logs in the playground.
  Shows real-time log entries with filtering and export capabilities.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';
	import type { PlaygroundMessage, PlaygroundMessageLevel } from '../../types/playground.js';
	import { logMessages } from '../../stores/playgroundStore.js';

	/**
	 * Component props
	 */
	interface Props {
		/** Whether the logs panel is expanded */
		isExpanded?: boolean;
		/** Maximum height of the logs panel */
		maxHeight?: string;
		/** Callback when expansion state changes */
		onToggle?: (expanded: boolean) => void;
	}

	let { isExpanded = $bindable(false), maxHeight = '300px', onToggle }: Props = $props();

	/** Current log level filter */
	let levelFilter = $state<PlaygroundMessageLevel | 'all'>('all');

	/** Reference to logs container for auto-scroll */
	let logsContainer = $state<HTMLDivElement>();

	/**
	 * Filter logs based on selected level
	 */
	const filteredLogs = $derived(
		levelFilter === 'all'
			? $logMessages
			: $logMessages.filter((log) => log.metadata?.level === levelFilter)
	);

	/**
	 * Count of logs by level
	 */
	const logCounts = $derived({
		all: $logMessages.length,
		info: $logMessages.filter((l) => l.metadata?.level === 'info').length,
		warning: $logMessages.filter((l) => l.metadata?.level === 'warning').length,
		error: $logMessages.filter((l) => l.metadata?.level === 'error').length,
		debug: $logMessages.filter((l) => l.metadata?.level === 'debug').length
	});

	/**
	 * Toggle expansion
	 */
	function toggleExpanded(): void {
		isExpanded = !isExpanded;
		onToggle?.(isExpanded);
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
	 * Get icon for log level
	 */
	function getLevelIcon(level: PlaygroundMessageLevel | undefined): string {
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
	 * Export logs to file
	 */
	function exportLogs(): void {
		const logText = filteredLogs
			.map(
				(log) =>
					`[${formatTimestamp(log.timestamp)}] [${(log.metadata?.level ?? 'info').toUpperCase()}] ${log.content}${log.nodeId ? ` (Node: ${log.nodeId})` : ''}`
			)
			.join('\n');

		const blob = new Blob([logText], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `playground-logs-${new Date().toISOString().split('T')[0]}.txt`;
		link.click();
		URL.revokeObjectURL(url);
	}

	/**
	 * Auto-scroll to bottom when new logs arrive
	 */
	$effect(() => {
		if (isExpanded && logsContainer && filteredLogs.length > 0) {
			logsContainer.scrollTop = logsContainer.scrollHeight;
		}
	});
</script>

<div class="execution-logs" class:execution-logs--expanded={isExpanded}>
	<!-- Header -->
	<button
		type="button"
		class="execution-logs__header"
		onclick={toggleExpanded}
		aria-expanded={isExpanded}
	>
		<div class="execution-logs__title">
			<Icon icon="mdi:console" />
			<span>Execution Logs</span>
			{#if logCounts.all > 0}
				<span class="execution-logs__badge">{logCounts.all}</span>
			{/if}
			{#if logCounts.error > 0}
				<span class="execution-logs__badge execution-logs__badge--error">{logCounts.error}</span>
			{/if}
			{#if logCounts.warning > 0}
				<span class="execution-logs__badge execution-logs__badge--warning">{logCounts.warning}</span
				>
			{/if}
		</div>
		<Icon
			icon="mdi:chevron-down"
			class="execution-logs__chevron {isExpanded ? 'execution-logs__chevron--expanded' : ''}"
		/>
	</button>

	<!-- Content -->
	{#if isExpanded}
		<div class="execution-logs__content" transition:slide={{ duration: 200 }}>
			<!-- Toolbar -->
			<div class="execution-logs__toolbar">
				<div class="execution-logs__filters">
					<button
						type="button"
						class="execution-logs__filter"
						class:execution-logs__filter--active={levelFilter === 'all'}
						onclick={() => (levelFilter = 'all')}
					>
						All ({logCounts.all})
					</button>
					<button
						type="button"
						class="execution-logs__filter execution-logs__filter--info"
						class:execution-logs__filter--active={levelFilter === 'info'}
						onclick={() => (levelFilter = 'info')}
					>
						Info ({logCounts.info})
					</button>
					<button
						type="button"
						class="execution-logs__filter execution-logs__filter--warning"
						class:execution-logs__filter--active={levelFilter === 'warning'}
						onclick={() => (levelFilter = 'warning')}
					>
						Warning ({logCounts.warning})
					</button>
					<button
						type="button"
						class="execution-logs__filter execution-logs__filter--error"
						class:execution-logs__filter--active={levelFilter === 'error'}
						onclick={() => (levelFilter = 'error')}
					>
						Error ({logCounts.error})
					</button>
				</div>
				<button
					type="button"
					class="execution-logs__export"
					onclick={exportLogs}
					disabled={filteredLogs.length === 0}
					title="Export logs"
				>
					<Icon icon="mdi:download" />
				</button>
			</div>

			<!-- Logs List -->
			<div class="execution-logs__list" bind:this={logsContainer} style="max-height: {maxHeight}">
				{#if filteredLogs.length === 0}
					<div class="execution-logs__empty">
						<Icon icon="mdi:file-document-outline" />
						<span>No logs to display</span>
					</div>
				{:else}
					{#each filteredLogs as log (log.id)}
						<div
							class="execution-logs__entry"
							class:execution-logs__entry--error={log.metadata?.level === 'error'}
							class:execution-logs__entry--warning={log.metadata?.level === 'warning'}
							class:execution-logs__entry--debug={log.metadata?.level === 'debug'}
						>
							<span class="execution-logs__entry-time">
								{formatTimestamp(log.timestamp)}
							</span>
							<span class="execution-logs__entry-level">
								<Icon icon={getLevelIcon(log.metadata?.level)} />
							</span>
							<span class="execution-logs__entry-content">
								{log.content}
							</span>
							{#if log.nodeId}
								<span class="execution-logs__entry-node" title="Node: {log.nodeId}">
									{log.metadata?.nodeLabel ?? log.nodeId}
								</span>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.execution-logs {
		border-top: 1px solid #e2e8f0;
		background-color: #f8fafc;
	}

	/* Header */
	.execution-logs__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;
	}

	.execution-logs__header:hover {
		background-color: #f1f5f9;
	}

	.execution-logs__title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #475569;
	}

	.execution-logs__badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.375rem;
		border-radius: 0.625rem;
		font-size: 0.6875rem;
		font-weight: 600;
		background-color: #e2e8f0;
		color: #475569;
	}

	.execution-logs__badge--error {
		background-color: #fee2e2;
		color: #dc2626;
	}

	.execution-logs__badge--warning {
		background-color: #fef3c7;
		color: #d97706;
	}

	:global(.execution-logs__chevron) {
		transition: transform 0.2s ease-in-out;
		color: #94a3b8;
	}

	:global(.execution-logs__chevron--expanded) {
		transform: rotate(180deg);
	}

	/* Content */
	.execution-logs__content {
		border-top: 1px solid #e2e8f0;
	}

	/* Toolbar */
	.execution-logs__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background-color: #ffffff;
		border-bottom: 1px solid #e2e8f0;
	}

	.execution-logs__filters {
		display: flex;
		gap: 0.25rem;
	}

	.execution-logs__filter {
		padding: 0.25rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: transparent;
		font-size: 0.75rem;
		color: #64748b;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.execution-logs__filter:hover {
		background-color: #f1f5f9;
	}

	.execution-logs__filter--active {
		background-color: #e2e8f0;
		color: #1e293b;
		font-weight: 500;
	}

	.execution-logs__filter--info.execution-logs__filter--active {
		background-color: #dbeafe;
		color: #1d4ed8;
	}

	.execution-logs__filter--warning.execution-logs__filter--active {
		background-color: #fef3c7;
		color: #b45309;
	}

	.execution-logs__filter--error.execution-logs__filter--active {
		background-color: #fee2e2;
		color: #dc2626;
	}

	.execution-logs__export {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.375rem;
		background: #ffffff;
		color: #64748b;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.execution-logs__export:hover:not(:disabled) {
		background-color: #f1f5f9;
		color: #1e293b;
	}

	.execution-logs__export:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Logs List */
	.execution-logs__list {
		overflow-y: auto;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.execution-logs__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2rem;
		color: #94a3b8;
	}

	.execution-logs__entry {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.375rem 1rem;
		border-bottom: 1px solid #f1f5f9;
		background-color: #ffffff;
	}

	.execution-logs__entry:hover {
		background-color: #f8fafc;
	}

	.execution-logs__entry--error {
		background-color: #fef2f2;
	}

	.execution-logs__entry--error:hover {
		background-color: #fee2e2;
	}

	.execution-logs__entry--warning {
		background-color: #fffbeb;
	}

	.execution-logs__entry--warning:hover {
		background-color: #fef3c7;
	}

	.execution-logs__entry--debug {
		color: #7c3aed;
	}

	.execution-logs__entry-time {
		flex-shrink: 0;
		color: #94a3b8;
	}

	.execution-logs__entry-level {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.execution-logs__entry--error .execution-logs__entry-level {
		color: #dc2626;
	}

	.execution-logs__entry--warning .execution-logs__entry-level {
		color: #d97706;
	}

	.execution-logs__entry--debug .execution-logs__entry-level {
		color: #7c3aed;
	}

	.execution-logs__entry-content {
		flex: 1;
		min-width: 0;
		word-break: break-word;
		color: #334155;
	}

	.execution-logs__entry-node {
		flex-shrink: 0;
		padding: 0.125rem 0.375rem;
		background-color: #f1f5f9;
		border-radius: 0.25rem;
		color: #64748b;
		font-size: 0.6875rem;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.execution-logs__filters {
			flex-wrap: wrap;
		}

		.execution-logs__entry {
			flex-wrap: wrap;
		}

		.execution-logs__entry-node {
			margin-left: auto;
		}
	}
</style>

<!--
  Node Status Overlay Component
  Universal status indicator that can be overlaid on any node type
  Displays execution status, count, and other execution information
  Styled with BEM syntax
-->

<script lang="ts">
	import type { NodeExecutionInfo } from '../types/index.js';
	import Icon from '@iconify/svelte';
	import StatusLabel from './StatusLabel.svelte';
	import {
		getStatusColor,
		getStatusIcon,
		getStatusLabel,
		getStatusBackgroundColor,
		formatExecutionDuration,
		formatLastExecuted
	} from '../utils/nodeStatus.js';

	interface Props {
		nodeId: string;
		executionInfo?: NodeExecutionInfo;
		position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
		size?: 'sm' | 'md' | 'lg';
		showDetails?: boolean;
	}

	let props: Props = $props();

	// Default values
	let position = $state(props.position || 'top-right');
	let size = $state(props.size || 'md');
	let showDetails = $state(props.showDetails || false);
	let isHovered = $state(false);

	// Size configurations - optimized for larger, centered overlay
	const sizeConfig = {
		sm: {
			statusSize: '18px',
			iconSize: '10px',
			labelSize: '0.75rem',
			padding: '6px 12px'
		},
		md: {
			statusSize: '24px',
			iconSize: '14px',
			labelSize: '0.875rem',
			padding: '8px 16px'
		},
		lg: {
			statusSize: '28px',
			iconSize: '16px',
			labelSize: '1rem',
			padding: '10px 20px'
		}
	};

	const config = sizeConfig[size];

	// Position styles - horizontal center aligned with top edge of node
	const positionStyles = {
		'top-left': 'top: -24px; left: 50%; transform: translateX(-50%);',
		'top-right': 'top: -24px; left: 50%; transform: translateX(-50%);',
		'bottom-left': 'top: -24px; left: 50%; transform: translateX(-50%);',
		'bottom-right': 'top: -24px; left: 50%; transform: translateX(-50%);'
	};

	// Get execution info or default
	let executionInfo = $derived(
		props.executionInfo || {
			status: 'idle' as const,
			executionCount: 0,
			isExecuting: false
		}
	);

	// Show overlay if there's meaningful status information
	let shouldShow = $derived(
		executionInfo.status !== 'idle' || executionInfo.executionCount > 0 || executionInfo.isExecuting
	);
</script>

{#if shouldShow}
	<div
		class="node-status-overlay"
		class:node-status-overlay--hovered={isHovered}
		class:node-status-overlay--top-left={true}
		class:node-status-overlay--sm={size === 'sm'}
		class:node-status-overlay--md={size === 'md'}
		class:node-status-overlay--lg={size === 'lg'}
		style="
			{positionStyles[position]}
			--status-size: {config.statusSize};
			--label-size: {config.labelSize};
			--icon-size: {config.iconSize};
			--padding: {config.padding};
		"
		onmouseenter={() => (isHovered = true)}
		onmouseleave={() => (isHovered = false)}
		title="{getStatusLabel(executionInfo.status)} - Executed {executionInfo.executionCount} times"
		role="status"
		aria-label="Node execution status: {getStatusLabel(executionInfo.status)}"
	>
		<!-- Status Display: [icon] [label] -->
		<div
			class="node-status-overlay__status-display"
			style="background-color: {getStatusBackgroundColor(executionInfo.status)}"
		>
			<div
				class="node-status-overlay__status-icon"
				style="background-color: {getStatusColor(executionInfo.status)}"
			>
				<Icon icon={getStatusIcon(executionInfo.status)} class="node-status-overlay__icon" />
			</div>
			<StatusLabel
				label={getStatusLabel(executionInfo.status)}
				class="node-status-overlay__label"
			/>
		</div>

		<!-- Execution Count Badge -->
		{#if executionInfo.executionCount > 0}
			<div class="node-status-overlay__count">
				{executionInfo.executionCount}
			</div>
		{/if}

		<!-- Detailed Information (shown on hover) -->
		{#if showDetails && isHovered}
			<div class="node-status-overlay__details">
				<div class="node-status-overlay__detail-item">
					<span class="node-status-overlay__detail-label">Status:</span>
					<span class="node-status-overlay__detail-value"
						>{getStatusLabel(executionInfo.status)}</span
					>
				</div>
				<div class="node-status-overlay__detail-item">
					<span class="node-status-overlay__detail-label">Executions:</span>
					<span class="node-status-overlay__detail-value">{executionInfo.executionCount}</span>
				</div>
				{#if executionInfo.lastExecuted}
					<div class="node-status-overlay__detail-item">
						<span class="node-status-overlay__detail-label">Last Run:</span>
						<span class="node-status-overlay__detail-value"
							>{formatLastExecuted(executionInfo.lastExecuted)}</span
						>
					</div>
				{/if}
				{#if executionInfo.lastExecutionDuration}
					<div class="node-status-overlay__detail-item">
						<span class="node-status-overlay__detail-label">Duration:</span>
						<span class="node-status-overlay__detail-value"
							>{formatExecutionDuration(executionInfo.lastExecutionDuration)}</span
						>
					</div>
				{/if}
				{#if executionInfo.lastError}
					<div class="node-status-overlay__detail-item node-status-overlay__detail-item--error">
						<span class="node-status-overlay__detail-label">Error:</span>
						<span class="node-status-overlay__detail-value">{executionInfo.lastError}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.node-status-overlay {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		z-index: 1000;
		pointer-events: none;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		height: 48px;
		width: auto;
		min-width: 120px;
	}

	.node-status-overlay--hovered {
		pointer-events: auto;
		transform: translateY(-2px);
	}

	.node-status-overlay--hovered .node-status-overlay__status-display {
		box-shadow:
			0 8px 25px -5px rgba(0, 0, 0, 0.15),
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
		transform: scale(1.02);
	}

	.node-status-overlay__status-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 1rem;
		padding: 0.5rem 1rem;
		box-shadow:
			0 6px 12px -2px rgba(0, 0, 0, 0.15),
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		height: 48px;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		width: 100%;
		justify-content: flex-start;
		overflow: hidden;
	}

	.node-status-overlay__status-icon {
		width: 48px;
		height: 48px;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		flex-shrink: 0;
		position: relative;
		margin: -0.5rem 0.5rem -0.5rem -1rem;
	}

	.node-status-overlay__count {
		background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
		color: #1f2937;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-radius: 0.75rem;
		padding: var(--padding);
		font-size: var(--label-size);
		font-weight: 700;
		min-width: 2rem;
		text-align: center;
		line-height: 1;
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.15),
			inset 0 1px 0 rgba(255, 255, 255, 0.3);
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.node-status-overlay__details {
		position: absolute;
		top: 100%;
		right: 0;
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		min-width: 200px;
		z-index: 1001;
		pointer-events: auto;
	}

	.node-status-overlay__detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.node-status-overlay__detail-item:last-child {
		margin-bottom: 0;
	}

	.node-status-overlay__detail-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
	}

	.node-status-overlay__detail-value {
		font-size: 0.75rem;
		font-weight: 600;
		color: #374151;
		text-align: right;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.node-status-overlay__detail-item--error .node-status-overlay__detail-value {
		color: #ef4444;
	}

	/* Size variants */
	.node-status-overlay--sm {
		gap: 0.125rem;
	}

	.node-status-overlay--md {
		gap: 0.25rem;
	}

	.node-status-overlay--lg {
		gap: 0.375rem;
	}

	/* Animation for running status */
	.node-status-overlay__status-icon[style*='running'] {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>

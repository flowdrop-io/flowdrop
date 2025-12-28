<!--
  Terminal Node Component
  A circular node for workflow terminal points (start, end, exit/abort)
  Configurable via metadata to display different variants:
  - start: Green with play icon, output-only
  - end: Gray with stop icon, input-only  
  - exit: Red with X icon, input-only (for abort/error exits)
  Styled with BEM syntax
-->

<script lang="ts">
	import { Position, Handle } from "@xyflow/svelte";
	import type { ConfigValues, NodeMetadata } from "../types/index.js";
	import Icon from "@iconify/svelte";
	import { getDataTypeColor } from "$lib/utils/colors.js";

	/**
	 * Terminal node variant types
	 */
	type TerminalVariant = "start" | "end" | "exit";

	/**
	 * Configuration for each terminal variant
	 */
	interface VariantConfig {
		/** Default icon for this variant */
		icon: string;
		/** Default color for this variant */
		color: string;
		/** Default label for this variant */
		label: string;
		/** Whether this variant has input handles */
		hasInputs: boolean;
		/** Whether this variant has output handles */
		hasOutputs: boolean;
	}

	/**
	 * Variant configurations mapping
	 */
	const VARIANT_CONFIGS: Record<TerminalVariant, VariantConfig> = {
		start: {
			icon: "mdi:play-circle",
			color: "#10b981",
			label: "Start",
			hasInputs: false,
			hasOutputs: true
		},
		end: {
			icon: "mdi:stop-circle",
			color: "#6b7280",
			label: "End",
			hasInputs: true,
			hasOutputs: false
		},
		exit: {
			icon: "mdi:close-circle",
			color: "#ef4444",
			label: "Exit",
			hasInputs: true,
			hasOutputs: false
		}
	};

	const props = $props<{
		data: {
			label: string;
			config: ConfigValues;
			metadata: NodeMetadata;
			nodeId?: string;
			onConfigOpen?: (node: {
				id: string;
				type: string;
				data: { label: string; config: ConfigValues; metadata: NodeMetadata };
			}) => void;
		};
		selected?: boolean;
		isProcessing?: boolean;
		isError?: boolean;
	}>();

	/**
	 * Determine terminal variant from config or metadata
	 * Priority: config.variant > metadata tag detection > default to "start"
	 */
	function getVariant(): TerminalVariant {
		// Check config first
		const configVariant = props.data.config?.variant as string | undefined;
		if (configVariant && configVariant in VARIANT_CONFIGS) {
			return configVariant as TerminalVariant;
		}

		// Check metadata tags for variant hints
		const tags = props.data.metadata?.tags || [];
		if (tags.includes("start") || tags.includes("entry")) {
			return "start";
		}
		if (tags.includes("exit") || tags.includes("abort") || tags.includes("error")) {
			return "exit";
		}
		if (tags.includes("end") || tags.includes("finish") || tags.includes("complete")) {
			return "end";
		}

		// Check metadata id/name for hints
		const idLower = (props.data.metadata?.id || "").toLowerCase();
		const nameLower = (props.data.metadata?.name || "").toLowerCase();
		if (idLower.includes("start") || nameLower.includes("start")) {
			return "start";
		}
		if (idLower.includes("exit") || idLower.includes("abort") || nameLower.includes("exit") || nameLower.includes("abort")) {
			return "exit";
		}
		if (idLower.includes("end") || nameLower.includes("end")) {
			return "end";
		}

		// Default to start
		return "start";
	}

	let variant = $derived(getVariant());

	/**
	 * Get current variant configuration
	 */
	let variantConfig = $derived(VARIANT_CONFIGS[variant]);

	/**
	 * Get icon - prioritize metadata/config over variant default
	 */
	let terminalIcon = $derived(
		(props.data.metadata?.icon as string) ||
		(props.data.config?.icon as string) ||
		variantConfig.icon
	);

	/**
	 * Get color - prioritize metadata/config over variant default
	 */
	let terminalColor = $derived(
		(props.data.metadata?.color as string) ||
		(props.data.config?.color as string) ||
		variantConfig.color
	);

	/**
	 * Get display label
	 */
	let displayLabel = $derived(
		props.data.label || 
		props.data.metadata?.name || 
		variantConfig.label
	);

	/**
	 * Check if metadata explicitly defines inputs (including empty array)
	 * This allows API to control ports:
	 * - undefined: use variant default
	 * - []: explicitly no inputs
	 * - [{...}]: use these inputs
	 */
	let hasExplicitInputs = $derived(Array.isArray(props.data.metadata?.inputs));

	/**
	 * Check if metadata explicitly defines outputs (including empty array)
	 */
	let hasExplicitOutputs = $derived(Array.isArray(props.data.metadata?.outputs));

	/**
	 * Default trigger input port for end/exit nodes
	 */
	const DEFAULT_INPUT_PORT = {
		id: "trigger",
		name: "Trigger",
		type: "input" as const,
		dataType: "trigger",
		description: "Workflow trigger input"
	};

	/**
	 * Default trigger output port for start nodes
	 */
	const DEFAULT_OUTPUT_PORT = {
		id: "trigger",
		name: "Trigger",
		type: "output" as const,
		dataType: "trigger",
		description: "Workflow trigger output"
	};

	/**
	 * Get input ports from metadata or create default trigger input
	 * Priority:
	 * 1. If metadata.inputs is defined (even empty array), use it exactly
	 * 2. Otherwise, use variant default (trigger port for end/exit)
	 */
	let inputPorts = $derived(
		hasExplicitInputs
			? props.data.metadata.inputs
			: variantConfig.hasInputs
				? [DEFAULT_INPUT_PORT]
				: []
	);

	/**
	 * Get output ports from metadata or create default trigger output
	 * Priority:
	 * 1. If metadata.outputs is defined (even empty array), use it exactly
	 * 2. Otherwise, use variant default (trigger port for start)
	 */
	let outputPorts = $derived(
		hasExplicitOutputs
			? props.data.metadata.outputs
			: variantConfig.hasOutputs
				? [DEFAULT_OUTPUT_PORT]
				: []
	);

	/**
	 * Determine if we should show inputs based on ports
	 */
	let showInputs = $derived(inputPorts.length > 0);

	/**
	 * Determine if we should show outputs based on ports
	 */
	let showOutputs = $derived(outputPorts.length > 0);

	/**
	 * Handle configuration sidebar - using global ConfigSidebar
	 */
	function openConfigSidebar(): void {
		if (props.data.onConfigOpen) {
			const nodeForConfig = {
				id: props.data.nodeId || "unknown",
				type: "terminal",
				data: props.data
			};
			props.data.onConfigOpen(nodeForConfig);
		}
	}

	/**
	 * Handle double-click to open config
	 */
	function handleDoubleClick(): void {
		openConfigSidebar();
	}

	/**
	 * Handle single click - only handle selection
	 */
	function handleClick(): void {
		// Node selection is handled by Svelte Flow
	}

	/**
	 * Handle keyboard events for accessibility
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleDoubleClick();
		}
	}
</script>

<!-- Terminal Node -->
<div
	class="flowdrop-terminal-node"
	class:flowdrop-terminal-node--selected={props.selected}
	class:flowdrop-terminal-node--processing={props.isProcessing}
	class:flowdrop-terminal-node--error={props.isError}
	class:flowdrop-terminal-node--start={variant === "start"}
	class:flowdrop-terminal-node--end={variant === "end"}
	class:flowdrop-terminal-node--exit={variant === "exit"}
	style="--terminal-color: {terminalColor};"
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
	aria-label="{variant} node: {displayLabel}"
>
	<!-- Config button at top -->
	<button
		class="flowdrop-terminal-node__config-btn"
		onclick={openConfigSidebar}
		title="Configure node"
	>
		<Icon icon="mdi:cog" />
	</button>

	<!-- Circle wrapper for proper handle positioning -->
	<div class="flowdrop-terminal-node__circle-wrapper">
		<!-- Input Handles (for end/exit variants) -->
		{#if showInputs}
			{#each inputPorts as port (port.id)}
				<Handle
					type="target"
					position={Position.Left}
					style="background-color: {getDataTypeColor(port.dataType)}; border-color: #ffffff; top: 50%; transform: translateY(-50%); z-index: 30;"
					id={`${props.data.nodeId}-input-${port.id}`}
				/>
			{/each}
		{/if}

		<!-- Circular content with icon -->
		<div class="flowdrop-terminal-node__content">
			<Icon
				icon={terminalIcon}
				class="flowdrop-terminal-node__icon"
				style="color: {terminalColor}; font-size: 2.5rem;"
			/>
		</div>

		<!-- Output Handles (for start variant) -->
		{#if showOutputs}
			{#each outputPorts as port (port.id)}
				<Handle
					type="source"
					position={Position.Right}
					id={`${props.data.nodeId}-output-${port.id}`}
					style="background-color: {getDataTypeColor(port.dataType)}; border-color: #ffffff; top: 50%; transform: translateY(-50%); z-index: 30;"
				/>
			{/each}
		{/if}
	</div>

	<!-- Label below the circle -->
	<div class="flowdrop-terminal-node__label">
		{displayLabel}
	</div>

	<!-- Processing indicator -->
	{#if props.isProcessing}
		<div class="flowdrop-terminal-node__processing">
			<div class="flowdrop-terminal-node__spinner"></div>
		</div>
	{/if}

	<!-- Error indicator -->
	{#if props.isError}
		<div class="flowdrop-terminal-node__error">
			<Icon icon="mdi:alert-circle" class="flowdrop-terminal-node__error-icon" />
		</div>
	{/if}
</div>

<style>
	.flowdrop-terminal-node {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		z-index: 10;
	}

	/* Wrapper for circle and handles - ensures handles are vertically centered to circle */
	.flowdrop-terminal-node__circle-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.flowdrop-terminal-node__content {
		width: 72px;
		height: 72px;
		background-color: #ffffff;
		border: 3px solid var(--terminal-color, #6b7280);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		transition: all 0.2s ease-in-out;
	}

	.flowdrop-terminal-node:hover .flowdrop-terminal-node__content {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		transform: scale(1.05);
	}

	.flowdrop-terminal-node--selected .flowdrop-terminal-node__content {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(59, 130, 246, 0.5);
		border-color: #3b82f6;
	}

	.flowdrop-terminal-node--processing .flowdrop-terminal-node__content {
		opacity: 0.7;
	}

	.flowdrop-terminal-node--error .flowdrop-terminal-node__content {
		border-color: #ef4444 !important;
		background-color: #fef2f2 !important;
	}

	/* Variant-specific glow effects */
	.flowdrop-terminal-node--start .flowdrop-terminal-node__content {
		box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1);
	}

	.flowdrop-terminal-node--start:hover .flowdrop-terminal-node__content {
		box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.15);
	}

	.flowdrop-terminal-node--exit .flowdrop-terminal-node__content {
		box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2), 0 2px 4px -1px rgba(239, 68, 68, 0.1);
	}

	.flowdrop-terminal-node--exit:hover .flowdrop-terminal-node__content {
		box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.15);
	}

	:global(.flowdrop-terminal-node__icon) {
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
	}

	.flowdrop-terminal-node__label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #374151;
		text-align: center;
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background-color: rgba(255, 255, 255, 0.9);
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.flowdrop-terminal-node__processing {
		position: absolute;
		top: 1.5rem;
		right: 0;
	}

	.flowdrop-terminal-node__spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid var(--terminal-color, #6b7280);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.flowdrop-terminal-node__error {
		position: absolute;
		top: 1.5rem;
		right: 0;
		color: #ef4444;
	}

	:global(.flowdrop-terminal-node__error-icon) {
		width: 14px;
		height: 14px;
	}

	/* Config button positioned at top center */
	.flowdrop-terminal-node__config-btn {
		position: absolute;
		top: -1.5rem;
		left: 50%;
		transform: translateX(-50%);
		width: 1.5rem;
		height: 1.5rem;
		background-color: rgba(255, 255, 255, 0.95);
		border: 1px solid #e5e7eb;
		border-radius: 50%;
		color: #6b7280;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: all 0.2s ease-in-out;
		backdrop-filter: blur(4px);
		z-index: 15;
		font-size: 0.75rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.flowdrop-terminal-node:hover .flowdrop-terminal-node__config-btn {
		opacity: 1;
	}

	.flowdrop-terminal-node__config-btn:hover {
		background-color: #f9fafb;
		border-color: #d1d5db;
		color: #374151;
		transform: translateX(-50%) scale(1.1);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Handle styles - positioned relative to circle wrapper */
	:global(.flowdrop-terminal-node__circle-wrapper .svelte-flow__handle) {
		width: 16px !important;
		height: 16px !important;
		border-radius: 50% !important;
		border: 2px solid #ffffff !important;
		transition: all 0.2s ease-in-out !important;
		cursor: pointer !important;
		z-index: 20 !important;
		pointer-events: auto !important;
	}

	:global(.flowdrop-terminal-node__circle-wrapper .svelte-flow__handle-left) {
		left: -8px !important;
	}

	:global(.flowdrop-terminal-node__circle-wrapper .svelte-flow__handle-right) {
		right: -8px !important;
	}

	:global(.flowdrop-terminal-node__circle-wrapper .svelte-flow__handle:hover) {
		transform: translateY(-50%) scale(1.2) !important;
	}

	:global(.flowdrop-terminal-node__circle-wrapper .svelte-flow__handle:focus) {
		outline: 2px solid #3b82f6 !important;
		outline-offset: 2px !important;
	}

	/* Also keep node-level handle styles for fallback */
	:global(.svelte-flow__node-terminal .svelte-flow__handle) {
		width: 16px !important;
		height: 16px !important;
		border-radius: 50% !important;
		border: 2px solid #ffffff !important;
		transition: all 0.2s ease-in-out !important;
		cursor: pointer !important;
		z-index: 20 !important;
		pointer-events: auto !important;
	}

	:global(.svelte-flow__node-terminal .svelte-flow__handle-left) {
		left: -8px !important;
	}

	:global(.svelte-flow__node-terminal .svelte-flow__handle-right) {
		right: -8px !important;
	}

	:global(.svelte-flow__node-terminal .svelte-flow__handle:hover) {
		transform: translateY(-50%) scale(1.2) !important;
	}

	:global(.svelte-flow__node-terminal .svelte-flow__handle:focus) {
		outline: 2px solid #3b82f6 !important;
		outline-offset: 2px !important;
	}
</style>


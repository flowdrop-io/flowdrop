<!--
  ConfigPanel Component
  A generic panel for displaying details and configuration
  Can be used for node config, workflow settings, or any entity with an ID
  Accepts a slot for custom form content
  Styled with BEM syntax
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import ReadOnlyDetails from './ReadOnlyDetails.svelte';

	/**
	 * A single detail item with label and value
	 */
	interface DetailItem {
		/** The label to display */
		label: string;
		/** The value to display */
		value: string;
	}

	/**
	 * Props interface for ConfigPanel component
	 */
	interface Props {
		/** Panel title displayed in the header */
		title: string;
		/** Unique identifier to display with copy button */
		id?: string;
		/** Optional description text */
		description?: string;
		/** Array of label-value pairs to display */
		details?: DetailItem[];
		/** Title for the configuration section */
		configTitle?: string;
		/** Callback function when the panel is closed */
		onClose: () => void;
		/** Slot content for the configuration form */
		children?: Snippet;
	}

	const {
		title,
		id,
		description,
		details = [],
		configTitle = 'Configuration',
		onClose,
		children
	}: Props = $props();

	/**
	 * Check if details section should be shown
	 */
	const hasDetails = $derived(id !== undefined || details.length > 0 || description !== undefined);
</script>

<div class="config-panel">
	<!-- Header -->
	<div class="config-panel__header">
		<h2 class="config-panel__title">{title}</h2>
		<button class="config-panel__close" onclick={onClose} aria-label="Close panel"> × </button>
	</div>

	<!-- Details Section (between header and content) -->
	{#if hasDetails && id}
		<div class="config-panel__details">
			<ReadOnlyDetails {id} {description} {details} />
		</div>
	{/if}

	<!-- Content -->
	<div class="config-panel__content">
		{#if children}
			<div class="config-panel__section">
				<h3 class="config-panel__section-title">{configTitle}</h3>
				{@render children()}
			</div>
		{/if}
	</div>
</div>

<style>
	.config-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
		background-color: #ffffff;
	}

	.config-panel__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #f9fafb;
		flex-shrink: 0;
	}

	.config-panel__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.config-panel__close {
		background: none;
		border: none;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition:
			color 0.15s,
			background-color 0.15s;
	}

	.config-panel__close:hover {
		color: #374151;
		background-color: #f3f4f6;
	}

	.config-panel__details {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #f3f4f6;
		background-color: #fafafa;
		flex-shrink: 0;
	}

	.config-panel__content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.config-panel__section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.config-panel__section-title {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>

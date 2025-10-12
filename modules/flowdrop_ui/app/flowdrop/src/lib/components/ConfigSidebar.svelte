<!--
  Configuration Sidebar Component
  Right-side sliding sidebar for node configuration
  Styled with BEM syntax
-->

<script lang="ts">
	import type { ConfigSchema, ConfigValues, ConfigProperty } from '../types/index.js';
	import Icon from '@iconify/svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	interface Props {
		isOpen: boolean;
		title: string;
		configSchema?: ConfigSchema;
		configValues: ConfigValues;
		nodeDetails?: {
			type: string;
			category: string;
			description: string;
			version?: string;
			tags?: string[];
			inputs?: Array<{ id: string; name: string; type: string; dataType?: string }>;
			outputs?: Array<{ id: string; name: string; type: string; dataType?: string }>;
		};
		onSave?: (config: ConfigValues) => void;
		onCancel?: () => void;
		onClose?: () => void;
	}

	let props: Props = $props();
	let localConfigValues = $state({ ...props.configValues });
	let hasChanges = $derived(
		JSON.stringify(localConfigValues) !== JSON.stringify(props.configValues)
	);

	// Focus management and body scroll control
	$effect(() => {
		if (props.isOpen) {
			// Focus management - focus the sidebar when it opens
			setTimeout(() => {
				const sidebar = document.querySelector('.config-sidebar--open');
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
	 * Handle input changes for different field types
	 */
	function handleInputChange(key: string, value: unknown, type: string): void {
		let processedValue = value;

		// Process value based on type
		switch (type) {
			case 'number':
			case 'integer':
				processedValue = value === '' ? undefined : Number(value);
				break;
			case 'boolean':
				processedValue = Boolean(value);
				break;
			case 'array':
				try {
					processedValue = typeof value === 'string' ? JSON.parse(value) : value;
				} catch {
					processedValue = [];
				}
				break;
			case 'object':
				try {
					processedValue = typeof value === 'string' ? JSON.parse(value) : value;
				} catch {
					processedValue = {};
				}
				break;
			default:
				processedValue = value;
		}

		localConfigValues = {
			...localConfigValues,
			[key]: processedValue
		};
	}

	/**
	 * Handle save action
	 */
	function handleSave(): void {
		props.onSave?.(localConfigValues);
		dispatch('save', { config: localConfigValues });
	}

	/**
	 * Handle cancel action
	 */
	function handleCancel(): void {
		localConfigValues = { ...props.configValues };
		hasChanges = false;
		props.onCancel?.();
		dispatch('cancel');
	}

	/**
	 * Handle close action
	 */
	function handleClose(): void {
		if (hasChanges) {
			const shouldClose = confirm('You have unsaved changes. Are you sure you want to close?');
			if (!shouldClose) return;
		}

		localConfigValues = { ...props.configValues };
		hasChanges = false;
		props.onClose?.();
		dispatch('close');
	}

	/**
	 * Handle keyboard shortcuts
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			handleClose();
		} else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			handleSave();
		}
	}

	/* Overlay event handlers removed since overlay is no longer used */

	/**
	 * Get input type for HTML input element
	 */
	function getInputType(schemaType: string): string {
		switch (schemaType) {
			case 'number':
			case 'integer':
				return 'number';
			case 'boolean':
				return 'checkbox';
			default:
				return 'text';
		}
	}

	/**
	 * Check if field should be rendered as textarea
	 */
	function isTextarea(property: ConfigProperty): boolean {
		return (
			property.format === 'multiline' || property.type === 'object' || property.type === 'array'
		);
	}

	/**
	 * Get display value for complex types
	 */
	function getDisplayValue(value: unknown, type: string): string {
		if (type === 'object' || type === 'array') {
			return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
		}
		return String(value ?? '');
	}
</script>

<!-- Overlay removed to avoid darkening the canvas -->

<!-- Sidebar -->
<div
	class="config-sidebar"
	class:config-sidebar--open={props.isOpen}
	role="dialog"
	aria-label="Configuration sidebar"
	aria-modal="true"
	tabindex="-1"
	onkeydown={handleKeydown}
>
	<!-- Header -->
	<div class="config-sidebar__header">
		<div class="config-sidebar__title-section">
			<h2 class="config-sidebar__title">{props.title}</h2>
			{#if hasChanges}
				<div class="config-sidebar__changes-indicator" title="Unsaved changes">
					<Icon icon="mdi:circle" />
				</div>
			{/if}
		</div>
		<button
			class="config-sidebar__close-btn"
			onclick={handleClose}
			title="Close sidebar (Esc)"
			aria-label="Close configuration sidebar"
		>
			<Icon icon="mdi:close" />
		</button>
	</div>

	<!-- Content -->
	<div class="config-sidebar__content">
		<!-- Node Details Section -->
		{#if props.nodeDetails}
			<div class="config-sidebar__details">
				<h3 class="config-sidebar__section-title">Node Details</h3>

				<div class="config-sidebar__detail-grid">
					<div class="config-sidebar__detail-item">
						<span class="config-sidebar__detail-label">Type:</span>
						<span class="config-sidebar__detail-value">{props.nodeDetails.type}</span>
					</div>

					<div class="config-sidebar__detail-item">
						<span class="config-sidebar__detail-label">Category:</span>
						<span class="config-sidebar__detail-value config-sidebar__detail-value--badge"
							>{props.nodeDetails.category}</span
						>
					</div>

					{#if props.nodeDetails.version}
						<div class="config-sidebar__detail-item">
							<span class="config-sidebar__detail-label">Version:</span>
							<span class="config-sidebar__detail-value">{props.nodeDetails.version}</span>
						</div>
					{/if}
				</div>

				<div class="config-sidebar__detail-item config-sidebar__detail-item--full">
					<span class="config-sidebar__detail-label">Description:</span>
					<p class="config-sidebar__detail-description">{props.nodeDetails.description}</p>
				</div>

				{#if props.nodeDetails.inputs && props.nodeDetails.inputs.length > 0}
					<div class="config-sidebar__detail-section">
						<h4 class="config-sidebar__detail-subtitle">Input Ports</h4>
						<div class="config-sidebar__ports">
							{#each props.nodeDetails.inputs as input (input.id)}
								<div class="config-sidebar__port config-sidebar__port--input">
									<Icon icon="mdi:arrow-right" class="config-sidebar__port-icon" />
									<span class="config-sidebar__port-name">{input.name}</span>
									<span class="config-sidebar__port-type">{input.dataType || input.type}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if props.nodeDetails.outputs && props.nodeDetails.outputs.length > 0}
					<div class="config-sidebar__detail-section">
						<h4 class="config-sidebar__detail-subtitle">Output Ports</h4>
						<div class="config-sidebar__ports">
							{#each props.nodeDetails.outputs as output (output.id)}
								<div class="config-sidebar__port config-sidebar__port--output">
									<Icon icon="mdi:arrow-left" class="config-sidebar__port-icon" />
									<span class="config-sidebar__port-name">{output.name}</span>
									<span class="config-sidebar__port-type">{output.dataType || output.type}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if props.nodeDetails.tags && props.nodeDetails.tags.length > 0}
					<div class="config-sidebar__detail-section">
						<h4 class="config-sidebar__detail-subtitle">Tags</h4>
						<div class="config-sidebar__tags">
							{#each props.nodeDetails.tags as tag (tag)}
								<span class="config-sidebar__tag">{tag}</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Separator between details and config -->
			{#if props.configSchema?.properties}
				<div class="config-sidebar__separator"></div>
			{/if}
		{/if}

		<!-- Configuration Section -->
		{#if props.configSchema?.properties}
			<div class="config-sidebar__config-section">
				<h3 class="config-sidebar__section-title">Configuration</h3>
				<form
					class="config-sidebar__form"
					onsubmit={(e) => {
						e.preventDefault();
						handleSave();
					}}
				>
					{#each Object.entries(props.configSchema.properties) as [key, property] (key)}
						{#if property.format !== 'hidden'}
							<div class="config-sidebar__field">
								<label class="config-sidebar__label" for="config-{key}">
									{property.title || key}
									{#if props.configSchema?.required?.includes(key)}
										<span class="config-sidebar__required">*</span>
									{/if}
								</label>

							{#if property.description}
								<p class="config-sidebar__description">{property.description}</p>
							{/if}

						{#if property.enum && property.multiple}
							<!-- Checkboxes for enum with multiple selection -->
							<div class="config-sidebar__checkbox-group">
								{#each property.enum as option (option)}
									<div class="config-sidebar__checkbox-wrapper">
										<input
											type="checkbox"
											id="config-{key}-{option}"
											class="config-sidebar__checkbox"
											value={option}
											checked={Array.isArray(localConfigValues[key]) && localConfigValues[key].includes(option)}
											onchange={(e) => {
												const checked = (e.target as HTMLInputElement).checked;
												const currentValues = Array.isArray(localConfigValues[key])
													? [...localConfigValues[key]]
													: [];
												if (checked) {
													if (!currentValues.includes(option)) {
														handleInputChange(key, [...currentValues, option], property.type);
													}
												} else {
													handleInputChange(
														key,
														currentValues.filter((v) => v !== option),
														property.type
													);
												}
											}}
										/>
										<label for="config-{key}-{option}" class="config-sidebar__checkbox-label">
											{option}
										</label>
									</div>
								{/each}
							</div>
						{:else if property.enum}
							<!-- Dropdown for enum with single selection -->
							<select
								id="config-{key}"
								class="config-sidebar__select"
								value={localConfigValues[key] ?? property.default ?? ''}
								onchange={(e) =>
									handleInputChange(key, (e.target as HTMLSelectElement).value, property.type)}
							>
								{#each property.enum as option (option)}
									<option value={option}>{option}</option>
								{/each}
							</select>
						{:else if property.type === 'boolean'}
								<!-- Checkbox for boolean -->
								<div class="config-sidebar__checkbox-wrapper">
									<input
										id="config-{key}"
										type="checkbox"
										class="config-sidebar__checkbox"
										checked={Boolean(localConfigValues[key] ?? property.default ?? false)}
										onchange={(e) =>
											handleInputChange(key, (e.target as HTMLInputElement).checked, property.type)}
									/>
									<label for="config-{key}" class="config-sidebar__checkbox-label">
										{property.title || key}
									</label>
								</div>
							{:else if isTextarea(property)}
								<!-- Textarea for multiline, objects, arrays -->
								<textarea
									id="config-{key}"
									class="config-sidebar__textarea"
									placeholder={property.default ? String(property.default) : ''}
									value={getDisplayValue(
										localConfigValues[key] ?? property.default ?? '',
										property.type
									)}
									oninput={(e) =>
										handleInputChange(key, (e.target as HTMLTextAreaElement).value, property.type)}
									rows="4"
								></textarea>
							{:else}
								<!-- Regular input -->
								<input
									id="config-{key}"
									type={getInputType(property.type)}
									class="config-sidebar__input"
									placeholder={property.default ? String(property.default) : ''}
									value={localConfigValues[key] ?? property.default ?? ''}
									min={property.minimum}
									max={property.maximum}
									step={property.type === 'number' ? 'any' : undefined}
									oninput={(e) =>
										handleInputChange(key, (e.target as HTMLInputElement).value, property.type)}
								/>
							{/if}
						</div>
					{/if}
					{/each}
				</form>
			</div>
		{:else if !props.nodeDetails}
			<div class="config-sidebar__empty">
				<Icon icon="mdi:cog-outline" class="config-sidebar__empty-icon" />
				<p class="config-sidebar__empty-text">No configuration options available</p>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="config-sidebar__footer">
		<div class="config-sidebar__actions">
			<button
				type="button"
				class="config-sidebar__btn config-sidebar__btn--secondary"
				onclick={handleCancel}
				disabled={!hasChanges}
			>
				<Icon icon="mdi:undo" />
				Reset
			</button>
			<button
				type="button"
				class="config-sidebar__btn config-sidebar__btn--primary"
				onclick={handleSave}
				disabled={!hasChanges}
				title="Save configuration (Ctrl+Enter)"
			>
				<Icon icon="mdi:check" />
				Save Changes
			</button>
		</div>

		{#if hasChanges}
			<p class="config-sidebar__changes-text">You have unsaved changes</p>
		{/if}
	</div>
</div>

<style>
	/* Overlay styles removed to avoid darkening the canvas */

	.config-sidebar {
		position: fixed;
		top: var(--flowdrop-navbar-height, 60px); /* Start below navbar */
		right: 0;
		width: 400px;
		height: calc(100vh - var(--flowdrop-navbar-height, 60px)); /* Account for navbar height */
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
		.config-sidebar {
			width: 100vw;
			border-left: none;
		}
	}

	@media (max-width: 480px) {
		.config-sidebar {
			width: 100vw;
		}
	}

	.config-sidebar--open {
		transform: translateX(0);
		z-index: 999;
		pointer-events: auto;
	}

	/* Off-canvas overlay styles removed to avoid darkening the canvas */

	/* Prevent body scroll when sidebar is open */
	:global(body:has(.config-sidebar--open)) {
		overflow: hidden;
	}

	.config-sidebar__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #f9fafb;
		flex-shrink: 0;
	}

	.config-sidebar__title-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.config-sidebar__title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.config-sidebar__changes-indicator {
		color: #f59e0b;
		font-size: 0.5rem;
		animation: pulse 2s infinite;
	}

	.config-sidebar__close-btn {
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

	.config-sidebar__close-btn:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	.config-sidebar__content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		min-height: 0; /* Allow flex item to shrink below content size */
		max-height: calc(
			100vh - var(--flowdrop-navbar-height, 60px) - 200px
		); /* Reserve much more space for header and footer */
	}

	/* Node Details Styles */
	.config-sidebar__details {
		margin-bottom: 1rem;
	}

	.config-sidebar__section-title {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 1rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.config-sidebar__detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.config-sidebar__detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.config-sidebar__detail-item--full {
		grid-column: 1 / -1;
	}

	.config-sidebar__detail-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.config-sidebar__detail-value {
		font-size: 0.875rem;
		color: #374151;
		font-weight: 500;
	}

	.config-sidebar__detail-value--badge {
		background-color: #f3f4f6;
		color: #374151;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		width: fit-content;
		text-transform: capitalize;
	}

	.config-sidebar__detail-description {
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.5;
		margin: 0;
	}

	.config-sidebar__detail-section {
		margin-top: 1rem;
	}

	.config-sidebar__detail-subtitle {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.5rem 0;
	}

	.config-sidebar__ports {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.config-sidebar__port {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background-color: #f9fafb;
		border-radius: 0.375rem;
		border: 1px solid #e5e7eb;
	}

	.config-sidebar__port--input {
		border-left: 3px solid #3b82f6;
	}

	.config-sidebar__port--output {
		border-left: 3px solid #10b981;
	}

	:global(.config-sidebar__port-icon) {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.config-sidebar__port-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		flex: 1;
	}

	.config-sidebar__port-type {
		font-size: 0.75rem;
		color: #6b7280;
		background-color: #ffffff;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		border: 1px solid #d1d5db;
	}

	.config-sidebar__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.config-sidebar__tag {
		font-size: 0.75rem;
		color: #374151;
		background-color: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid #e5e7eb;
	}

	.config-sidebar__separator {
		height: 1px;
		background-color: #e5e7eb;
		margin: 1.5rem 0;
	}

	.config-sidebar__config-section {
		margin-top: 1rem;
	}

	.config-sidebar__form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.config-sidebar__field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.config-sidebar__label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.config-sidebar__required {
		color: #ef4444;
		font-weight: 600;
	}

	.config-sidebar__description {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.4;
	}

	.config-sidebar__input,
	.config-sidebar__select,
	.config-sidebar__textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition:
			border-color 0.2s ease-in-out,
			box-shadow 0.2s ease-in-out;
		background-color: #ffffff;
	}

	.config-sidebar__input:focus,
	.config-sidebar__select:focus,
	.config-sidebar__textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.config-sidebar__textarea {
		resize: vertical;
		min-height: 80px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		line-height: 1.4;
	}

	.config-sidebar__checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.config-sidebar__checkbox-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.config-sidebar__checkbox {
		width: 1rem;
		height: 1rem;
		accent-color: #3b82f6;
		cursor: pointer;
	}

	.config-sidebar__checkbox-label {
		font-size: 0.875rem;
		color: #374151;
		cursor: pointer;
	}

	.config-sidebar__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
	}

	:global(.config-sidebar__empty-icon) {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.config-sidebar__empty-text {
		font-size: 0.875rem;
		margin: 0;
	}

	.config-sidebar__footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid #e5e7eb;
		background-color: #f9fafb;
		flex-shrink: 0;
		position: sticky;
		bottom: 0;
		z-index: 10; /* Ensure footer stays on top */
		height: 80px; /* Increased height for footer */
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		min-height: 80px; /* Ensure minimum height */
	}

	.config-sidebar__actions {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.config-sidebar__btn {
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

	.config-sidebar__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.config-sidebar__btn--primary {
		background-color: #3b82f6;
		border-color: #3b82f6;
		color: #ffffff;
	}

	.config-sidebar__btn--primary:hover:not(:disabled) {
		background-color: #2563eb;
		border-color: #2563eb;
	}

	.config-sidebar__btn--secondary {
		background-color: transparent;
		border-color: #d1d5db;
		color: #374151;
	}

	.config-sidebar__btn--secondary:hover:not(:disabled) {
		background-color: #f3f4f6;
		border-color: #9ca3af;
	}

	.config-sidebar__changes-text {
		font-size: 0.75rem;
		color: #f59e0b;
		margin: 0;
		text-align: center;
		font-weight: 500;
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

	/* Responsive design */
	@media (max-width: 640px) {
		.config-sidebar {
			width: 100vw;
		}
	}

	@media (max-width: 480px) {
		.config-sidebar__header,
		.config-sidebar__content,
		.config-sidebar__footer {
			padding-left: 1rem;
			padding-right: 1rem;
		}
	}
</style>

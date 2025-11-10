<!--
  ConfigForm Component
  Handles dynamic form rendering for node configuration
  Uses reactive $state for proper Svelte 5 reactivity
-->

<script lang="ts">
	import type { ConfigSchema, WorkflowNode } from "$lib/types/index.js"

	interface Props {
		node: WorkflowNode
		onSave: (config: Record<string, unknown>) => void
		onCancel: () => void
	}

	let { node, onSave, onCancel }: Props = $props()

	/**
	 * Get the configuration schema from node metadata
	 */
	const configSchema = $derived(
		node.data.metadata?.configSchema as ConfigSchema | undefined
	)

	/**
	 * Get the current node configuration
	 */
	const nodeConfig = $derived(node.data.config || {})

	/**
	 * Create reactive configuration values using $state
	 * This fixes the Svelte 5 reactivity warnings
	 */
	let configValues = $state<Record<string, unknown>>({})

	/**
	 * Initialize config values when node or schema changes
	 */
	$effect(() => {
		if (configSchema?.properties) {
			const mergedConfig: Record<string, unknown> = {}
			Object.entries(configSchema.properties).forEach(([key, field]) => {
				const fieldConfig = field as any
				// Use existing value if available, otherwise use default
				mergedConfig[key] =
					nodeConfig[key] !== undefined ? nodeConfig[key] : fieldConfig.default
			})
			configValues = mergedConfig
		}
	})

	/**
	 * Handle form submission
	 */
	function handleSave(): void {
		// Collect all form values including hidden fields
		const form = document.querySelector(".flowdrop-config-sidebar__form")
		const updatedConfig: Record<string, unknown> = { ...configValues }

		if (form) {
			const inputs = form.querySelectorAll("input, select, textarea")
			inputs.forEach((input: any) => {
				if (input.id) {
					if (input.type === "checkbox") {
						updatedConfig[input.id] = input.checked
					} else if (input.type === "number") {
						updatedConfig[input.id] = input.value ? Number(input.value) : input.value
					} else if (input.type === "hidden") {
						// Parse hidden field values that might be JSON
						try {
							const parsed = JSON.parse(input.value)
							updatedConfig[input.id] = parsed
						} catch {
							// If not JSON, use raw value
							updatedConfig[input.id] = input.value
						}
					} else {
						updatedConfig[input.id] = input.value
					}
				}
			})
		}

		// Preserve hidden field values from original config if not collected from form
		if (node.data.config && configSchema?.properties) {
			Object.entries(configSchema.properties).forEach(([key, property]: [string, any]) => {
				if (
					property.format === "hidden" &&
					!(key in updatedConfig) &&
					key in node.data.config
				) {
					updatedConfig[key] = node.data.config[key]
				}
			})
		}

		onSave(updatedConfig)
	}
</script>

{#if configSchema}
	<div class="flowdrop-config-sidebar__form">
		{#if configSchema.properties}
			{#each Object.entries(configSchema.properties) as [key, field] (key)}
				{@const fieldConfig = field as any}
				{#if fieldConfig.format !== "hidden"}
					<div class="flowdrop-config-sidebar__field">
						<label class="flowdrop-config-sidebar__field-label" for={key}>
							{fieldConfig.title || fieldConfig.description || key}
						</label>
						{#if fieldConfig.enum && fieldConfig.multiple}
							<!-- Checkboxes for enum with multiple selection -->
							<div class="flowdrop-config-sidebar__checkbox-group">
								{#each fieldConfig.enum as option (String(option))}
									<label class="flowdrop-config-sidebar__checkbox-item">
										<input
											type="checkbox"
											class="flowdrop-config-sidebar__checkbox"
											value={String(option)}
											checked={Array.isArray(configValues[key]) &&
												configValues[key].includes(String(option))}
											onchange={(e) => {
												const checked = e.currentTarget.checked
												const currentValues = Array.isArray(configValues[key])
													? [...(configValues[key] as unknown[])]
													: []
												if (checked) {
													if (!currentValues.includes(String(option))) {
														configValues[key] = [...currentValues, String(option)]
													}
												} else {
													configValues[key] = currentValues.filter(
														(v) => v !== String(option)
													)
												}
											}}
										/>
										<span class="flowdrop-config-sidebar__checkbox-label">
											{String(option)}
										</span>
									</label>
								{/each}
							</div>
						{:else if fieldConfig.enum}
							<!-- Select for enum with single selection -->
							<select
								id={key}
								class="flowdrop-config-sidebar__select"
								bind:value={configValues[key]}
							>
								{#each fieldConfig.enum as option (String(option))}
									<option value={String(option)}>{String(option)}</option>
								{/each}
							</select>
						{:else if fieldConfig.type === "string" && fieldConfig.format === "multiline"}
							<!-- Textarea for multiline strings -->
							<textarea
								id={key}
								class="flowdrop-config-sidebar__textarea"
								bind:value={configValues[key]}
								placeholder={String(fieldConfig.placeholder || "")}
								rows="4"
							></textarea>
						{:else if fieldConfig.type === "string"}
							<input
								id={key}
								type="text"
								class="flowdrop-config-sidebar__input"
								bind:value={configValues[key]}
								placeholder={String(fieldConfig.placeholder || "")}
							/>
						{:else if fieldConfig.type === "number"}
							<input
								id={key}
								type="number"
								class="flowdrop-config-sidebar__input"
								bind:value={configValues[key]}
								placeholder={String(fieldConfig.placeholder || "")}
							/>
						{:else if fieldConfig.type === "boolean"}
							<input
								id={key}
								type="checkbox"
								class="flowdrop-config-sidebar__checkbox"
								checked={Boolean(configValues[key] || fieldConfig.default || false)}
								onchange={(e) => {
									configValues[key] = e.currentTarget.checked
								}}
							/>
						{:else if fieldConfig.type === "select" || fieldConfig.options}
							<select
								id={key}
								class="flowdrop-config-sidebar__select"
								bind:value={configValues[key]}
							>
								{#if fieldConfig.options}
									{#each fieldConfig.options as option (String(option.value))}
										{@const optionConfig = option as any}
										<option value={String(optionConfig.value)}
											>{String(optionConfig.label)}</option
										>
									{/each}
								{/if}
							</select>
						{:else}
							<!-- Fallback for unknown field types -->
							<input
								id={key}
								type="text"
								class="flowdrop-config-sidebar__input"
								bind:value={configValues[key]}
								placeholder={String(fieldConfig.placeholder || "")}
							/>
						{/if}
						{#if fieldConfig.description}
							<p class="flowdrop-config-sidebar__field-description">
								{String(fieldConfig.description)}
							</p>
						{/if}
					</div>
				{/if}
			{/each}
		{:else}
			<!-- If no properties, show the raw schema for debugging -->
			<div class="flowdrop-config-sidebar__debug">
				<p><strong>Debug - Config Schema:</strong></p>
				<pre>{JSON.stringify(configSchema, null, 2)}</pre>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="flowdrop-config-sidebar__footer">
		<button
			class="flowdrop-config-sidebar__button flowdrop-config-sidebar__button--secondary"
			onclick={onCancel}
		>
			Cancel
		</button>
		<button
			class="flowdrop-config-sidebar__button flowdrop-config-sidebar__button--primary"
			onclick={handleSave}
		>
			Save Changes
		</button>
	</div>
{:else}
	<p class="flowdrop-config-sidebar__no-config">
		No configuration options available for this node.
	</p>
{/if}

<style>
	.flowdrop-config-sidebar__form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.flowdrop-config-sidebar__field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.flowdrop-config-sidebar__field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.flowdrop-config-sidebar__input,
	.flowdrop-config-sidebar__select {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.flowdrop-config-sidebar__input:focus,
	.flowdrop-config-sidebar__select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.flowdrop-config-sidebar__checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.flowdrop-config-sidebar__checkbox-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.flowdrop-config-sidebar__checkbox {
		width: 1rem;
		height: 1rem;
		accent-color: #3b82f6;
		cursor: pointer;
	}

	.flowdrop-config-sidebar__checkbox-label {
		font-size: 0.875rem;
		color: #374151;
		cursor: pointer;
	}

	.flowdrop-config-sidebar__textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background-color: #ffffff;
		transition: all 0.2s ease-in-out;
		resize: vertical;
		min-height: 4rem;
	}

	.flowdrop-config-sidebar__textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.flowdrop-config-sidebar__field-description {
		margin: 0;
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.flowdrop-config-sidebar__no-config {
		text-align: center;
		color: #6b7280;
		font-style: italic;
		padding: 2rem 1rem;
	}

	.flowdrop-config-sidebar__footer {
		padding: 1rem;
		border-top: 1px solid #e5e7eb;
		background-color: #f9fafb;
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		height: 40px;
		align-items: center;
	}

	.flowdrop-config-sidebar__button {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.flowdrop-config-sidebar__button--secondary {
		background-color: #ffffff;
		border-color: #d1d5db;
		color: #374151;
	}

	.flowdrop-config-sidebar__button--secondary:hover {
		background-color: #f9fafb;
		border-color: #9ca3af;
	}

	.flowdrop-config-sidebar__button--primary {
		background-color: #3b82f6;
		color: #ffffff;
	}

	.flowdrop-config-sidebar__button--primary:hover {
		background-color: #2563eb;
	}

	.flowdrop-config-sidebar__debug {
		background-color: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		padding: 1rem;
		margin: 1rem 0;
	}

	.flowdrop-config-sidebar__debug pre {
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.25rem;
		padding: 0.75rem;
		font-size: 0.75rem;
		overflow-x: auto;
		margin: 0.5rem 0 0 0;
	}
</style>

<!--
  SchemaFormAdapter Component
  
  Adapter component that provides a unified interface for schema-based form rendering.
  Supports two modes:
  - "json-editor": Uses @json-editor/json-editor library for robust JSON Schema support
  - "native": Uses custom FormField components (original implementation)
  
  Features:
  - Emits change events on form value changes
  - Handles validation using the underlying implementation
  - Provides getValue() method for parent components
  - Design tokens system for consistent theming across forms
  
  Usage:
    <SchemaFormAdapter 
      schema={mySchema} 
      values={initialValues} 
      mode="json-editor"
      onchange={(values) => console.log(values)}
    />
-->

<svelte:head>
	<link rel="stylesheet" href="/src/lib/styles/form-tokens.css" />
</svelte:head>

<script lang="ts">
	import { onMount, onDestroy, tick } from "svelte";
	import type { ConfigSchema } from "$lib/types/index.js";
	import type { JSONEditor as JSONEditorType, ValidationError } from "$lib/types/json-editor.js";
	import { FormField } from "$lib/components/form/index.js";
	import type { FieldSchema } from "$lib/components/form/index.js";

	interface Props {
		/** JSON Schema for form generation */
		schema: ConfigSchema;
		/** Initial form values */
		values?: Record<string, unknown>;
		/** Mode: "json-editor" or "native" */
		mode?: "json-editor" | "native";
		/** Required fields list (for native mode) */
		required?: string[];
		/** Callback when form values change */
		onchange?: (values: Record<string, unknown>) => void;
		/** Callback when validation state changes */
		onvalidate?: (errors: ValidationError[]) => void;
		/** Optional node ID to optimize reinitialization (only reinitialize when this changes) */
		nodeId?: string;
	}

	let { 
		schema, 
		values = {}, 
		mode = "json-editor", 
		required = [],
		onchange,
		onvalidate,
		nodeId
	}: Props = $props();

	/** Container element for json-editor */
	let editorContainer: HTMLDivElement;
	
	/** JSON Editor instance */
	let editor: JSONEditorType | null = null;

	/** Form values for native mode */
	let formValues = $state<Record<string, unknown>>({});

	/** MutationObserver to watch for DOM changes and re-enhance buttons */
	let mutationObserver: MutationObserver | null = null;

	/**
	 * Create a stable key for the form that changes only when the node changes
	 * Falls back to schema title if nodeId is not provided
	 */
	const formKey = $derived(nodeId ?? schema?.title ?? "default");

	/**
	 * Track the previous key to detect changes
	 */
	let previousKey: string | undefined = $state();

	/**
	 * Effect: Reinitialize editor when formKey changes
	 * This ensures the editor updates when switching between nodes
	 */
	$effect(() => {
		// Watch for formKey changes
		const currentKey = formKey;
		
		// Skip initial mount (let onMount handle it)
		if (previousKey === undefined) {
			previousKey = currentKey;
			return;
		}
		
		// Only reinitialize if the key actually changed
		if (currentKey !== previousKey) {
			previousKey = currentKey;
			
			// Clean up existing editor
			if (mutationObserver) {
				mutationObserver.disconnect();
				mutationObserver = null;
			}
			
			if (editor) {
				editor.destroy();
				editor = null;
			}
			
			// Reinitialize with new schema and values
			if (mode === "json-editor") {
				// Use setTimeout to ensure DOM is ready
				setTimeout(() => {
					initJSONEditor();
				}, 0);
			} else {
				initNativeForm();
			}
		}
	});

	/**
	 * Initialize JSON Editor instance
	 */
	async function initJSONEditor(): Promise<void> {
		if (!editorContainer) return;

		try {
			// Dynamically import json-editor
			const jsonEditorModule = await import("@json-editor/json-editor");
			
			// Access the constructor - it might be default export or named export or the module itself
			const JSONEditor = jsonEditorModule.default || jsonEditorModule.JSONEditor || jsonEditorModule;
			
			if (typeof JSONEditor !== "function") {
				console.error("JSONEditor constructor not found. Module:", Object.keys(jsonEditorModule));
				return;
			}

			// Create editor instance
			editor = new JSONEditor(editorContainer, {
				schema: schema as Record<string, unknown>,
				startval: values,
				theme: "barebones", // Use minimal theme for custom styling
				show_errors: "interaction",
				disable_edit_json: true,
				disable_properties: true,
				disable_collapse: false,
				no_additional_properties: true,
				prompt_before_delete: true
			});

			// Watch for changes and emit them
			if (onchange) {
				editor.watch("root", () => {
					if (editor) {
						const currentValues = editor.getValue();
						onchange(currentValues);
					}
				});
			}

			// Validate on change if callback provided
			if (onvalidate) {
				editor.watch("root", () => {
					if (editor) {
						const errors = editor.validate();
						onvalidate(errors);
					}
				});
			}

			// Enhance buttons with icons and colors
			enhanceActionButtons();

			// Set up MutationObserver to watch for DOM changes (e.g., when Add item is clicked)
			setupMutationObserver();

		} catch (error) {
			console.error("Failed to initialize JSON Editor:", error);
		}
	}

	/**
	 * Set up MutationObserver to watch for DOM changes and re-enhance buttons
	 * This ensures that dynamically added buttons (e.g., when clicking "Add item") are also styled
	 */
	function setupMutationObserver(): void {
		if (!editorContainer) return;

		// Disconnect existing observer if any
		if (mutationObserver) {
			mutationObserver.disconnect();
		}

		// Create new observer
		mutationObserver = new MutationObserver((mutations) => {
			// Check if any mutations added new buttons
			let hasNewButtons = false;
			for (const mutation of mutations) {
				if (mutation.addedNodes.length > 0) {
					// Check if any added nodes contain buttons
					mutation.addedNodes.forEach((node) => {
						if (node instanceof HTMLElement) {
							const hasButtons = node.querySelector("button") || node.tagName === "BUTTON";
							if (hasButtons) {
								hasNewButtons = true;
							}
						}
					});
				}
			}

			// If new buttons were added, re-enhance all buttons
			if (hasNewButtons) {
				enhanceActionButtons();
			}
		});

		// Start observing the editor container for child list changes and subtree changes
		mutationObserver.observe(editorContainer, {
			childList: true,
			subtree: true
		});
	}

	/**
	 * Enhance json-editor action buttons with icons and colors
	 * Adds Heroicons SVG icons and color-coded styling to array/object action buttons
	 */
	function enhanceActionButtons(): void {
		if (!editorContainer) return;

		// Wait for DOM to be ready
		setTimeout(() => {
			// Define button enhancements with Heroicons and colors
			const 			buttonEnhancements: Array<{
				selector: string;
				iconSvg: string;
				color: string;
				bgColor: string;
				hoverBg: string;
				borderColor: string;
			}> = [
				{
					selector: '.json-editor-btn-add',
					// Heroicons: plus-circle (outline)
					iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>',
					color: "#047857",
					bgColor: "#ecfdf5",
					hoverBg: "#d1fae5",
					borderColor: "#a7f3d0"
				},
				{
					selector: '.json-editor-btn-delete, .json-editor-btn-deleteall, .json-editor-btn-subtract',
					// Heroicons: trash (outline)
					iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>',
					color: "#b91c1c",
					bgColor: "#fef2f2",
					hoverBg: "#fee2e2",
					borderColor: "#fecaca"
				},
				{
					selector: '.json-editor-btn-moveup',
					// Heroicons: arrow-up (outline)
					iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>',
					color: "#1d4ed8",
					bgColor: "#eff6ff",
					hoverBg: "#dbeafe",
					borderColor: "#bfdbfe"
				},
				{
					selector: '.json-editor-btn-movedown',
					// Heroicons: arrow-down (outline)
					iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>',
					color: "#1d4ed8",
					bgColor: "#eff6ff",
					hoverBg: "#dbeafe",
					borderColor: "#bfdbfe"
				},
				{
					selector: '.json-editor-btn-collapse',
					// Heroicons: chevron-up (outline)
					iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>',
					color: "#374151",
					bgColor: "#ffffff",
					hoverBg: "#f9fafb",
					borderColor: "#d1d5db"
				},
				{
					selector: '.json-editor-btn-expand',
					// Heroicons: chevron-down (outline)
					iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>',
					color: "#374151",
					bgColor: "#ffffff",
					hoverBg: "#f9fafb",
					borderColor: "#d1d5db"
				}
			];

			buttonEnhancements.forEach(({ selector, iconSvg, color, bgColor, hoverBg, borderColor }) => {
				const buttons = editorContainer?.querySelectorAll(selector);
				buttons?.forEach((button) => {
					const htmlButton = button as HTMLButtonElement;
					
					// Check if already enhanced
					if (htmlButton.getAttribute("data-enhanced") === "true") {
						return;
					}
					
					// Store original text
					const originalText = htmlButton.textContent?.trim() || "";
					
					// Create icon wrapper
					const iconWrapper = document.createElement("span");
					iconWrapper.className = "button-icon";
					iconWrapper.innerHTML = iconSvg;
					iconWrapper.style.display = "inline-flex";
					iconWrapper.style.alignItems = "center";
					iconWrapper.style.width = "1rem";
					iconWrapper.style.height = "1rem";
					iconWrapper.style.marginRight = "0.375rem";
					iconWrapper.style.flexShrink = "0";
					
					// Clear button and rebuild with icon + text
					htmlButton.innerHTML = "";
					htmlButton.appendChild(iconWrapper);
					
					// Add text back
					const textSpan = document.createElement("span");
					textSpan.textContent = originalText;
					htmlButton.appendChild(textSpan);
					
					// Apply color styling
					htmlButton.style.color = color;
					htmlButton.style.backgroundColor = bgColor;
					htmlButton.style.borderColor = borderColor;
					htmlButton.style.borderWidth = "1px";
					htmlButton.style.borderStyle = "solid";
					
					// Add hover effect
					htmlButton.addEventListener("mouseenter", () => {
						htmlButton.style.backgroundColor = hoverBg;
						htmlButton.style.transform = "translateY(-1px)";
						htmlButton.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.08)";
					});
					htmlButton.addEventListener("mouseleave", () => {
						htmlButton.style.backgroundColor = bgColor;
						htmlButton.style.transform = "translateY(0)";
						htmlButton.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
					});
					
					// Mark as enhanced
					htmlButton.setAttribute("data-enhanced", "true");
				});
			});
		}, 100);
	}

	/**
	 * Initialize native form values
	 */
	function initNativeForm(): void {
		if (!schema?.properties) return;

		const mergedValues: Record<string, unknown> = {};
		Object.entries(schema.properties).forEach(([key, field]) => {
			const fieldConfig = field as Record<string, unknown>;
			// Use existing value if available, otherwise use default
			mergedValues[key] = values[key] !== undefined ? values[key] : fieldConfig.default;
		});
		formValues = mergedValues;
	}

	/**
	 * Handle field value changes in native mode
	 */
	function handleNativeFieldChange(key: string, value: unknown): void {
		formValues[key] = value;
		if (onchange) {
			onchange({ ...formValues });
		}
	}

	/**
	 * Check if a field is required (native mode)
	 */
	function isFieldRequired(key: string): boolean {
		if (!schema?.required) return false;
		return schema.required.includes(key) || required.includes(key);
	}

	/**
	 * Convert ConfigProperty to FieldSchema for FormField component
	 */
	function toFieldSchema(property: Record<string, unknown>): FieldSchema {
		return property as FieldSchema;
	}

	/**
	 * Public method to get current form values
	 * Can be called by parent component using bind:this
	 */
	export function getValue(): Record<string, unknown> {
		if (mode === "json-editor" && editor) {
			return editor.getValue();
		}
		return { ...formValues };
	}

	/**
	 * Public method to validate form
	 */
	export function validate(): ValidationError[] {
		if (mode === "json-editor" && editor) {
			return editor.validate();
		}
		// Native mode validation would go here
		return [];
	}

	/**
	 * Public method to set form values
	 */
	export function setValue(newValues: Record<string, unknown>): void {
		if (mode === "json-editor" && editor) {
			editor.setValue(newValues);
		} else {
			formValues = { ...newValues };
		}
	}

	/**
	 * Lifecycle: Initialize based on mode
	 */
	onMount(async () => {
		// Ensure DOM is fully ready
		await tick();
		
		if (mode === "json-editor") {
			initJSONEditor();
		} else {
			initNativeForm();
		}
	});

	/**
	 * Lifecycle: Cleanup json-editor instance
	 */
	onDestroy(() => {
		// Disconnect mutation observer
		if (mutationObserver) {
			mutationObserver.disconnect();
			mutationObserver = null;
		}

		// Destroy editor
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});
</script>

{#if mode === "json-editor"}
	<!-- JSON Editor Container -->
	<div class="schema-form-adapter">
		<div class="schema-form-adapter__json-editor" bind:this={editorContainer}></div>
	</div>
{:else if mode === "native"}
	<!-- Native Form Fields -->
	<div class="schema-form-adapter">
		<div class="schema-form-adapter__native">
			{#if schema?.properties}
				{#each Object.entries(schema.properties) as [key, field], index (key)}
					{@const fieldSchema = toFieldSchema(field as Record<string, unknown>)}
					{@const fieldRequired = isFieldRequired(key)}

					<FormField
						fieldKey={key}
						schema={fieldSchema}
						value={formValues[key]}
						required={fieldRequired}
						animationIndex={index}
						onChange={(val) => handleNativeFieldChange(key, val)}
					/>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ============================================
	   DESIGN TOKENS - Form Styling System
	   Semantic naming for consistent theming
	   ============================================ */

	.schema-form-adapter {
		/* Color tokens */
		--form-color-text-primary: var(--color-ref-gray-900, #111827);
		--form-color-text-secondary: var(--color-ref-gray-600, #4b5563);
		--form-color-text-muted: var(--color-ref-gray-500, #6b7280);
		--form-color-text-label: var(--color-ref-gray-700, #374151);
		--form-color-text-required: var(--color-ref-red-500, #ef4444);
		--form-color-text-error: var(--color-ref-red-600, #dc2626);
		
		--form-color-bg-input: #ffffff;
		--form-color-bg-hover: var(--color-ref-gray-50, #f9fafb);
		--form-color-bg-disabled: var(--color-ref-gray-100, #f3f4f6);
		--form-color-bg-error: var(--color-ref-red-50, #fef2f2);
		
		--form-color-border-default: var(--color-ref-gray-300, #d1d5db);
		--form-color-border-hover: var(--color-ref-gray-400, #9ca3af);
		--form-color-border-focus: var(--color-ref-blue-500, #3b82f6);
		--form-color-border-error: var(--color-ref-red-300, #fca5a5);
		
		--form-color-focus-ring: rgba(59, 130, 246, 0.1);
		--form-color-shadow-sm: rgba(0, 0, 0, 0.04);
		--form-color-shadow-md: rgba(0, 0, 0, 0.1);
		
		/* Spacing tokens */
		--form-spacing-xs: 0.25rem;
		--form-spacing-sm: 0.5rem;
		--form-spacing-md: 0.75rem;
		--form-spacing-lg: 1rem;
		--form-spacing-xl: 1.25rem;
		
		/* Typography tokens */
		--form-font-size-xs: 0.75rem;
		--form-font-size-sm: 0.8125rem;
		--form-font-size-base: 0.875rem;
		--form-font-size-lg: 1rem;
		
		--form-font-weight-normal: 400;
		--form-font-weight-medium: 500;
		--form-font-weight-semibold: 600;
		--form-font-weight-bold: 700;
		
		--form-line-height-tight: 1.25;
		--form-line-height-normal: 1.5;
		--form-line-height-relaxed: 1.75;
		
		/* Border tokens */
		--form-border-width: 1px;
		--form-border-radius-sm: 0.25rem;
		--form-border-radius-md: 0.375rem;
		--form-border-radius-lg: 0.5rem;
		
		/* Transition tokens */
		--form-transition-fast: 0.15s;
		--form-transition-base: 0.2s;
		--form-transition-slow: 0.3s;
		--form-transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
		
		width: 100%;
	}

	/* ============================================
	   SCHEMA FORM ADAPTER - Container Styles
	   ============================================ */

	.schema-form-adapter__json-editor {
		width: 100%;
	}

	.schema-form-adapter__native {
		display: flex;
		flex-direction: column;
		gap: var(--form-spacing-xl);
	}

	/* ============================================
	   JSON EDITOR CUSTOM STYLING
	   Themed to match FlowDrop design system
	   ============================================ */

	/* Container */
	.schema-form-adapter__json-editor :global(.je-form-container) {
		width: 100%;
	}

	/* Field groups */
	.schema-form-adapter__json-editor :global(.je-form-control),
	.schema-form-adapter__json-editor :global(.form-control) {
		margin-bottom: var(--form-spacing-xl);
	}

	/* Labels - make them more prominent */
	.schema-form-adapter__json-editor :global(.je-form-label),
	.schema-form-adapter__json-editor :global(.form-control > label) {
		display: block;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--form-color-text-label);
		margin-bottom: var(--form-spacing-sm);
		line-height: var(--form-line-height-tight);
		letter-spacing: -0.01em;
	}

	/* Required indicator */
	.schema-form-adapter__json-editor :global(.je-form-label .required) {
		color: var(--form-color-text-required);
		margin-left: var(--form-spacing-xs);
	}

	/* Description text - make it clearly secondary */
	.schema-form-adapter__json-editor :global(.je-form-description),
	.schema-form-adapter__json-editor :global(p.form-text),
	.schema-form-adapter__json-editor :global(.form-control > p) {
		font-size: 0.8em;
		color: #6b7280;
		margin-top: 0.2em;
		margin-bottom: var(--form-spacing-sm);
		margin-block-start: 0.2em;
		line-height: 1.5;
		font-style: normal;
		opacity: 1;
	}

	/* Row descriptions (field-level descriptions) */
	.schema-form-adapter__json-editor :global(.row > div > p) {
		padding-top: 0.2em;
		margin-block-start: 0.2em;
		font-size: 1em;
		font-weight: 700;
		color: var(--form-color-text-label);
	}

	/* Input fields - shared styles */
	.schema-form-adapter__json-editor :global(.je-form-input-input),
	.schema-form-adapter__json-editor :global(input[type="text"]),
	.schema-form-adapter__json-editor :global(input[type="number"]),
	.schema-form-adapter__json-editor :global(input[type="email"]),
	.schema-form-adapter__json-editor :global(input[type="url"]) {
		width: 100%;
		padding: var(--form-spacing-md) var(--form-spacing-md);
		border: 1px solid #d1d5db;
		border-radius: var(--form-border-radius-md);
		font-size: var(--form-font-size-base);
		font-family: inherit;
		color: #111827;
		background-color: #ffffff;
		transition: all var(--form-transition-fast) var(--form-transition-timing);
		line-height: var(--form-line-height-normal);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.schema-form-adapter__json-editor :global(.je-form-input-input:hover),
	.schema-form-adapter__json-editor :global(input:not([type="checkbox"]):not([type="radio"]):hover) {
		border-color: #9ca3af;
		background-color: #ffffff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.schema-form-adapter__json-editor :global(.je-form-input-input:focus),
	.schema-form-adapter__json-editor :global(input:not([type="checkbox"]):not([type="radio"]):focus) {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.schema-form-adapter__json-editor :global(.je-form-input-input:disabled),
	.schema-form-adapter__json-editor :global(input:disabled) {
		background-color: #f3f4f6;
		border-color: #e5e7eb;
		color: #6b7280;
		cursor: not-allowed;
		opacity: 0.7;
	}

	/* Select dropdowns */
	.schema-form-adapter__json-editor :global(.je-form-input-select),
	.schema-form-adapter__json-editor :global(select) {
		width: 100%;
		padding: var(--form-spacing-md) var(--form-spacing-md);
		padding-right: 2.5rem;
		border: 1px solid #d1d5db;
		border-radius: var(--form-border-radius-md);
		font-size: var(--form-font-size-base);
		font-family: inherit;
		color: #111827;
		background-color: #ffffff;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.25rem;
		transition: all var(--form-transition-fast) var(--form-transition-timing);
		cursor: pointer;
		appearance: none;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.schema-form-adapter__json-editor :global(.je-form-input-select:hover),
	.schema-form-adapter__json-editor :global(select:hover) {
		border-color: #9ca3af;
		background-color: #ffffff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.schema-form-adapter__json-editor :global(.je-form-input-select:focus),
	.schema-form-adapter__json-editor :global(select:focus) {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	/* Checkboxes */
	.schema-form-adapter__json-editor :global(.je-form-input-checkbox),
	.schema-form-adapter__json-editor :global(input[type="checkbox"]) {
		width: 1.125rem;
		height: 1.125rem;
		margin-right: var(--form-spacing-sm);
		border: var(--form-border-width) solid var(--form-color-border-default);
		border-radius: var(--form-border-radius-sm);
		cursor: pointer;
		transition: all var(--form-transition-fast) var(--form-transition-timing);
	}

	.schema-form-adapter__json-editor :global(input[type="checkbox"]:checked) {
		background-color: var(--form-color-border-focus);
		border-color: var(--form-color-border-focus);
	}

	.schema-form-adapter__json-editor :global(input[type="checkbox"]:focus) {
		outline: none;
		box-shadow: 0 0 0 3px var(--form-color-focus-ring);
	}

	/* Radio buttons */
	.schema-form-adapter__json-editor :global(input[type="radio"]) {
		width: 1.125rem;
		height: 1.125rem;
		margin-right: var(--form-spacing-sm);
		border: var(--form-border-width) solid var(--form-color-border-default);
		cursor: pointer;
		transition: all var(--form-transition-fast) var(--form-transition-timing);
	}

	.schema-form-adapter__json-editor :global(input[type="radio"]:checked) {
		border-color: var(--form-color-border-focus);
	}

	.schema-form-adapter__json-editor :global(input[type="radio"]:focus) {
		outline: none;
		box-shadow: 0 0 0 3px var(--form-color-focus-ring);
	}

	/* Textareas */
	.schema-form-adapter__json-editor :global(.je-form-input-textarea),
	.schema-form-adapter__json-editor :global(textarea) {
		width: 100%;
		padding: var(--form-spacing-md) var(--form-spacing-md);
		border: var(--form-border-width) solid var(--form-color-border-default);
		border-radius: var(--form-border-radius-md);
		font-size: var(--form-font-size-base);
		font-family: inherit;
		color: var(--form-color-text-primary);
		background-color: var(--form-color-bg-input);
		resize: vertical;
		min-height: 6rem;
		line-height: var(--form-line-height-normal);
		transition: all var(--form-transition-fast) var(--form-transition-timing);
	}

	.schema-form-adapter__json-editor :global(textarea:hover) {
		border-color: var(--form-color-border-hover);
		background-color: var(--form-color-bg-hover);
	}

	.schema-form-adapter__json-editor :global(textarea:focus) {
		outline: none;
		border-color: var(--form-color-border-focus);
		box-shadow: 0 0 0 3px var(--form-color-focus-ring);
	}

	/* Range sliders */
	.schema-form-adapter__json-editor :global(input[type="range"]) {
		width: 100%;
		height: 0.375rem;
		border-radius: var(--form-border-radius-lg);
		background: var(--form-color-border-default);
		outline: none;
		cursor: pointer;
	}

	.schema-form-adapter__json-editor :global(input[type="range"]::-webkit-slider-thumb) {
		appearance: none;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--form-color-border-focus);
		cursor: pointer;
		transition: all var(--form-transition-fast) var(--form-transition-timing);
		box-shadow: 0 2px 4px var(--form-color-shadow-sm);
	}

	.schema-form-adapter__json-editor :global(input[type="range"]::-webkit-slider-thumb:hover) {
		transform: scale(1.1);
		box-shadow: 0 4px 8px var(--form-color-shadow-md);
	}

	.schema-form-adapter__json-editor :global(input[type="range"]::-moz-range-thumb) {
		width: 1.25rem;
		height: 1.25rem;
		border: none;
		border-radius: 50%;
		background: var(--form-color-border-focus);
		cursor: pointer;
		transition: all var(--form-transition-fast) var(--form-transition-timing);
		box-shadow: 0 2px 4px var(--form-color-shadow-sm);
	}

	.schema-form-adapter__json-editor :global(input[type="range"]::-moz-range-thumb:hover) {
		transform: scale(1.1);
		box-shadow: 0 4px 8px var(--form-color-shadow-md);
	}

	/* Error messages */
	.schema-form-adapter__json-editor :global(.je-form-error),
	.schema-form-adapter__json-editor :global(.invalid-feedback) {
		font-size: var(--form-font-size-sm);
		color: var(--form-color-text-error);
		margin-top: var(--form-spacing-sm);
		line-height: var(--form-line-height-normal);
		display: flex;
		align-items: center;
		gap: var(--form-spacing-xs);
	}

	.schema-form-adapter__json-editor :global(.je-form-error::before) {
		content: "⚠";
		font-size: var(--form-font-size-base);
	}

	/* Buttons */
	.schema-form-adapter__json-editor :global(.je-form-button),
	.schema-form-adapter__json-editor :global(button:not(.switch-slider)) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--form-spacing-xs);
		padding: 0.5rem 0.875rem;
		border: var(--form-border-width) solid var(--form-color-border-default);
		border-radius: var(--form-border-radius-md);
		font-size: var(--form-font-size-sm);
		font-weight: var(--form-font-weight-medium);
		font-family: inherit;
		color: var(--form-color-text-label);
		background-color: #ffffff;
		cursor: pointer;
		transition: all var(--form-transition-base) var(--form-transition-timing);
		box-shadow: 0 1px 2px var(--form-color-shadow-sm);
		line-height: 1;
		white-space: nowrap;
	}

	.schema-form-adapter__json-editor :global(.je-form-button:hover),
	.schema-form-adapter__json-editor :global(button:not(.switch-slider):hover) {
		border-color: var(--form-color-border-hover);
		transform: translateY(-1px);
		box-shadow: 0 2px 4px var(--form-color-shadow-md);
	}

	.schema-form-adapter__json-editor :global(.je-form-button:active),
	.schema-form-adapter__json-editor :global(button:not(.switch-slider):active) {
		transform: translateY(0);
		box-shadow: 0 1px 2px var(--form-color-shadow-sm);
	}

	.schema-form-adapter__json-editor :global(.je-form-button:focus),
	.schema-form-adapter__json-editor :global(button:not(.switch-slider):focus) {
		outline: none;
		box-shadow: 0 0 0 3px var(--form-color-focus-ring);
	}

	/* Enhanced buttons with icons and colors */
	.schema-form-adapter__json-editor :global(button[data-enhanced="true"]) {
		font-weight: var(--form-font-weight-semibold);
		border-width: 1.5px;
		gap: 0.375rem;
	}

	.schema-form-adapter__json-editor :global(button[data-enhanced="true"]:hover) {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px var(--form-color-shadow-md);
	}

	.schema-form-adapter__json-editor :global(button[data-enhanced="true"]:active) {
		transform: translateY(0);
		box-shadow: 0 2px 4px var(--form-color-shadow-sm);
	}

	/* Icon styling within buttons */
	.schema-form-adapter__json-editor :global(button .button-icon) {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.schema-form-adapter__json-editor :global(button .button-icon svg) {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* Array controls - clean layout with better spacing */
	.schema-form-adapter__json-editor :global(.je-array-control) {
		margin-top: var(--form-spacing-lg);
		display: flex;
		gap: var(--form-spacing-lg);
		flex-wrap: wrap;
		align-items: center;
	}

	/* Individual array item controls (delete, move buttons per item) */
	.schema-form-adapter__json-editor :global([data-schemapath]) > :global(div[data-schematype]) > :global(.je-array-control) {
		margin-top: var(--form-spacing-md);
		display: flex;
		gap: var(--form-spacing-lg);
		flex-wrap: wrap;
		padding-top: var(--form-spacing-md);
		border-top: 1px solid #f3f4f6;
	}

	/* Object properties & nested structures */
	.schema-form-adapter__json-editor :global(.je-object-container),
	.schema-form-adapter__json-editor :global(.je-indented-panel) {
		border: 1px solid #e5e7eb;
		border-radius: var(--form-border-radius-lg);
		padding: var(--form-spacing-lg);
		margin: 0;
		margin-bottom: var(--form-spacing-lg);
		background-color: #f9fafb;
		position: relative;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
	}

	/* Object container specific spacing */
	.schema-form-adapter__json-editor :global(.je-object__container) {
		margin-bottom: 1em;
	}

	/* Hide object controls */
	.schema-form-adapter__json-editor :global(.je-object__controls) {
		display: none;
	}

	/* Fieldset-like styling for array items */
	.schema-form-adapter__json-editor :global([data-schemapath]) > :global(div[data-schematype]) {
		border: 1px solid #e5e7eb;
		border-radius: var(--form-border-radius-lg);
		padding: var(--form-spacing-lg);
		margin-bottom: var(--form-spacing-md);
		background-color: #ffffff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition: all var(--form-transition-base) var(--form-transition-timing);
	}

	.schema-form-adapter__json-editor :global([data-schemapath]) > :global(div[data-schematype]):hover {
		border-color: #d1d5db;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
	}

	/* Collapsible headers */
	.schema-form-adapter__json-editor :global(.je-header) {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--form-spacing-sm);
		font-size: var(--form-font-size-base);
		font-weight: var(--form-font-weight-semibold);
		color: #374151;
		margin-bottom: var(--form-spacing-md);
		padding: var(--form-spacing-sm) 0;
		border-bottom: 1px solid #e5e7eb;
	}

	/* Header spans (titles) */
	.schema-form-adapter__json-editor :global(.je-header > span) {
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
		background-color: transparent;
		padding: 0;
		flex: 1;
	}

	/* Header buttons (collapse/expand) */
	.schema-form-adapter__json-editor :global(.je-header > button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #d1d5db;
		padding: 0.25rem 0.5rem;
		width: auto;
		min-width: 2rem;
		height: 2rem;
		margin: 0;
		background-color: #ffffff;
		color: #6b7280;
		font-size: var(--form-font-size-sm);
		line-height: 1;
		border-radius: var(--form-border-radius-md);
		cursor: pointer;
		transition: all var(--form-transition-fast) var(--form-transition-timing);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.schema-form-adapter__json-editor :global(.je-header button:hover) {
		background-color: #f9fafb;
		border-color: #9ca3af;
		color: #374151;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
	}

	.schema-form-adapter__json-editor :global(.je-header button:focus) {
		outline: none;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	/* Table styling for certain field types */
	.schema-form-adapter__json-editor :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: var(--form-spacing-md) 0;
	}

	.schema-form-adapter__json-editor :global(table th),
	.schema-form-adapter__json-editor :global(table td) {
		padding: var(--form-spacing-sm) var(--form-spacing-md);
		text-align: left;
		border-bottom: var(--form-border-width) solid var(--form-color-border-default);
	}

	.schema-form-adapter__json-editor :global(table th) {
		font-size: var(--form-font-size-sm);
		font-weight: var(--form-font-weight-semibold);
		color: var(--form-color-text-label);
		background-color: var(--form-color-bg-hover);
	}

	/* Animation for field appearance */
	@keyframes fieldFadeIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.schema-form-adapter__json-editor :global(.je-form-control) {
		animation: fieldFadeIn var(--form-transition-slow) var(--form-transition-timing) backwards;
	}

	.schema-form-adapter__json-editor :global(.je-form-control:nth-child(1)) {
		animation-delay: 0ms;
	}

	.schema-form-adapter__json-editor :global(.je-form-control:nth-child(2)) {
		animation-delay: 50ms;
	}

	.schema-form-adapter__json-editor :global(.je-form-control:nth-child(3)) {
		animation-delay: 100ms;
	}

	.schema-form-adapter__json-editor :global(.je-form-control:nth-child(4)) {
		animation-delay: 150ms;
	}

	.schema-form-adapter__json-editor :global(.je-form-control:nth-child(5)) {
		animation-delay: 200ms;
	}

	.schema-form-adapter__json-editor :global(.je-form-control:nth-child(n+6)) {
		animation-delay: 250ms;
	}
</style>


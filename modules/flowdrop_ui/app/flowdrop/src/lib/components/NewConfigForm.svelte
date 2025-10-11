<!--
  NewConfigForm Component
  Uses @sjsf/form library for better form generation with Svelte 5 support
  Replaces the custom ConfigForm.svelte with a more robust solution
-->

<script lang="ts">
	import type { ConfigSchema, ConfigValues } from '../types/index.js';
	import { createEventDispatcher } from 'svelte';
	import { createForm, BasicForm } from '@sjsf/form';
	import { theme } from '@sjsf/basic-theme';
	import { createFormValidator } from '@sjsf/ajv8-validator';
	import { translation } from '@sjsf/form/translations/en';
	import { resolver } from '@sjsf/form/resolvers/basic';

	interface Props {
		schema: ConfigSchema;
		values: ConfigValues;
		disabled?: boolean;
	}

	let props: Props = $props();
	let dispatch = createEventDispatcher<{
		change: { values: ConfigValues };
		validate: { isValid: boolean; errors: string[] };
	}>();

	// Use the schema as-is since we're now using standard array types
	let transformedSchema = $derived.by(() => {
		console.log('🔍 NewConfigForm: Original schema:', JSON.stringify(props.schema, null, 2));
		const schema = props.schema as any;
		console.log('🔍 NewConfigForm: Transformed schema:', JSON.stringify(schema, null, 2));
		return schema;
	});

	// Configure UI schema for proper array rendering
	let uiSchema = $derived.by(() => {
		const ui: any = {};
		
		console.log('🔍 NewConfigForm: UI Schema:', JSON.stringify(ui, null, 2));
		
		// Let the library handle array rendering automatically
		// No custom UI schema needed for basic array functionality
		
		return ui;
	});

	// Create form instance
	const form = $derived.by(() => {
		console.log('🔍 NewConfigForm: Creating form with schema:', JSON.stringify(transformedSchema, null, 2));
		console.log('🔍 NewConfigForm: Initial values:', JSON.stringify(props.values, null, 2));
		
		const formInstance = createForm({
			schema: transformedSchema,
			uiSchema,
			initialValue: props.values,
			theme,
			validator: createFormValidator(),
			translation,
			resolver,
			onSubmit: ({ value }) => {
				dispatch('change', { values: value as ConfigValues });
			}
		});
		
		console.log('🔍 NewConfigForm: Form instance created:', formInstance);
		console.log('🔍 NewConfigForm: Form value:', formInstance.value);
		
		return formInstance;
	});

	// Watch for changes in form values
	$effect(() => {
		if (form.value) {
			dispatch('change', { values: form.value as ConfigValues });
		}
	});

	// Watch for validation changes
	$effect(() => {
		dispatch('validate', { 
			isValid: true, 
			errors: [] 
		});
	});
</script>

<div class="new-config-form">
	{#if form}
		<div>Form is ready, rendering BasicForm...</div>
		<BasicForm {form} />
	{:else}
		<div>Form not ready...</div>
	{/if}
</div>

<style>
	.new-config-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Override default form styles to match our design system */
	:global(.new-config-form .form-group) {
		margin-bottom: 1rem;
	}

	:global(.new-config-form .form-label) {
		display: block;
		font-weight: 500;
		margin-bottom: 0.5rem;
		color: #374151;
	}

	:global(.new-config-form .form-control) {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: border-color 0.15s ease;
	}

	:global(.new-config-form .form-control:focus) {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	:global(.new-config-form .form-control:disabled) {
		background-color: #f9fafb;
		color: #9ca3af;
		cursor: not-allowed;
	}

	:global(.new-config-form .form-text) {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	:global(.new-config-form .form-error) {
		color: #dc2626;
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}
</style>

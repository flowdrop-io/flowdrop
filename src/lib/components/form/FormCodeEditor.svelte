<!--
  FormCodeEditor Component
  CodeMirror-based code editor for JSON and other structured data
  
  Features:
  - JSON syntax highlighting with CodeMirror 6
  - Real-time JSON validation with error display
  - Auto-formatting on blur (optional)
  - Dark/light theme support
  - Consistent styling with other form components
  - Proper ARIA attributes for accessibility
  
  Usage:
  Use with schema format: "json" or format: "code" to render this editor
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState } from '@codemirror/state';
	import { json, jsonParseLinter } from '@codemirror/lang-json';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { linter, lintGutter } from '@codemirror/lint';

	interface Props {
		/** Field identifier */
		id: string;
		/** Current value - can be string (raw JSON) or object */
		value: unknown;
		/** Placeholder text shown when empty */
		placeholder?: string;
		/** Whether the field is required */
		required?: boolean;
		/** Whether to use dark theme */
		darkTheme?: boolean;
		/** Editor height in pixels or CSS value */
		height?: string;
		/** Whether to auto-format JSON on blur */
		autoFormat?: boolean;
		/** ARIA description ID */
		ariaDescribedBy?: string;
		/** Callback when value changes */
		onChange: (value: unknown) => void;
	}

	let {
		id,
		value = '',
		placeholder = '{}',
		required = false,
		darkTheme = false,
		height = '200px',
		autoFormat = true,
		ariaDescribedBy,
		onChange
	}: Props = $props();

	/** Reference to the container element */
	let containerRef: HTMLDivElement | undefined = $state(undefined);

	/** CodeMirror editor instance */
	let editorView: EditorView | undefined = $state(undefined);

	/** Current validation error message */
	let validationError: string | undefined = $state(undefined);

	/** Flag to prevent update loops */
	let isInternalUpdate = false;

	/**
	 * Convert value to JSON string for editor display
	 */
	function valueToString(val: unknown): string {
		if (val === undefined || val === null) {
			return '';
		}
		if (typeof val === 'string') {
			// Check if it's already a valid JSON string
			try {
				JSON.parse(val);
				return val;
			} catch {
				// Not valid JSON, return as-is
				return val;
			}
		}
		// Convert object to formatted JSON string
		return JSON.stringify(val, null, 2);
	}

	/**
	 * Validate JSON and return parsed value or undefined if invalid
	 */
	function validateAndParse(content: string): { valid: boolean; value?: unknown; error?: string } {
		if (!content.trim()) {
			return { valid: true, value: undefined };
		}

		try {
			const parsed = JSON.parse(content);
			return { valid: true, value: parsed };
		} catch (e) {
			const error = e instanceof Error ? e.message : 'Invalid JSON';
			return { valid: false, error };
		}
	}

	/**
	 * Handle editor content changes
	 */
	function handleUpdate(update: { docChanged: boolean; state: EditorState }): void {
		if (!update.docChanged || isInternalUpdate) {
			return;
		}

		const content = update.state.doc.toString();
		const result = validateAndParse(content);

		if (result.valid) {
			validationError = undefined;
			// Emit the parsed value (object) not the string
			onChange(result.value);
		} else {
			validationError = result.error;
			// Still emit the raw string so user can continue editing
			onChange(content);
		}
	}

	/**
	 * Format JSON content (used on blur if autoFormat is enabled)
	 */
	function formatContent(): void {
		if (!editorView || !autoFormat) {
			return;
		}

		const content = editorView.state.doc.toString();
		const result = validateAndParse(content);

		if (result.valid && result.value !== undefined) {
			const formatted = JSON.stringify(result.value, null, 2);
			if (formatted !== content) {
				isInternalUpdate = true;
				editorView.dispatch({
					changes: {
						from: 0,
						to: editorView.state.doc.length,
						insert: formatted
					}
				});
				isInternalUpdate = false;
			}
		}
	}

	/**
	 * Create editor extensions array
	 */
	function createExtensions() {
		const extensions = [
			basicSetup,
			json(),
			linter(jsonParseLinter()),
			lintGutter(),
			EditorView.updateListener.of(handleUpdate),
			EditorView.theme({
				'&': {
					height: height,
					fontSize: '0.8125rem',
					fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace"
				},
				'.cm-scroller': {
					overflow: 'auto'
				},
				'.cm-content': {
					minHeight: '100px'
				},
				'&.cm-focused': {
					outline: 'none'
				}
			}),
			EditorView.lineWrapping
		];

		if (darkTheme) {
			extensions.push(oneDark);
		}

		return extensions;
	}

	/**
	 * Initialize CodeMirror editor on mount
	 */
	onMount(() => {
		if (!containerRef) {
			return;
		}

		const initialContent = valueToString(value);

		editorView = new EditorView({
			state: EditorState.create({
				doc: initialContent,
				extensions: createExtensions()
			}),
			parent: containerRef
		});

		// Validate initial content
		if (initialContent) {
			const result = validateAndParse(initialContent);
			if (!result.valid) {
				validationError = result.error;
			}
		}
	});

	/**
	 * Clean up editor on destroy
	 */
	onDestroy(() => {
		if (editorView) {
			editorView.destroy();
		}
	});

	/**
	 * Update editor content when value prop changes externally
	 */
	$effect(() => {
		if (!editorView) {
			return;
		}

		const newContent = valueToString(value);
		const currentContent = editorView.state.doc.toString();

		// Only update if content actually changed and wasn't from internal edit
		if (newContent !== currentContent && !isInternalUpdate) {
			isInternalUpdate = true;
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: newContent
				}
			});
			isInternalUpdate = false;

			// Validate new content
			const result = validateAndParse(newContent);
			validationError = result.valid ? undefined : result.error;
		}
	});
</script>

<div class="form-code-editor" class:form-code-editor--error={validationError}>
	<!-- Hidden input for form submission compatibility -->
	<input
		type="hidden"
		{id}
		name={id}
		value={typeof value === 'string' ? value : JSON.stringify(value)}
		aria-describedby={ariaDescribedBy}
		aria-required={required}
	/>

	<!-- CodeMirror container -->
	<div
		bind:this={containerRef}
		class="form-code-editor__container"
		class:form-code-editor__container--dark={darkTheme}
		role="textbox"
		aria-multiline="true"
		aria-label="JSON editor"
		onblur={formatContent}
	></div>

	<!-- Validation error display -->
	{#if validationError}
		<div class="form-code-editor__error" role="alert">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="form-code-editor__error-icon"
			>
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
					clip-rule="evenodd"
				/>
			</svg>
			<span>{validationError}</span>
		</div>
	{/if}

	<!-- Placeholder hint when empty -->
	{#if !value && placeholder}
		<div class="form-code-editor__placeholder">
			Start typing or paste JSON. Example: <code>{placeholder}</code>
		</div>
	{/if}
</div>

<style>
	.form-code-editor {
		position: relative;
		width: 100%;
	}

	.form-code-editor__container {
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		overflow: hidden;
		background-color: var(--color-ref-gray-50, #f9fafb);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.form-code-editor__container:hover {
		border-color: var(--color-ref-gray-300, #d1d5db);
		background-color: #ffffff;
	}

	.form-code-editor__container:focus-within {
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}

	.form-code-editor--error .form-code-editor__container {
		border-color: var(--color-ref-red-400, #f87171);
	}

	.form-code-editor--error .form-code-editor__container:focus-within {
		border-color: var(--color-ref-red-500, #ef4444);
		box-shadow:
			0 0 0 3px rgba(239, 68, 68, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}

	/* Dark theme overrides */
	.form-code-editor__container--dark {
		background-color: #282c34;
	}

	.form-code-editor__container--dark:hover,
	.form-code-editor__container--dark:focus-within {
		background-color: #282c34;
	}

	/* CodeMirror styling overrides */
	.form-code-editor__container :global(.cm-editor) {
		border-radius: 0.5rem;
	}

	.form-code-editor__container :global(.cm-gutters) {
		background-color: var(--color-ref-gray-100, #f3f4f6);
		border-right: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem 0 0 0.5rem;
	}

	.form-code-editor__container--dark :global(.cm-gutters) {
		background-color: #21252b;
		border-right-color: #3e4451;
	}

	/* Error message */
	.form-code-editor__error {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: var(--color-ref-red-50, #fef2f2);
		border: 1px solid var(--color-ref-red-200, #fecaca);
		border-radius: 0.375rem;
		color: var(--color-ref-red-700, #b91c1c);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.form-code-editor__error-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}

	.form-code-editor__error span {
		word-break: break-word;
	}

	/* Placeholder hint */
	.form-code-editor__placeholder {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-ref-gray-500, #6b7280);
		font-style: italic;
	}

	.form-code-editor__placeholder code {
		padding: 0.125rem 0.375rem;
		background-color: var(--color-ref-gray-100, #f3f4f6);
		border-radius: 0.25rem;
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: 0.6875rem;
		font-style: normal;
	}
</style>

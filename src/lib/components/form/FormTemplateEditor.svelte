<!--
  FormTemplateEditor Component
  CodeMirror-based template editor for Twig/Liquid-style templates
  
  Features:
  - Custom syntax highlighting for {{ variable }} placeholders
  - Inline autocomplete for template variables (triggered on {{ and .)
  - Support for nested object drilling (user.address.city)
  - Support for array index access (items[0].name)
  - Dark/light theme support
  - Consistent styling with other form components
  - Line wrapping for better template readability
  - Optional variable hints display (clickable buttons)
  - Proper ARIA attributes for accessibility
  
  Usage:
  Use with schema format: "template" to render this editor
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		EditorView,
		lineNumbers,
		highlightActiveLineGutter,
		drawSelection,
		highlightSpecialChars,
		highlightActiveLine,
		keymap,
		Decoration,
		type DecorationSet,
		ViewPlugin,
		type ViewUpdate,
		MatchDecorator
	} from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
	import { syntaxHighlighting, defaultHighlightStyle, indentOnInput } from '@codemirror/language';
	import { oneDark } from '@codemirror/theme-one-dark';
	import type { VariableSchema, TemplateVariablesConfig } from '$lib/types/index.js';
	import { createTemplateAutocomplete } from './templateAutocomplete.js';

	interface Props {
		/** Field identifier */
		id: string;
		/** Current template value */
		value: string;
		/** Placeholder text shown when empty */
		placeholder?: string;
		/** Whether the field is required */
		required?: boolean;
		/** Whether to use dark theme */
		darkTheme?: boolean;
		/** Editor height in pixels or CSS value */
		height?: string;
		/**
		 * Configuration for template variable autocomplete.
		 * Controls which variables are available and how they are displayed.
		 */
		variables?: TemplateVariablesConfig;
		/**
		 * Variable schema for advanced autocomplete with nested drilling.
		 * When provided, enables dot notation (user.name) and array access (items[0]).
		 * @deprecated Use `variables.schema` instead
		 */
		variableSchema?: VariableSchema;
		/** Placeholder variable example for the hint */
		placeholderExample?: string;
		/** Whether the field is disabled (read-only) */
		disabled?: boolean;
		/** ARIA description ID */
		ariaDescribedBy?: string;
		/** Callback when value changes */
		onChange: (value: string) => void;
	}

	let {
		id,
		value = '',
		placeholder = 'Enter your template here...\nUse {{ variable }} for dynamic values.',
		required = false,
		darkTheme = false,
		height = '250px',
		variables,
		variableSchema,
		placeholderExample = 'Hello {{ name }}, your order #{{ order_id }} is ready!',
		disabled = false,
		ariaDescribedBy,
		onChange
	}: Props = $props();

	/**
	 * Get the effective variable schema.
	 * Prefers variables.schema, falls back to deprecated variableSchema prop.
	 */
	const effectiveVariableSchema = $derived.by<VariableSchema | undefined>(() => {
		if (variables?.schema && Object.keys(variables.schema.variables).length > 0) {
			return variables.schema;
		}
		if (variableSchema && Object.keys(variableSchema.variables).length > 0) {
			return variableSchema;
		}
		return undefined;
	});

	/**
	 * Whether to show the variable hints section.
	 * Controlled by variables.showHints (defaults to true).
	 */
	const showHints = $derived(variables?.showHints !== false);

	/**
	 * Derive the list of top-level variable names for the hints display.
	 */
	const displayVariables = $derived.by(() => {
		if (effectiveVariableSchema) {
			return Object.keys(effectiveVariableSchema.variables);
		}
		return [];
	});

	/** Reference to the container element */
	let containerRef: HTMLDivElement | undefined = $state(undefined);

	/** CodeMirror editor instance */
	let editorView: EditorView | undefined = $state(undefined);

	/** Flag to prevent update loops */
	let isInternalUpdate = false;

	/**
	 * Create a MatchDecorator for {{ variable }} patterns
	 * This highlights the entire {{ variable }} expression
	 * Supports:
	 * - Simple variables: {{ name }}
	 * - Dot notation: {{ user.name }}, {{ user.address.city }}
	 * - Array access: {{ items[0] }}, {{ items[0].name }}
	 * - Mixed: {{ orders[0].items[1].price }}
	 */
	const variableMatcher = new MatchDecorator({
		// Match {{ variable_name }} patterns with dot notation and array indices
		regexp: /\{\{\s*[\w]+(?:\.[\w]+|\[\d+\]|\[\*\])*\s*\}\}/g,
		decoration: Decoration.mark({ class: 'cm-template-variable' })
	});

	/**
	 * ViewPlugin that applies the variable highlighting decorations
	 */
	const variableHighlighter = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = variableMatcher.createDeco(view);
			}
			update(update: ViewUpdate) {
				this.decorations = variableMatcher.updateDeco(update, this.decorations);
			}
		},
		{
			decorations: (v) => v.decorations
		}
	);

	/**
	 * Handle editor content changes
	 */
	function handleUpdate(update: { docChanged: boolean; state: EditorState }): void {
		if (!update.docChanged || isInternalUpdate) {
			return;
		}

		const content = update.state.doc.toString();
		onChange(content);
	}

	/**
	 * Create editor extensions array for template editing
	 * Includes autocomplete when variables are available
	 * When disabled is true, adds readOnly/editable so the editor cannot be modified
	 */
	function createExtensions() {
		const extensions = [
			// Essential visual features
			lineNumbers(),
			highlightActiveLineGutter(),
			highlightSpecialChars(),
			highlightActiveLine(),
			drawSelection(),

			// Editing features (skip when read-only)
			...(disabled
				? []
				: [
						history(),
						indentOnInput(),
						keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab])
					]),

			// Read-only: prevent document changes and mark content as non-editable
			...(disabled ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []),

			// Syntax highlighting
			syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

			// Template-specific variable highlighter
			variableHighlighter,

			// Update listener (only fires on user edit when not disabled)
			EditorView.updateListener.of(handleUpdate),

			// Custom theme with autocomplete styling
			EditorView.theme({
				'&': {
					height: height,
					fontSize: '0.875rem',
					fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace"
				},
				'.cm-scroller': {
					overflow: 'auto'
				},
				'.cm-content': {
					minHeight: '100px',
					padding: '0.5rem 0'
				},
				'&.cm-focused': {
					outline: 'none'
				},
				'.cm-line': {
					padding: '0 0.5rem'
				},
				// Style for the highlighted {{ variable }} pattern
				'.cm-template-variable': {
					color: '#a855f7',
					backgroundColor: 'rgba(168, 85, 247, 0.1)',
					borderRadius: '3px',
					padding: '1px 2px',
					fontWeight: '500'
				},
				// Autocomplete dropdown styling
				'.cm-tooltip.cm-tooltip-autocomplete': {
					backgroundColor: 'var(--fd-background, #ffffff)',
					border: '1px solid var(--fd-border, #e5e7eb)',
					borderRadius: 'var(--fd-radius-lg, 0.5rem)',
					boxShadow: 'var(--fd-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
					padding: '0.25rem',
					maxHeight: '200px',
					overflow: 'auto'
				},
				'.cm-tooltip.cm-tooltip-autocomplete > ul': {
					fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace",
					fontSize: '0.8125rem'
				},
				'.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
					padding: '0.375rem 0.625rem',
					borderRadius: 'var(--fd-radius-md, 0.375rem)',
					display: 'flex',
					alignItems: 'center',
					gap: '0.5rem'
				},
				'.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
					backgroundColor: 'var(--fd-accent-muted, rgba(168, 85, 247, 0.1))',
					color: 'var(--fd-accent-hover, #7c3aed)'
				},
				'.cm-completionLabel': {
					flex: '1'
				},
				'.cm-completionDetail': {
					fontSize: '0.6875rem',
					color: 'var(--fd-muted-foreground, #6b7280)',
					opacity: '0.8'
				}
			}),
			EditorView.lineWrapping,
			EditorState.tabSize.of(2)
		];

		// Add autocomplete extension when variables are available (and not disabled)
		if (!disabled) {
			if (effectiveVariableSchema) {
				// Use full autocomplete with nested drilling
				extensions.push(createTemplateAutocomplete(effectiveVariableSchema));
			}
		}

		if (darkTheme) {
			extensions.push(oneDark);
			// Add dark theme override for variable highlighting and autocomplete
			extensions.push(
				EditorView.theme({
					'.cm-template-variable': {
						color: '#c084fc',
						backgroundColor: 'rgba(192, 132, 252, 0.15)'
					},
					'.cm-tooltip.cm-tooltip-autocomplete': {
						backgroundColor: '#1e1e1e',
						border: '1px solid #3e4451',
						boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
					},
					'.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
						backgroundColor: 'rgba(192, 132, 252, 0.2)',
						color: '#c084fc'
					}
				})
			);
		}

		return extensions;
	}

	/**
	 * Insert a variable placeholder at current cursor position
	 */
	function insertVariable(varName: string): void {
		if (!editorView) {
			return;
		}

		const insertText = `{{ ${varName} }}`;
		const { from, to } = editorView.state.selection.main;

		editorView.dispatch({
			changes: { from, to, insert: insertText },
			selection: { anchor: from + insertText.length }
		});

		editorView.focus();
	}

	/**
	 * Initialize CodeMirror editor on mount
	 */
	onMount(() => {
		if (!containerRef) {
			return;
		}

		editorView = new EditorView({
			state: EditorState.create({
				doc: value,
				extensions: createExtensions()
			}),
			parent: containerRef
		});
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

		const currentContent = editorView.state.doc.toString();

		// Only update if content actually changed and wasn't from internal edit
		if (value !== currentContent && !isInternalUpdate) {
			isInternalUpdate = true;
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: value
				}
			});
			isInternalUpdate = false;
		}
	});
</script>

<div class="form-template-editor">
	<!-- Hidden input for form submission compatibility -->
	<input
		type="hidden"
		{id}
		name={id}
		{value}
		aria-describedby={ariaDescribedBy}
		aria-required={required}
	/>

	<!-- CodeMirror container -->
	<div
		bind:this={containerRef}
		class="form-template-editor__container"
		class:form-template-editor__container--dark={darkTheme}
		role="textbox"
		aria-multiline="true"
		aria-label="Template editor"
	></div>

	<!-- Variable hints section (shown when variables are available and showHints is true) -->
	{#if showHints && displayVariables.length > 0}
		<div class="form-template-editor__hints">
			<span class="form-template-editor__hints-label">Available variables:</span>
			<div class="form-template-editor__hints-list">
				{#each displayVariables as varName (varName)}
					<button
						type="button"
						class="form-template-editor__hint-btn"
						onclick={() => insertVariable(varName)}
						title={`Insert {{ ${varName} }}`}
					>
						<code>{'{{ '}{varName}{' }}'}</code>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Placeholder hint when empty -->
	{#if !value && placeholderExample}
		<div class="form-template-editor__placeholder">
			<span class="form-template-editor__placeholder-label">Example template:</span>
			<code class="form-template-editor__placeholder-example">{placeholderExample}</code>
		</div>
	{/if}

	<!-- Syntax help -->
	<div class="form-template-editor__help">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			class="form-template-editor__help-icon"
		>
			<path
				fill-rule="evenodd"
				d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
				clip-rule="evenodd"
			/>
		</svg>
		<span
			>Use <code>{'{{ variable }}'}</code> syntax to insert dynamic values from the data input</span
		>
	</div>
</div>

<style>
	.form-template-editor {
		position: relative;
		width: 100%;
	}

	.form-template-editor__container {
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		overflow: hidden;
		background-color: var(--fd-muted);
		transition: all var(--fd-transition-normal);
		box-shadow: var(--fd-shadow-sm);
	}

	.form-template-editor__container:hover {
		border-color: var(--fd-border-strong);
		background-color: var(--fd-background);
	}

	.form-template-editor__container:focus-within {
		border-color: var(--fd-accent);
		background-color: var(--fd-background);
		box-shadow:
			0 0 0 3px rgba(168, 85, 247, 0.12),
			var(--fd-shadow-sm);
	}

	/* Dark theme overrides */
	.form-template-editor__container--dark {
		background-color: #282c34;
	}

	.form-template-editor__container--dark:hover,
	.form-template-editor__container--dark:focus-within {
		background-color: #282c34;
	}

	/* CodeMirror styling overrides */
	.form-template-editor__container :global(.cm-editor) {
		border-radius: var(--fd-radius-lg);
	}

	.form-template-editor__container :global(.cm-gutters) {
		background-color: var(--fd-subtle);
		border-right: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg) 0 0 var(--fd-radius-lg);
	}

	.form-template-editor__container--dark :global(.cm-gutters) {
		background-color: #21252b;
		border-right-color: #3e4451;
	}

	/* Variable hints section */
	.form-template-editor__hints {
		margin-top: 0.625rem;
		padding: 0.625rem;
		background-color: var(--fd-accent-muted);
		border: 1px solid var(--fd-accent);
		border-radius: var(--fd-radius-md);
	}

	.form-template-editor__hints-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--fd-accent-hover);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.375rem;
	}

	.form-template-editor__hints-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.form-template-editor__hint-btn {
		padding: 0.25rem 0.5rem;
		background-color: var(--fd-accent-muted);
		border: 1px solid var(--fd-accent);
		border-radius: var(--fd-radius-sm);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
	}

	.form-template-editor__hint-btn:hover {
		background-color: var(--fd-accent);
		border-color: var(--fd-accent-hover);
	}

	.form-template-editor__hint-btn:active {
		transform: scale(0.98);
	}

	.form-template-editor__hint-btn code {
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: 0.6875rem;
		color: var(--fd-accent-hover);
	}

	/* Placeholder hint */
	.form-template-editor__placeholder {
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-muted);
		border: 1px dashed var(--fd-border-strong);
		border-radius: var(--fd-radius-md);
	}

	.form-template-editor__placeholder-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--fd-muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}

	.form-template-editor__placeholder-example {
		display: block;
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: var(--fd-text-xs);
		color: var(--fd-foreground);
		word-break: break-all;
	}

	/* Help text */
	.form-template-editor__help {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
		margin-top: 0.5rem;
		font-size: 0.6875rem;
		color: var(--fd-muted-foreground);
	}

	.form-template-editor__help-icon {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}

	.form-template-editor__help code {
		padding: 0.0625rem 0.25rem;
		background-color: var(--fd-subtle);
		border-radius: var(--fd-radius-sm);
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: 0.625rem;
	}
</style>

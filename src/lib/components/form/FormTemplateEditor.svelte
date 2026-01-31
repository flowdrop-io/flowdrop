<!--
  FormTemplateEditor Component
  CodeMirror-based template editor for Twig/Liquid-style templates
  
  Features:
  - Custom syntax highlighting for {{ variable }} placeholders
  - Dark/light theme support
  - Consistent styling with other form components
  - Line wrapping for better template readability
  - Optional variable hints display
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
		/** Available variable names for hints (optional) */
		variableHints?: string[];
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
		variableHints = [],
		placeholderExample = 'Hello {{ name }}, your order #{{ order_id }} is ready!',
		disabled = false,
		ariaDescribedBy,
		onChange
	}: Props = $props();

	/** Reference to the container element */
	let containerRef: HTMLDivElement | undefined = $state(undefined);

	/** CodeMirror editor instance */
	let editorView: EditorView | undefined = $state(undefined);

	/** Flag to prevent update loops */
	let isInternalUpdate = false;

	/**
	 * Create a MatchDecorator for {{ variable }} patterns
	 * This highlights the entire {{ variable }} expression
	 */
	const variableMatcher = new MatchDecorator({
		// Match {{ variable_name }} patterns (with optional whitespace)
		regexp: /\{\{\s*[\w.]+\s*\}\}/g,
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
	 * Uses minimal setup for better performance (no auto-closing brackets, no autocompletion)
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

			// Custom theme
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
				}
			}),
			EditorView.lineWrapping,
			EditorState.tabSize.of(2)
		];

		if (darkTheme) {
			extensions.push(oneDark);
			// Add dark theme override for variable highlighting
			extensions.push(
				EditorView.theme({
					'.cm-template-variable': {
						color: '#c084fc',
						backgroundColor: 'rgba(192, 132, 252, 0.15)'
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

	<!-- Variable hints section (shown when variables are available) -->
	{#if variableHints.length > 0}
		<div class="form-template-editor__hints">
			<span class="form-template-editor__hints-label">Available variables:</span>
			<div class="form-template-editor__hints-list">
				{#each variableHints as varName (varName)}
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

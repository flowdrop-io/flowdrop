<!--
  FormMarkdownEditor Component
  EasyMDE-based Markdown editor for rich text content
  
  Features:
  - Full Markdown editing with EasyMDE (fork of SimpleMDE)
  - Live preview with syntax highlighting
  - Toolbar with common formatting options
  - Autosave support (optional)
  - Spell checking
  - Consistent styling with other form components
  - Proper ARIA attributes for accessibility
  - SSR-safe: Only loads EasyMDE on the client side
  
  Usage:
  Use with schema format: "markdown" to render this editor
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type EasyMDEConstructor from 'easymde';

	/** EasyMDE instance type */
	type EasyMDEInstance = EasyMDEConstructor;

	interface Props {
		/** Field identifier */
		id: string;
		/** Current value (markdown string) */
		value: string;
		/** Placeholder text shown when empty */
		placeholder?: string;
		/** Whether the field is required */
		required?: boolean;
		/** Editor height - "auto" or specific value like "300px" */
		height?: string;
		/** Whether to show the toolbar */
		showToolbar?: boolean;
		/** Whether to show the status bar */
		showStatusBar?: boolean;
		/** Whether to enable spell checking */
		spellChecker?: boolean;
		/** Whether to enable autosave */
		autosave?: boolean;
		/** Autosave delay in milliseconds */
		autosaveDelay?: number;
		/** ARIA description ID */
		ariaDescribedBy?: string;
		/** Callback when value changes */
		onChange: (value: string) => void;
	}

	let {
		id,
		value = '',
		placeholder = 'Write your markdown here...',
		required = false,
		height = '300px',
		showToolbar = true,
		showStatusBar = true,
		spellChecker = false,
		autosave = false,
		autosaveDelay = 10000,
		ariaDescribedBy,
		onChange
	}: Props = $props();

	/** Reference to the textarea element */
	let textareaRef: HTMLTextAreaElement | undefined = $state(undefined);

	/** EasyMDE editor instance */
	let easymde: EasyMDEInstance | undefined = $state(undefined);

	/** Loading state for the editor */
	let isLoading = $state(true);

	/** Flag to prevent update loops */
	let isInternalUpdate = false;

	/**
	 * Custom toolbar configuration
	 * Provides a clean set of commonly used formatting options
	 */
	const toolbarConfig = [
		'bold',
		'italic',
		'strikethrough',
		'|',
		'heading-1',
		'heading-2',
		'heading-3',
		'|',
		'quote',
		'unordered-list',
		'ordered-list',
		'|',
		'link',
		'image',
		'table',
		'|',
		'preview',
		'side-by-side',
		'fullscreen',
		'|',
		'guide'
	] as const;

	/**
	 * Initialize EasyMDE editor on mount (client-side only)
	 */
	onMount(async () => {
		// Only run in browser environment
		if (!browser || !textareaRef) {
			isLoading = false;
			return;
		}

		try {
			// Dynamically import EasyMDE and its styles (client-side only)
			const [EasyMDE] = await Promise.all([
				import('easymde').then((m) => m.default),
				import('easymde/dist/easymde.min.css')
			]);

			// Build autosave config if enabled
			const autosaveConfig = autosave
				? {
						enabled: true,
						uniqueId: `flowdrop-markdown-${id}`,
						delay: autosaveDelay
					}
				: undefined;

			// Create EasyMDE instance
			easymde = new EasyMDE({
				element: textareaRef,
				initialValue: value,
				placeholder: placeholder,
				spellChecker: spellChecker,
				autosave: autosaveConfig,
				toolbar: showToolbar ? [...toolbarConfig] : false,
				status: showStatusBar,
				forceSync: true,
				minHeight: height,
				renderingConfig: {
					singleLineBreaks: false,
					codeSyntaxHighlighting: true
				},
				shortcuts: {
					toggleBold: 'Cmd-B',
					toggleItalic: 'Cmd-I',
					toggleStrikethrough: 'Cmd-Alt-S',
					toggleHeadingSmaller: 'Cmd-H',
					toggleHeadingBigger: 'Shift-Cmd-H',
					toggleCodeBlock: 'Cmd-Alt-C',
					toggleBlockquote: "Cmd-'",
					toggleOrderedList: 'Cmd-Alt-L',
					toggleUnorderedList: 'Cmd-L',
					cleanBlock: 'Cmd-E',
					drawLink: 'Cmd-K',
					drawImage: 'Cmd-Alt-I',
					drawTable: 'Cmd-Alt-T',
					togglePreview: 'Cmd-P',
					toggleSideBySide: 'F9',
					toggleFullScreen: 'F11'
				}
			});

			// Listen for changes
			easymde.codemirror.on('change', () => {
				if (isInternalUpdate) {
					return;
				}

				const newValue = easymde?.value() ?? '';
				onChange(newValue);
			});

			isLoading = false;
		} catch (error) {
			console.error('Failed to load EasyMDE:', error);
			isLoading = false;
		}
	});

	/**
	 * Clean up editor on destroy
	 */
	onDestroy(() => {
		if (easymde) {
			easymde.toTextArea();
		}
	});

	/**
	 * Update editor content when value prop changes externally
	 */
	$effect(() => {
		if (!easymde) {
			return;
		}

		const currentValue = easymde.value();

		// Only update if content actually changed and wasn't from internal edit
		if (value !== currentValue && !isInternalUpdate) {
			isInternalUpdate = true;
			easymde.value(value);
			isInternalUpdate = false;
		}
	});
</script>

<div class="form-markdown-editor" style="--editor-height: {height}">
	<!-- Hidden input for form submission compatibility -->
	<input
		type="hidden"
		{id}
		name={id}
		{value}
		aria-describedby={ariaDescribedBy}
		aria-required={required}
	/>

	<!-- Loading state -->
	{#if isLoading}
		<div class="form-markdown-editor__loading">
			<div class="form-markdown-editor__spinner"></div>
			<span>Loading editor...</span>
		</div>
	{/if}

	<!-- EasyMDE textarea container -->
	<textarea
		bind:this={textareaRef}
		aria-label="Markdown editor"
		class:form-markdown-editor__textarea--hidden={!isLoading && easymde}>{value}</textarea
	>
</div>

<style>
	.form-markdown-editor {
		position: relative;
		width: 100%;
	}

	/* Loading state */
	.form-markdown-editor__loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		background-color: var(--color-ref-gray-50, #f9fafb);
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		color: var(--color-ref-gray-500, #6b7280);
		font-size: 0.875rem;
	}

	.form-markdown-editor__spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--color-ref-gray-200, #e5e7eb);
		border-top-color: var(--color-ref-blue-500, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Hide the raw textarea when editor is loaded */
	.form-markdown-editor__textarea--hidden {
		display: none;
	}

	/* Fallback textarea styling (shown during loading or if editor fails) */
	.form-markdown-editor textarea:not(.form-markdown-editor__textarea--hidden) {
		width: 100%;
		min-height: var(--editor-height, 300px);
		padding: 0.75rem;
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		resize: vertical;
		background-color: var(--color-ref-gray-50, #f9fafb);
	}

	/* EasyMDE container styling */
	.form-markdown-editor :global(.CodeMirror) {
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-top: none;
		border-radius: 0;
		background-color: var(--color-ref-gray-50, #f9fafb);
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: 0.875rem;
		min-height: var(--editor-height, 300px);
		transition: border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Header styling inside the editor - keep sizes reasonable */
	.form-markdown-editor :global(.cm-header-1) {
		font-size: 1.25rem;
		line-height: 1.4;
	}

	.form-markdown-editor :global(.cm-header-2) {
		font-size: 1.125rem;
		line-height: 1.4;
	}

	.form-markdown-editor :global(.cm-header-3) {
		font-size: 1rem;
		line-height: 1.4;
	}

	.form-markdown-editor :global(.cm-header-4),
	.form-markdown-editor :global(.cm-header-5),
	.form-markdown-editor :global(.cm-header-6) {
		font-size: 0.9375rem;
		line-height: 1.4;
	}

	/* Keep all headers in monospace and reasonable weight */
	.form-markdown-editor :global(.cm-header) {
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-weight: 600;
		color: var(--color-ref-gray-900, #111827);
	}

	.form-markdown-editor :global(.CodeMirror:hover) {
		border-color: var(--color-ref-gray-300, #d1d5db);
	}

	.form-markdown-editor :global(.CodeMirror-focused) {
		border-color: var(--color-ref-blue-500, #3b82f6);
		background-color: #ffffff;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.12),
			0 1px 2px rgba(0, 0, 0, 0.04);
	}

	/* Editor wrapper */
	.form-markdown-editor :global(.editor-toolbar) {
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-bottom: none;
		border-radius: 0.5rem 0.5rem 0 0;
		background-color: var(--color-ref-gray-100, #f3f4f6);
		padding: 0.5rem;
	}

	.form-markdown-editor :global(.editor-toolbar::before),
	.form-markdown-editor :global(.editor-toolbar::after) {
		display: none;
	}

	/* Toolbar buttons */
	.form-markdown-editor :global(.editor-toolbar button) {
		color: var(--color-ref-gray-600, #4b5563);
		border: none;
		border-radius: 0.375rem;
		width: 2rem;
		height: 2rem;
		transition: all 0.15s ease;
	}

	.form-markdown-editor :global(.editor-toolbar button:hover) {
		background-color: var(--color-ref-gray-200, #e5e7eb);
		color: var(--color-ref-gray-900, #111827);
	}

	.form-markdown-editor :global(.editor-toolbar button.active) {
		background-color: var(--color-ref-blue-100, #dbeafe);
		color: var(--color-ref-blue-700, #1d4ed8);
	}

	/* Separator */
	.form-markdown-editor :global(.editor-toolbar i.separator) {
		border-left: 1px solid var(--color-ref-gray-300, #d1d5db);
		margin: 0 0.25rem;
	}

	/* Status bar */
	.form-markdown-editor :global(.editor-statusbar) {
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-top: none;
		border-radius: 0 0 0.5rem 0.5rem;
		background-color: var(--color-ref-gray-50, #f9fafb);
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		color: var(--color-ref-gray-500, #6b7280);
	}

	/* Preview pane */
	.form-markdown-editor :global(.editor-preview) {
		background-color: #ffffff;
		padding: 1rem;
		font-family: inherit;
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-ref-gray-900, #111827);
	}

	.form-markdown-editor :global(.editor-preview h1),
	.form-markdown-editor :global(.editor-preview h2),
	.form-markdown-editor :global(.editor-preview h3),
	.form-markdown-editor :global(.editor-preview h4),
	.form-markdown-editor :global(.editor-preview h5),
	.form-markdown-editor :global(.editor-preview h6) {
		margin-top: 1.5em;
		margin-bottom: 0.5em;
		font-weight: 600;
		color: var(--color-ref-gray-900, #111827);
	}

	.form-markdown-editor :global(.editor-preview h1) {
		font-size: 1.5rem;
		border-bottom: 1px solid var(--color-ref-gray-200, #e5e7eb);
		padding-bottom: 0.5rem;
	}

	.form-markdown-editor :global(.editor-preview h2) {
		font-size: 1.25rem;
	}

	.form-markdown-editor :global(.editor-preview h3) {
		font-size: 1.125rem;
	}

	.form-markdown-editor :global(.editor-preview p) {
		margin: 0.75em 0;
	}

	.form-markdown-editor :global(.editor-preview code) {
		padding: 0.125rem 0.375rem;
		background-color: var(--color-ref-gray-100, #f3f4f6);
		border-radius: 0.25rem;
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
		font-size: 0.8125rem;
	}

	.form-markdown-editor :global(.editor-preview pre) {
		padding: 1rem;
		background-color: var(--color-ref-gray-900, #111827);
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	.form-markdown-editor :global(.editor-preview pre code) {
		padding: 0;
		background-color: transparent;
		color: var(--color-ref-gray-100, #f3f4f6);
	}

	.form-markdown-editor :global(.editor-preview blockquote) {
		margin: 1rem 0;
		padding: 0.5rem 1rem;
		border-left: 4px solid var(--color-ref-blue-500, #3b82f6);
		background-color: var(--color-ref-blue-50, #eff6ff);
		color: var(--color-ref-gray-700, #374151);
	}

	.form-markdown-editor :global(.editor-preview ul),
	.form-markdown-editor :global(.editor-preview ol) {
		margin: 0.75em 0;
		padding-left: 1.5rem;
	}

	.form-markdown-editor :global(.editor-preview li) {
		margin: 0.25em 0;
	}

	.form-markdown-editor :global(.editor-preview a) {
		color: var(--color-ref-blue-600, #2563eb);
		text-decoration: underline;
	}

	.form-markdown-editor :global(.editor-preview a:hover) {
		color: var(--color-ref-blue-700, #1d4ed8);
	}

	.form-markdown-editor :global(.editor-preview table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	.form-markdown-editor :global(.editor-preview th),
	.form-markdown-editor :global(.editor-preview td) {
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		padding: 0.5rem 0.75rem;
		text-align: left;
	}

	.form-markdown-editor :global(.editor-preview th) {
		background-color: var(--color-ref-gray-100, #f3f4f6);
		font-weight: 600;
	}

	.form-markdown-editor :global(.editor-preview img) {
		max-width: 100%;
		border-radius: 0.5rem;
	}

	/* Side-by-side mode */
	.form-markdown-editor :global(.CodeMirror-sided) {
		width: 50% !important;
	}

	.form-markdown-editor :global(.editor-preview-side) {
		width: 50%;
		border: 1px solid var(--color-ref-gray-200, #e5e7eb);
		border-left: none;
		border-radius: 0 0 0.5rem 0;
	}

	/* Fullscreen mode adjustments */
	.form-markdown-editor :global(.editor-toolbar.fullscreen) {
		border-radius: 0;
	}

	.form-markdown-editor :global(.CodeMirror-fullscreen) {
		border-radius: 0;
	}

	/* Placeholder */
	.form-markdown-editor :global(.CodeMirror .CodeMirror-placeholder) {
		color: var(--color-ref-gray-400, #9ca3af);
		font-style: italic;
	}

	/* EasyMDE specific wrapper */
	.form-markdown-editor :global(.EasyMDEContainer) {
		width: 100%;
	}

	/* When no status bar, CodeMirror gets bottom rounded corners */
	.form-markdown-editor :global(.EasyMDEContainer:not(:has(.editor-statusbar)) .CodeMirror) {
		border-radius: 0 0 0.5rem 0.5rem;
	}

	/* When status bar exists, it gets the bottom rounded corners */
	.form-markdown-editor :global(.EasyMDEContainer:has(.editor-statusbar) .CodeMirror) {
		border-bottom: none;
	}
</style>

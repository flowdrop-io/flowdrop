<!--
  CodeEditor Component
  Full-featured code editor with syntax highlighting using CodeMirror 6
  
  Features:
  - Syntax highlighting for multiple languages (JSON, JavaScript, TypeScript, Python, etc.)
  - Line numbers
  - Dark/light theme support
  - Real-time validation (for JSON)
  - Linting and error display
  - Auto-formatting on blur (optional)
  - Customizable height and styling
  - Proper ARIA attributes for accessibility
  - Bindable value for two-way data binding
  
  Usage:
  ```svelte
  <CodeEditor
    bind:value={jsonString}
    language="json"
    showLineNumbers={true}
    darkTheme={false}
    onChange={(value) => console.log(value)}
  />
  ```
  
  Dependencies (optional, for full features):
  - codemirror: Core editor
  - @codemirror/state: Editor state management
  - @codemirror/lang-json: JSON language support
  - @codemirror/lang-javascript: JavaScript/TypeScript support
  - @codemirror/lang-python: Python support
  - @codemirror/lint: Linting support
  - @codemirror/theme-one-dark: Dark theme
-->

<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import type { EditorView } from "@codemirror/view";

	/**
	 * Supported language types
	 */
	type SupportedLanguage = "json" | "javascript" | "typescript" | "python" | "html" | "css" | "markdown" | "xml" | "sql" | "plaintext";

	/**
	 * Props interface for CodeEditor component
	 */
	interface Props {
		/** The code string value (bindable for two-way binding) */
		value?: string;
		/** Programming language for syntax highlighting */
		language?: SupportedLanguage;
		/** Placeholder text shown when empty */
		placeholder?: string;
		/** Whether the editor is read-only */
		readOnly?: boolean;
		/** Whether to show line numbers */
		showLineNumbers?: boolean;
		/** Whether to use dark theme */
		darkTheme?: boolean;
		/** Custom height (CSS value or number in pixels) */
		height?: string | number;
		/** Minimum height (CSS value or number in pixels) */
		minHeight?: string | number;
		/** Maximum height (CSS value or number in pixels) */
		maxHeight?: string | number;
		/** Whether to enable linting (currently only for JSON) */
		enableLinting?: boolean;
		/** Whether to auto-format on blur */
		autoFormat?: boolean;
		/** Tab size for indentation (default: 2) */
		tabSize?: number;
		/** Custom CSS class for the container */
		className?: string;
		/** Unique ID for the editor */
		id?: string;
		/** ARIA label for accessibility */
		ariaLabel?: string;
		/** ARIA described-by ID for accessibility */
		ariaDescribedBy?: string;
		/** Callback when value changes */
		onChange?: (value: string) => void;
		/** Callback when editor is focused */
		onFocus?: () => void;
		/** Callback when editor loses focus */
		onBlur?: () => void;
		/** Callback when validation state changes (for JSON) */
		onValidate?: (isValid: boolean, error: string | null) => void;
	}

	let {
		value = "",
		language = "json",
		placeholder = "",
		readOnly = false,
		showLineNumbers = true,
		darkTheme = false,
		height,
		minHeight = "100px",
		maxHeight = "500px",
		enableLinting = true,
		autoFormat = false,
		tabSize = 2,
		className = "",
		id,
		ariaLabel = "Code editor",
		ariaDescribedBy,
		onChange,
		onFocus,
		onBlur,
		onValidate
	}: Props = $props();

	/** Container element for the editor */
	let editorContainer: HTMLDivElement | null = $state(null);

	/** CodeMirror EditorView instance */
	let editor: EditorView | null = $state(null);

	/** Whether CodeMirror is loaded and available */
	let isLoaded = $state(false);

	/** Loading error message */
	let loadError = $state<string | null>(null);

	/** Validation error message */
	let validationError = $state<string | null>(null);

	/** Whether the value is valid (for JSON) */
	let isValid = $state(true);

	/**
	 * Computed height style
	 */
	const heightStyle = $derived(
		height !== undefined
			? typeof height === "number"
				? `${height}px`
				: height
			: "auto"
	);

	/**
	 * Computed min-height style
	 */
	const minHeightStyle = $derived(
		typeof minHeight === "number" ? `${minHeight}px` : minHeight
	);

	/**
	 * Computed max-height style
	 */
	const maxHeightStyle = $derived(
		typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight
	);

	/**
	 * Validate JSON content
	 * @param content - JSON string to validate
	 * @returns Validation result with isValid flag and optional error message
	 */
	function validateJson(content: string): { isValid: boolean; error: string | null } {
		if (!content.trim()) {
			return { isValid: true, error: null };
		}

		try {
			JSON.parse(content);
			return { isValid: true, error: null };
		} catch (e) {
			const error = e instanceof Error ? e.message : "Invalid JSON";
			return { isValid: false, error };
		}
	}

	/**
	 * Format JSON content
	 * @param content - JSON string to format
	 * @returns Formatted JSON string or original if invalid
	 */
	function formatJson(content: string): string {
		if (!content.trim()) {
			return content;
		}

		try {
			const parsed = JSON.parse(content);
			return JSON.stringify(parsed, null, tabSize);
		} catch {
			return content;
		}
	}

	/**
	 * Update the editor value programmatically
	 * @param newValue - New value to set
	 */
	function updateEditorValue(newValue: string): void {
		if (!editor) return;

		const currentValue = editor.state.doc.toString();
		if (currentValue !== newValue) {
			editor.dispatch({
				changes: {
					from: 0,
					to: currentValue.length,
					insert: newValue
				}
			});
		}
	}

	/**
	 * Handle value changes from the editor
	 * @param newValue - New value from editor
	 */
	function handleValueChange(newValue: string): void {
		value = newValue;

		// Validate if JSON and linting enabled
		if (language === "json" && enableLinting) {
			const result = validateJson(newValue);
			isValid = result.isValid;
			validationError = result.error;
			onValidate?.(result.isValid, result.error);
		}

		onChange?.(newValue);
	}

	/**
	 * Handle blur event - auto-format if enabled
	 */
	function handleBlur(): void {
		if (autoFormat && language === "json" && isValid && editor) {
			const formatted = formatJson(value);
			if (formatted !== value) {
				updateEditorValue(formatted);
				value = formatted;
				onChange?.(formatted);
			}
		}
		onBlur?.();
	}

	/**
	 * Initialize CodeMirror editor
	 */
	async function initializeEditor(): Promise<void> {
		if (!editorContainer) return;

		try {
			// Dynamically import CodeMirror modules
			const [
				{ EditorView, basicSetup },
				{ EditorState },
				{ placeholder: placeholderExt }
			] = await Promise.all([
				import("codemirror"),
				import("@codemirror/state"),
				import("@codemirror/view")
			]);

			// Build extensions array
			const extensions = [
				basicSetup,
				EditorView.lineWrapping,
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						handleValueChange(update.state.doc.toString());
					}
				}),
				EditorView.domEventHandlers({
					focus: () => {
						onFocus?.();
						return false;
					},
					blur: () => {
						handleBlur();
						return false;
					}
				})
			];

			// Add placeholder if provided
			if (placeholder) {
				extensions.push(placeholderExt(placeholder));
			}

			// Add read-only extension if needed
			if (readOnly) {
				extensions.push(EditorState.readOnly.of(true));
			}

			// Add tab size
			extensions.push(EditorState.tabSize.of(tabSize));

			// Add language support based on selected language
			try {
				switch (language) {
					case "json": {
						const { json, jsonParseLinter } = await import("@codemirror/lang-json");
						extensions.push(json());
						if (enableLinting) {
							const { linter, lintGutter } = await import("@codemirror/lint");
							extensions.push(linter(jsonParseLinter()), lintGutter());
						}
						break;
					}
					case "javascript":
					case "typescript": {
						const { javascript } = await import("@codemirror/lang-javascript");
						extensions.push(javascript({ typescript: language === "typescript" }));
						break;
					}
					case "python": {
						const { python } = await import("@codemirror/lang-python");
						extensions.push(python());
						break;
					}
					case "html": {
						const { html } = await import("@codemirror/lang-html");
						extensions.push(html());
						break;
					}
					case "css": {
						const { css } = await import("@codemirror/lang-css");
						extensions.push(css());
						break;
					}
					case "markdown": {
						const { markdown } = await import("@codemirror/lang-markdown");
						extensions.push(markdown());
						break;
					}
					case "xml": {
						const { xml } = await import("@codemirror/lang-xml");
						extensions.push(xml());
						break;
					}
					case "sql": {
						const { sql } = await import("@codemirror/lang-sql");
						extensions.push(sql());
						break;
					}
					// plaintext - no language extension needed
				}
			} catch {
				console.warn(`Language support for "${language}" not available. Install the appropriate @codemirror/lang-* package.`);
			}

			// Add dark theme if enabled
			if (darkTheme) {
				try {
					const { oneDark } = await import("@codemirror/theme-one-dark");
					extensions.push(oneDark);
				} catch {
					console.warn("Dark theme not available. Install @codemirror/theme-one-dark for dark theme support.");
				}
			}

			// Add line numbers extension based on prop
			if (!showLineNumbers) {
				// Line numbers are included in basicSetup, so we need to disable them
				// This is handled through CSS instead
			}

			// Create editor state
			const state = EditorState.create({
				doc: value,
				extensions
			});

			// Create editor view
			editor = new EditorView({
				state,
				parent: editorContainer
			});

			// Initial validation for JSON
			if (language === "json" && enableLinting) {
				const result = validateJson(value);
				isValid = result.isValid;
				validationError = result.error;
				onValidate?.(result.isValid, result.error);
			}

			isLoaded = true;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : "Unknown error";
			loadError = `Failed to load CodeMirror: ${errorMessage}. Install required packages: npm install codemirror @codemirror/state @codemirror/view`;
			console.error("CodeEditor initialization failed:", e);
		}
	}

	/**
	 * Public method to get current value
	 */
	export function getValue(): string {
		return editor ? editor.state.doc.toString() : value;
	}

	/**
	 * Public method to set value
	 */
	export function setValue(newValue: string): void {
		value = newValue;
		updateEditorValue(newValue);
	}

	/**
	 * Public method to focus the editor
	 */
	export function focus(): void {
		editor?.focus();
	}

	/**
	 * Public method to format the content (for JSON)
	 */
	export function format(): void {
		if (language === "json" && isValid) {
			const formatted = formatJson(value);
			if (formatted !== value) {
				setValue(formatted);
				onChange?.(formatted);
			}
		}
	}

	/**
	 * Sync external value changes to editor
	 */
	$effect(() => {
		if (editor && value !== editor.state.doc.toString()) {
			updateEditorValue(value);
		}
	});

	/**
	 * Lifecycle: Initialize editor on mount
	 */
	onMount(() => {
		initializeEditor();
	});

	/**
	 * Lifecycle: Cleanup on destroy
	 */
	onDestroy(() => {
		if (editor) {
			editor.destroy();
			editor = null;
		}
	});
</script>

<div
	class="flowdrop-code-editor {className}"
	class:flowdrop-code-editor--dark={darkTheme}
	class:flowdrop-code-editor--readonly={readOnly}
	class:flowdrop-code-editor--error={!isValid}
	class:flowdrop-code-editor--no-line-numbers={!showLineNumbers}
	style:--fd-editor-height={heightStyle}
	style:--fd-editor-min-height={minHeightStyle}
	style:--fd-editor-max-height={maxHeightStyle}
	{id}
>
	<!-- Editor container -->
	<div
		class="flowdrop-code-editor__container"
		bind:this={editorContainer}
		role="textbox"
		aria-label={ariaLabel}
		aria-describedby={ariaDescribedBy}
		aria-readonly={readOnly}
		aria-invalid={!isValid}
	>
		{#if !isLoaded && !loadError}
			<div class="flowdrop-code-editor__loading">
				<span>Loading editor...</span>
			</div>
		{/if}
	</div>

	<!-- Error display -->
	{#if loadError}
		<div class="flowdrop-code-editor__load-error" role="alert">
			<p>{loadError}</p>
			<!-- Fallback textarea -->
			<textarea
				class="flowdrop-code-editor__fallback"
				bind:value={value}
				{placeholder}
				readonly={readOnly}
				aria-label={ariaLabel}
				oninput={(e) => {
					const target = e.target as HTMLTextAreaElement;
					handleValueChange(target.value);
				}}
				onfocus={() => onFocus?.()}
				onblur={() => handleBlur()}
			></textarea>
		</div>
	{/if}

	<!-- Validation error indicator -->
	{#if validationError && enableLinting}
		<div class="flowdrop-code-editor__validation-error" role="alert">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
			<span>{validationError}</span>
		</div>
	{/if}
</div>

<style>
	/* Container styles */
	.flowdrop-code-editor {
		--fd-editor-bg: #ffffff;
		--fd-editor-border: #e5e7eb;
		--fd-editor-text: #1f2937;
		--fd-editor-selection-bg: #3b82f620;
		--fd-editor-cursor: #1f2937;
		--fd-editor-gutter-bg: #f9fafb;
		--fd-editor-gutter-text: #9ca3af;
		--fd-editor-error-border: #ef4444;
		--fd-editor-error-bg: #fef2f2;
		--fd-editor-error-text: #dc2626;
		--fd-editor-font: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

		display: flex;
		flex-direction: column;
		border: 1px solid var(--fd-editor-border);
		border-radius: 0.5rem;
		overflow: hidden;
		background-color: var(--fd-editor-bg);
		font-family: var(--fd-editor-font);
	}

	/* Dark theme */
	.flowdrop-code-editor--dark {
		--fd-editor-bg: #1e1e1e;
		--fd-editor-border: #3c3c3c;
		--fd-editor-text: #d4d4d4;
		--fd-editor-selection-bg: #264f7820;
		--fd-editor-cursor: #d4d4d4;
		--fd-editor-gutter-bg: #1e1e1e;
		--fd-editor-gutter-text: #858585;
		--fd-editor-error-bg: #2d1f1f;
		--fd-editor-error-text: #f87171;
	}

	/* Error state */
	.flowdrop-code-editor--error {
		border-color: var(--fd-editor-error-border);
	}

	/* Editor container */
	.flowdrop-code-editor__container {
		position: relative;
		height: var(--fd-editor-height);
		min-height: var(--fd-editor-min-height);
		max-height: var(--fd-editor-max-height);
		overflow: auto;
	}

	/* CodeMirror overrides */
	.flowdrop-code-editor__container :global(.cm-editor) {
		height: 100%;
		font-family: var(--fd-editor-font);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.flowdrop-code-editor__container :global(.cm-editor.cm-focused) {
		outline: none;
	}

	.flowdrop-code-editor__container :global(.cm-scroller) {
		overflow: auto;
	}

	.flowdrop-code-editor__container :global(.cm-content) {
		padding: 0.5rem 0;
	}

	.flowdrop-code-editor__container :global(.cm-gutters) {
		background-color: var(--fd-editor-gutter-bg);
		border-right: 1px solid var(--fd-editor-border);
		color: var(--fd-editor-gutter-text);
	}

	.flowdrop-code-editor__container :global(.cm-activeLineGutter) {
		background-color: var(--fd-editor-selection-bg);
	}

	.flowdrop-code-editor__container :global(.cm-activeLine) {
		background-color: var(--fd-editor-selection-bg);
	}

	/* Hide line numbers when disabled */
	.flowdrop-code-editor--no-line-numbers :global(.cm-lineNumbers) {
		display: none;
	}

	/* Read-only styles */
	.flowdrop-code-editor--readonly {
		opacity: 0.8;
	}

	.flowdrop-code-editor--readonly :global(.cm-cursor) {
		display: none;
	}

	/* Loading state */
	.flowdrop-code-editor__loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		color: var(--fd-editor-gutter-text);
		font-size: 0.875rem;
	}

	/* Load error */
	.flowdrop-code-editor__load-error {
		padding: 0.75rem;
	}

	.flowdrop-code-editor__load-error p {
		margin: 0 0 0.75rem;
		color: var(--fd-editor-error-text);
		font-size: 0.75rem;
	}

	/* Fallback textarea */
	.flowdrop-code-editor__fallback {
		width: 100%;
		min-height: var(--fd-editor-min-height);
		max-height: var(--fd-editor-max-height);
		padding: 0.75rem;
		border: 1px solid var(--fd-editor-border);
		border-radius: 0.375rem;
		background-color: var(--fd-editor-bg);
		color: var(--fd-editor-text);
		font-family: var(--fd-editor-font);
		font-size: 0.875rem;
		line-height: 1.5;
		resize: vertical;
	}

	.flowdrop-code-editor__fallback:focus {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}

	/* Validation error indicator */
	.flowdrop-code-editor__validation-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-editor-error-bg);
		border-top: 1px solid var(--fd-editor-error-border);
		color: var(--fd-editor-error-text);
		font-size: 0.75rem;
	}

	.flowdrop-code-editor__validation-error svg {
		flex-shrink: 0;
	}
</style>

<!--
  CodeDisplay Component
  Read-only code display with syntax highlighting using highlight.js
  
  Features:
  - Syntax highlighting for multiple languages (JSON, JavaScript, TypeScript, Python, etc.)
  - Line numbers (optional)
  - Copy to clipboard button
  - Dark/light theme support
  - Customizable height and styling
  - Proper ARIA attributes for accessibility
  
  Usage:
  ```svelte
  <CodeDisplay
    code={jsonString}
    language="json"
    showLineNumbers={true}
    darkTheme={false}
  />
  ```
-->

<script lang="ts">
	import { onMount } from "svelte";

	/**
	 * Props interface for CodeDisplay component
	 */
	interface Props {
		/** The code string to display */
		code: string;
		/** Programming language for syntax highlighting (e.g., "json", "javascript", "python") */
		language?: string;
		/** Whether to show line numbers */
		showLineNumbers?: boolean;
		/** Whether to use dark theme */
		darkTheme?: boolean;
		/** Custom height (CSS value or number in pixels) */
		height?: string | number;
		/** Maximum height before scrolling (CSS value or number in pixels) */
		maxHeight?: string | number;
		/** Whether to show the copy button */
		showCopyButton?: boolean;
		/** Custom CSS class for the container */
		className?: string;
		/** Tab size for indentation (default: 2) */
		tabSize?: number;
		/** Whether to wrap long lines */
		wrapLines?: boolean;
		/** ARIA label for accessibility */
		ariaLabel?: string;
	}

	const {
		code,
		language = "plaintext",
		showLineNumbers = false,
		darkTheme = false,
		height,
		maxHeight = "400px",
		showCopyButton = true,
		className = "",
		tabSize = 2,
		wrapLines = false,
		ariaLabel = "Code display"
	}: Props = $props();

	/** Whether highlight.js is loaded and available */
	let hljs: typeof import("highlight.js").default | null = $state(null);

	/** Whether the code was successfully copied */
	let copied = $state(false);

	/** Error state for highlighting */
	let highlightError = $state<string | null>(null);

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
	 * Computed max-height style
	 */
	const maxHeightStyle = $derived(
		typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight
	);

	/**
	 * Split code into lines for line number display
	 */
	const codeLines = $derived(code.split("\n"));

	/**
	 * Line number width based on total lines
	 */
	const lineNumberWidth = $derived(
		Math.max(2, String(codeLines.length).length) + 1
	);

	/**
	 * Highlighted code HTML
	 */
	const highlightedCode = $derived.by(() => {
		if (!hljs) {
			// Return escaped HTML if highlight.js is not loaded
			return escapeHtml(code);
		}

		try {
			// Try to highlight with the specified language
			if (language && language !== "plaintext") {
				const result = hljs.highlight(code, {
					language,
					ignoreIllegals: true
				});
				return result.value;
			}
			// Fall back to auto-detection
			const result = hljs.highlightAuto(code);
			return result.value;
		} catch {
			// If highlighting fails, return escaped HTML
			highlightError = `Failed to highlight as ${language}`;
			return escapeHtml(code);
		}
	});

	/**
	 * Escape HTML special characters
	 * @param text - Text to escape
	 * @returns Escaped HTML string
	 */
	function escapeHtml(text: string): string {
		const htmlEscapes: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;"
		};
		return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
	}

	/**
	 * Copy code to clipboard
	 */
	async function copyToClipboard(): Promise<void> {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			// Reset copied state after 2 seconds
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = code;
			textArea.style.position = "fixed";
			textArea.style.left = "-999999px";
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand("copy");
				copied = true;
				setTimeout(() => {
					copied = false;
				}, 2000);
			} catch {
				console.error("Failed to copy code to clipboard");
			}
			document.body.removeChild(textArea);
		}
	}

	/**
	 * Load highlight.js dynamically
	 */
	onMount(async () => {
		try {
			// Dynamically import highlight.js
			const hljsModule = await import("highlight.js");
			hljs = hljsModule.default;
		} catch {
			// highlight.js not installed, will show plain text
			console.warn(
				"highlight.js not available. Install it for syntax highlighting: npm install highlight.js"
			);
		}
	});
</script>

<div
	class="flowdrop-code-display {className}"
	class:flowdrop-code-display--dark={darkTheme}
	class:flowdrop-code-display--wrap={wrapLines}
	style:--fd-code-height={heightStyle}
	style:--fd-code-max-height={maxHeightStyle}
	style:--fd-code-tab-size={tabSize}
	style:--fd-line-number-width="{lineNumberWidth}ch"
	role="region"
	aria-label={ariaLabel}
>
	<!-- Header with language badge and copy button -->
	<div class="flowdrop-code-display__header">
		<span class="flowdrop-code-display__language">{language}</span>
		{#if showCopyButton}
			<button
				class="flowdrop-code-display__copy-btn"
				class:flowdrop-code-display__copy-btn--copied={copied}
				onclick={copyToClipboard}
				title={copied ? "Copied!" : "Copy code"}
				aria-label={copied ? "Code copied to clipboard" : "Copy code to clipboard"}
			>
				{#if copied}
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
					<span>Copied!</span>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
					</svg>
					<span>Copy</span>
				{/if}
			</button>
		{/if}
	</div>

	<!-- Code content area -->
	<div class="flowdrop-code-display__content">
		{#if showLineNumbers}
			<!-- Line numbers column -->
			<div class="flowdrop-code-display__line-numbers" aria-hidden="true">
				{#each codeLines as _, index}
					<span class="flowdrop-code-display__line-number">{index + 1}</span>
				{/each}
			</div>
		{/if}

		<!-- Code block -->
		<pre
			class="flowdrop-code-display__pre"
			tabindex="0"
		><code
			class="flowdrop-code-display__code hljs language-{language}"
		>{@html highlightedCode}</code></pre>
	</div>

	<!-- Error indicator -->
	{#if highlightError}
		<div class="flowdrop-code-display__error" role="alert">
			<small>{highlightError}</small>
		</div>
	{/if}
</div>

<style>
	/* Container styles */
	.flowdrop-code-display {
		--fd-code-bg: #f8f9fa;
		--fd-code-border: #e9ecef;
		--fd-code-text: #212529;
		--fd-code-header-bg: #f1f3f5;
		--fd-code-line-number-color: #868e96;
		--fd-code-line-number-bg: #f1f3f5;
		--fd-code-copy-btn-bg: transparent;
		--fd-code-copy-btn-hover-bg: #e9ecef;
		--fd-code-copy-success: #40c057;
		--fd-code-font: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

		display: flex;
		flex-direction: column;
		border: 1px solid var(--fd-code-border);
		border-radius: 0.5rem;
		overflow: hidden;
		background-color: var(--fd-code-bg);
		font-family: var(--fd-code-font);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	/* Dark theme */
	.flowdrop-code-display--dark {
		--fd-code-bg: #1e1e1e;
		--fd-code-border: #3c3c3c;
		--fd-code-text: #d4d4d4;
		--fd-code-header-bg: #252526;
		--fd-code-line-number-color: #858585;
		--fd-code-line-number-bg: #1e1e1e;
		--fd-code-copy-btn-hover-bg: #3c3c3c;
	}

	/* Header */
	.flowdrop-code-display__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-code-header-bg);
		border-bottom: 1px solid var(--fd-code-border);
	}

	.flowdrop-code-display__language {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--fd-code-line-number-color);
		text-transform: lowercase;
	}

	/* Copy button */
	.flowdrop-code-display__copy-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		border: none;
		border-radius: 0.25rem;
		background-color: var(--fd-code-copy-btn-bg);
		color: var(--fd-code-line-number-color);
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
		transition: background-color 0.15s, color 0.15s;
	}

	.flowdrop-code-display__copy-btn:hover {
		background-color: var(--fd-code-copy-btn-hover-bg);
		color: var(--fd-code-text);
	}

	.flowdrop-code-display__copy-btn--copied {
		color: var(--fd-code-copy-success);
	}

	/* Content area */
	.flowdrop-code-display__content {
		display: flex;
		height: var(--fd-code-height);
		max-height: var(--fd-code-max-height);
		overflow: auto;
	}

	/* Line numbers */
	.flowdrop-code-display__line-numbers {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		padding: 0.75rem 0;
		background-color: var(--fd-code-line-number-bg);
		border-right: 1px solid var(--fd-code-border);
		user-select: none;
	}

	.flowdrop-code-display__line-number {
		display: block;
		width: var(--fd-line-number-width);
		padding: 0 0.75rem;
		text-align: right;
		color: var(--fd-code-line-number-color);
		font-size: 0.8125rem;
	}

	/* Pre and code */
	.flowdrop-code-display__pre {
		flex: 1;
		margin: 0;
		padding: 0.75rem 1rem;
		overflow-x: auto;
		background-color: transparent;
		tab-size: var(--fd-code-tab-size);
	}

	.flowdrop-code-display__pre:focus {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}

	.flowdrop-code-display__code {
		display: block;
		color: var(--fd-code-text);
		background: transparent;
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
	}

	/* Wrap lines */
	.flowdrop-code-display--wrap .flowdrop-code-display__pre {
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	/* Error indicator */
	.flowdrop-code-display__error {
		padding: 0.25rem 0.75rem;
		background-color: #fff3cd;
		border-top: 1px solid #ffc107;
		color: #856404;
		font-size: 0.75rem;
	}

	.flowdrop-code-display--dark .flowdrop-code-display__error {
		background-color: #3c3400;
		border-top-color: #665800;
		color: #ffca2c;
	}

	/* ========================================
	 * highlight.js Theme - Light Mode
	 * Based on GitHub Light theme
	 * ======================================== */
	.flowdrop-code-display :global(.hljs) {
		color: #24292e;
	}

	.flowdrop-code-display :global(.hljs-comment),
	.flowdrop-code-display :global(.hljs-quote) {
		color: #6a737d;
		font-style: italic;
	}

	.flowdrop-code-display :global(.hljs-keyword),
	.flowdrop-code-display :global(.hljs-selector-tag),
	.flowdrop-code-display :global(.hljs-addition) {
		color: #d73a49;
	}

	.flowdrop-code-display :global(.hljs-number),
	.flowdrop-code-display :global(.hljs-string),
	.flowdrop-code-display :global(.hljs-meta .hljs-meta-string),
	.flowdrop-code-display :global(.hljs-literal),
	.flowdrop-code-display :global(.hljs-doctag),
	.flowdrop-code-display :global(.hljs-regexp) {
		color: #032f62;
	}

	.flowdrop-code-display :global(.hljs-title),
	.flowdrop-code-display :global(.hljs-section),
	.flowdrop-code-display :global(.hljs-name),
	.flowdrop-code-display :global(.hljs-selector-id),
	.flowdrop-code-display :global(.hljs-selector-class) {
		color: #6f42c1;
	}

	.flowdrop-code-display :global(.hljs-attribute),
	.flowdrop-code-display :global(.hljs-attr),
	.flowdrop-code-display :global(.hljs-variable),
	.flowdrop-code-display :global(.hljs-template-variable),
	.flowdrop-code-display :global(.hljs-class .hljs-title),
	.flowdrop-code-display :global(.hljs-type) {
		color: #005cc5;
	}

	.flowdrop-code-display :global(.hljs-symbol),
	.flowdrop-code-display :global(.hljs-bullet),
	.flowdrop-code-display :global(.hljs-subst),
	.flowdrop-code-display :global(.hljs-meta),
	.flowdrop-code-display :global(.hljs-meta .hljs-keyword),
	.flowdrop-code-display :global(.hljs-link) {
		color: #e36209;
	}

	.flowdrop-code-display :global(.hljs-built_in),
	.flowdrop-code-display :global(.hljs-deletion) {
		color: #22863a;
	}

	.flowdrop-code-display :global(.hljs-emphasis) {
		font-style: italic;
	}

	.flowdrop-code-display :global(.hljs-strong) {
		font-weight: bold;
	}

	/* ========================================
	 * highlight.js Theme - Dark Mode
	 * Based on VS Code Dark+ theme
	 * ======================================== */
	.flowdrop-code-display--dark :global(.hljs) {
		color: #d4d4d4;
	}

	.flowdrop-code-display--dark :global(.hljs-comment),
	.flowdrop-code-display--dark :global(.hljs-quote) {
		color: #6a9955;
		font-style: italic;
	}

	.flowdrop-code-display--dark :global(.hljs-keyword),
	.flowdrop-code-display--dark :global(.hljs-selector-tag),
	.flowdrop-code-display--dark :global(.hljs-addition) {
		color: #569cd6;
	}

	.flowdrop-code-display--dark :global(.hljs-number) {
		color: #b5cea8;
	}

	.flowdrop-code-display--dark :global(.hljs-string),
	.flowdrop-code-display--dark :global(.hljs-meta .hljs-meta-string),
	.flowdrop-code-display--dark :global(.hljs-literal),
	.flowdrop-code-display--dark :global(.hljs-doctag),
	.flowdrop-code-display--dark :global(.hljs-regexp) {
		color: #ce9178;
	}

	.flowdrop-code-display--dark :global(.hljs-title),
	.flowdrop-code-display--dark :global(.hljs-section),
	.flowdrop-code-display--dark :global(.hljs-name),
	.flowdrop-code-display--dark :global(.hljs-selector-id),
	.flowdrop-code-display--dark :global(.hljs-selector-class) {
		color: #dcdcaa;
	}

	.flowdrop-code-display--dark :global(.hljs-attribute),
	.flowdrop-code-display--dark :global(.hljs-attr),
	.flowdrop-code-display--dark :global(.hljs-variable),
	.flowdrop-code-display--dark :global(.hljs-template-variable),
	.flowdrop-code-display--dark :global(.hljs-class .hljs-title),
	.flowdrop-code-display--dark :global(.hljs-type) {
		color: #9cdcfe;
	}

	.flowdrop-code-display--dark :global(.hljs-symbol),
	.flowdrop-code-display--dark :global(.hljs-bullet),
	.flowdrop-code-display--dark :global(.hljs-subst),
	.flowdrop-code-display--dark :global(.hljs-meta),
	.flowdrop-code-display--dark :global(.hljs-meta .hljs-keyword),
	.flowdrop-code-display--dark :global(.hljs-link) {
		color: #d7ba7d;
	}

	.flowdrop-code-display--dark :global(.hljs-built_in) {
		color: #4ec9b0;
	}

	.flowdrop-code-display--dark :global(.hljs-deletion) {
		color: #f44747;
	}
</style>

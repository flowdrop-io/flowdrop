<!--
  FormMarkdownEditor Component
  CodeMirror 6-based Markdown editor for rich text content

  Features:
  - Full Markdown editing with CodeMirror 6
  - Markdown syntax highlighting via @codemirror/lang-markdown
  - Toolbar with common formatting options + keyboard shortcuts
  - Autosave support (optional, localStorage)
  - Status bar with word/line/character count
  - Consistent styling with other form components
  - Proper ARIA attributes for accessibility
  - Dark/light theme support

  Usage:
  Use with schema format: "markdown" to render this editor
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorView, lineNumbers, drawSelection, keymap } from '@codemirror/view';
	import { EditorState, Compartment } from '@codemirror/state';
	import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
	import { highlightSpecialChars, highlightActiveLine } from '@codemirror/view';
	import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
	import { markdown } from '@codemirror/lang-markdown';
	import { oneDark } from '@codemirror/theme-one-dark';

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
		/** Whether the field is disabled (read-only) */
		disabled?: boolean;
		/** Whether to use dark theme */
		darkTheme?: boolean;
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
		disabled = false,
		darkTheme = false,
		ariaDescribedBy,
		onChange
	}: Props = $props();

	/** Reference to the editor container element */
	let containerRef: HTMLDivElement | undefined = $state(undefined);

	/** CodeMirror editor instance */
	let editorView: EditorView | undefined = $state(undefined);

	/** Flag to prevent update loops */
	let isInternalUpdate = false;

	/** Flag to skip $effect when change originated from the editor */
	let isEditorUpdate = false;

	/** Status bar stats */
	let wordCount = $state(0);
	let lineCount = $state(0);
	let charCount = $state(0);

	/** Autosave timer */
	let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

	/** Theme compartment for dynamic theme switching */
	const themeCompartment = new Compartment();

	// ── Toolbar actions ──────────────────────────────────────

	type ToolbarAction = {
		id: string;
		label: string;
		icon: string;
		/** If true, icon is an SVG string rendered with {@html} */
		isSvg?: boolean;
		shortcut?: string;
		action: () => void;
	};

	// Inline SVG icons (heroicons outline, 16x16)
	const icons = {
		link: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z"/><path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z"/></svg>',
		image: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0L2.5 11.06Zm6.5-3.31a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clip-rule="evenodd"/></svg>',
		table: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm8.26 4.51v3.75h1.5v-3.75h-1.5Zm1.5-1.5v-3.75h-1.5v3.75h1.5Zm-3-3.75H3.25a.75.75 0 0 0-.75.75v3h5.25v-3.75Zm-5.25 5.25v3.75c0 .414.336.75.75.75h4.5v-4.5H2.5Zm14.5 0h-5.25v4.5h4.5a.75.75 0 0 0 .75-.75v-3.75Zm0-1.5v-3a.75.75 0 0 0-.75-.75h-4.5v3.75H17Z" clip-rule="evenodd"/></svg>'
	};

	function wrapSelection(before: string, after: string) {
		if (!editorView) return;
		const { from, to } = editorView.state.selection.main;
		const selected = editorView.state.sliceDoc(from, to);
		const replacement = `${before}${selected || 'text'}${after}`;
		editorView.dispatch({
			changes: { from, to, insert: replacement },
			selection: {
				anchor: selected ? from + before.length : from + before.length,
				head: selected ? from + before.length + selected.length : from + before.length + 4
			}
		});
		editorView.focus();
	}

	function prefixLine(prefix: string) {
		if (!editorView) return;
		const { from } = editorView.state.selection.main;
		const line = editorView.state.doc.lineAt(from);
		const currentText = line.text;

		// If already has this prefix, remove it (toggle)
		if (currentText.startsWith(prefix)) {
			editorView.dispatch({
				changes: { from: line.from, to: line.from + prefix.length, insert: '' }
			});
		} else {
			// Remove any existing heading prefix before adding new one
			const headingMatch = currentText.match(/^#{1,6}\s/);
			const removeLen = headingMatch ? headingMatch[0].length : 0;
			editorView.dispatch({
				changes: { from: line.from, to: line.from + removeLen, insert: prefix }
			});
		}
		editorView.focus();
	}

	function insertAtCursor(text: string) {
		if (!editorView) return;
		const { from, to } = editorView.state.selection.main;
		editorView.dispatch({
			changes: { from, to, insert: text },
			selection: { anchor: from + text.length }
		});
		editorView.focus();
	}

	const toolbarActions: (ToolbarAction | '|')[] = [
		{
			id: 'bold',
			label: 'Bold',
			icon: 'B',
			shortcut: 'Mod-b',
			action: () => wrapSelection('**', '**')
		},
		{
			id: 'italic',
			label: 'Italic',
			icon: 'I',
			shortcut: 'Mod-i',
			action: () => wrapSelection('_', '_')
		},
		{
			id: 'strikethrough',
			label: 'Strikethrough',
			icon: 'S',
			action: () => wrapSelection('~~', '~~')
		},
		'|',
		{
			id: 'heading-1',
			label: 'Heading 1',
			icon: 'H1',
			action: () => prefixLine('# ')
		},
		{
			id: 'heading-2',
			label: 'Heading 2',
			icon: 'H2',
			action: () => prefixLine('## ')
		},
		{
			id: 'heading-3',
			label: 'Heading 3',
			icon: 'H3',
			action: () => prefixLine('### ')
		},
		'|',
		{
			id: 'quote',
			label: 'Quote',
			icon: '"',
			action: () => prefixLine('> ')
		},
		{
			id: 'unordered-list',
			label: 'Unordered List',
			icon: '•',
			action: () => prefixLine('- ')
		},
		{
			id: 'ordered-list',
			label: 'Ordered List',
			icon: '1.',
			action: () => prefixLine('1. ')
		},
		'|',
		{
			id: 'link',
			label: 'Link',
			icon: icons.link,
			isSvg: true,
			shortcut: 'Mod-k',
			action: () => {
				if (!editorView) return;
				const { from, to } = editorView.state.selection.main;
				const selected = editorView.state.sliceDoc(from, to);
				const text = selected || 'link text';
				const replacement = `[${text}](url)`;
				editorView.dispatch({
					changes: { from, to, insert: replacement },
					selection: {
						anchor: from + text.length + 3,
						head: from + text.length + 6
					}
				});
				editorView.focus();
			}
		},
		{
			id: 'image',
			label: 'Image',
			icon: icons.image,
			isSvg: true,
			action: () => insertAtCursor('![alt text](image-url)')
		},
		{
			id: 'table',
			label: 'Table',
			icon: icons.table,
			isSvg: true,
			action: () =>
				insertAtCursor('\n| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n')
		}
	];

	// ── CM6 Keyboard shortcuts for toolbar actions ───────────

	function createToolbarKeymap() {
		return keymap.of([
			{
				key: 'Mod-b',
				run: () => {
					wrapSelection('**', '**');
					return true;
				}
			},
			{
				key: 'Mod-i',
				run: () => {
					wrapSelection('_', '_');
					return true;
				}
			},
			{
				key: 'Mod-k',
				run: () => {
					const action = toolbarActions.find((a) => a !== '|' && a.id === 'link');
					if (action && action !== '|') action.action();
					return true;
				}
			},
			{
				key: 'Mod-h',
				run: () => {
					prefixLine('## ');
					return true;
				}
			},
			{
				key: "Mod-'",
				run: () => {
					prefixLine('> ');
					return true;
				}
			},
			{
				key: 'Mod-l',
				run: () => {
					prefixLine('- ');
					return true;
				}
			}
		]);
	}

	// ── Stats computation ────────────────────────────────────

	function updateStats(doc: { toString: () => string; lines: number }) {
		const text = doc.toString();
		charCount = text.length;
		lineCount = doc.lines;
		const trimmed = text.trim();
		wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
	}

	// ── Editor setup ─────────────────────────────────────────

	function createExtensions() {
		const extensions = [
			lineNumbers(),
			highlightSpecialChars(),
			highlightActiveLine(),
			drawSelection(),

			// Editing features (skip when read-only)
			...(disabled
				? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
				: [
						history(),
						keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
						createToolbarKeymap()
					]),

			// Theme
			themeCompartment.of(
				darkTheme
					? oneDark
					: syntaxHighlighting(defaultHighlightStyle, { fallback: true })
			),

			// Markdown language support
			markdown(),

			// Update listener
			EditorView.updateListener.of((update) => {
				if (!update.docChanged || isInternalUpdate) return;

				const content = update.state.doc.toString();
				isEditorUpdate = true;
				onChange(content);

				updateStats(update.state.doc);

				// Autosave
				if (autosave) {
					clearTimeout(autosaveTimer);
					autosaveTimer = setTimeout(() => {
						try {
							localStorage.setItem(`flowdrop-markdown-${id}`, content);
						} catch {
							// localStorage may be full or unavailable
						}
					}, autosaveDelay);
				}
			}),

			// Custom theme
			EditorView.theme({
				'&': {
					height: height,
					fontSize: 'var(--fd-text-sm, 0.8125rem)',
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
				}
			}),
			EditorView.lineWrapping,

			// Accessibility
			EditorView.contentAttributes.of({
				'aria-label': 'Markdown editor',
				'aria-multiline': 'true'
			})
		];

		return extensions;
	}

	onMount(() => {
		if (!containerRef) return;

		// Load autosaved content if available
		let initialContent = value;
		if (autosave) {
			try {
				const saved = localStorage.getItem(`flowdrop-markdown-${id}`);
				if (saved !== null) {
					initialContent = saved;
					onChange(saved);
				}
			} catch {
				// localStorage unavailable
			}
		}

		editorView = new EditorView({
			state: EditorState.create({
				doc: initialContent,
				extensions: createExtensions()
			}),
			parent: containerRef
		});

		updateStats(editorView.state.doc);
	});

	onDestroy(() => {
		if (autosaveTimer) clearTimeout(autosaveTimer);
		if (editorView) editorView.destroy();
	});

	/**
	 * Update editor content when value prop changes externally
	 */
	$effect(() => {
		if (!editorView) return;

		// Skip if the change originated from the editor itself
		if (isEditorUpdate) {
			isEditorUpdate = false;
			return;
		}

		const currentContent = editorView.state.doc.toString();
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
			updateStats(editorView.state.doc);
		}
	});
</script>

<div
	class="form-markdown-editor"
	class:form-markdown-editor--dark={darkTheme}
	style="--editor-height: {height}"
>
	<!-- Hidden input for form submission compatibility -->
	<input
		type="hidden"
		{id}
		name={id}
		{value}
		aria-describedby={ariaDescribedBy}
		aria-required={required}
	/>

	<!-- Toolbar -->
	{#if showToolbar && !disabled}
		<div class="form-markdown-editor__toolbar" role="toolbar" aria-label="Markdown formatting">
			{#each toolbarActions as item}
				{#if item === '|'}
					<span class="form-markdown-editor__separator"></span>
				{:else}
					<button
						type="button"
						class="form-markdown-editor__btn"
						title="{item.label}{item.shortcut ? ` (${item.shortcut.replace('Mod', '⌘')})` : ''}"
						onclick={item.action}
					>
						{#if item.isSvg}
							<span class="form-markdown-editor__btn-svg">{@html item.icon}</span>
						{:else}
							<span class="form-markdown-editor__btn-icon" class:form-markdown-editor__btn-icon--bold={item.id === 'bold'} class:form-markdown-editor__btn-icon--italic={item.id === 'italic'} class:form-markdown-editor__btn-icon--strike={item.id === 'strikethrough'}>{item.icon}</span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- CodeMirror container -->
	<div
		bind:this={containerRef}
		class="form-markdown-editor__body"
	></div>

	<!-- Status bar -->
	{#if showStatusBar}
		<div class="form-markdown-editor__status">
			<span>words: {wordCount}</span>
			<span>lines: {lineCount}</span>
			<span>characters: {charCount}</span>
		</div>
	{/if}
</div>

<style>
	.form-markdown-editor {
		position: relative;
		width: 100%;
	}

	/* ── Toolbar ───────────────────────────────────── */

	.form-markdown-editor__toolbar {
		display: flex;
		align-items: center;
		gap: 0.125rem;
		border: 1px solid var(--fd-border);
		border-bottom: none;
		border-radius: var(--fd-radius-lg) var(--fd-radius-lg) 0 0;
		background-color: var(--fd-subtle);
		padding: 0.375rem 0.5rem;
	}

	.form-markdown-editor__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: var(--fd-radius-md);
		background: none;
		color: var(--fd-muted-foreground);
		cursor: pointer;
		font-size: 0.8125rem;
		transition: all var(--fd-transition-fast);
	}

	.form-markdown-editor__btn:hover {
		background-color: var(--fd-border);
		color: var(--fd-foreground);
	}

	.form-markdown-editor__btn-icon--bold {
		font-weight: 700;
	}

	.form-markdown-editor__btn-icon--italic {
		font-style: italic;
	}

	.form-markdown-editor__btn-icon--strike {
		text-decoration: line-through;
	}

	.form-markdown-editor__btn-svg {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.form-markdown-editor__separator {
		width: 1px;
		height: 1.25rem;
		background-color: var(--fd-border-strong);
		margin: 0 0.25rem;
	}

	/* ── Editor body ───────────────────────────────── */

	.form-markdown-editor__body {
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		overflow: hidden;
		background-color: var(--fd-muted);
		transition: border-color var(--fd-transition-normal);
	}

	/* When toolbar is present, remove top radius */
	.form-markdown-editor__toolbar + .form-markdown-editor__body {
		border-top: none;
		border-radius: 0;
	}

	.form-markdown-editor__body:hover {
		border-color: var(--fd-border-strong);
	}

	.form-markdown-editor__body:focus-within {
		border-color: var(--fd-primary);
		background-color: var(--fd-background);
		box-shadow:
			0 0 0 3px var(--fd-primary-muted),
			var(--fd-shadow-sm);
	}

	/* ── Status bar ────────────────────────────────── */

	.form-markdown-editor__status {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		border: 1px solid var(--fd-border);
		border-top: none;
		border-radius: 0 0 var(--fd-radius-lg) var(--fd-radius-lg);
		background-color: var(--fd-muted);
		padding: 0.375rem 0.75rem;
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
	}

	/* When no toolbar, body gets top radius */
	.form-markdown-editor:not(:has(.form-markdown-editor__toolbar)) .form-markdown-editor__body {
		border-radius: var(--fd-radius-lg) var(--fd-radius-lg) 0 0;
	}

	/* When no status bar, body gets bottom radius */
	.form-markdown-editor:not(:has(.form-markdown-editor__status)) .form-markdown-editor__body {
		border-radius: 0 0 var(--fd-radius-lg) var(--fd-radius-lg);
	}

	/* When no toolbar AND no status bar, body gets full radius */
	.form-markdown-editor:not(:has(.form-markdown-editor__toolbar)):not(:has(.form-markdown-editor__status))
		.form-markdown-editor__body {
		border-radius: var(--fd-radius-lg);
	}

	/* ── CM6 overrides ─────────────────────────────── */
	/* Design tokens (--fd-*) auto-resolve for dark mode via [data-theme='dark'] */
	/* !important needed to override oneDark's JS-injected styles */

	.form-markdown-editor__body :global(.cm-editor) {
		height: var(--editor-height, 300px);
		background-color: var(--fd-muted) !important;
		color: var(--fd-foreground) !important;
	}

	.form-markdown-editor__body :global(.cm-scroller) {
		overflow: auto;
	}

	.form-markdown-editor__body :global(.cm-content) {
		color: var(--fd-foreground) !important;
		caret-color: var(--fd-foreground) !important;
	}

	.form-markdown-editor__body :global(.cm-line) {
		color: var(--fd-foreground) !important;
	}

	.form-markdown-editor__body :global(.cm-gutters) {
		background-color: var(--fd-subtle) !important;
		border-right: 1px solid var(--fd-border);
	}

	.form-markdown-editor__body :global(.cm-linenumber) {
		color: var(--fd-muted-foreground) !important;
	}

	.form-markdown-editor__body :global(.cm-cursor) {
		border-left-color: var(--fd-muted-foreground) !important;
	}

	.form-markdown-editor__body :global(.cm-activeLine) {
		background-color: var(--fd-subtle) !important;
	}

	.form-markdown-editor__body :global(.cm-activeLineGutter) {
		background-color: var(--fd-subtle) !important;
	}

	/* ── Markdown syntax styling ───────────────────── */

	.form-markdown-editor__body :global(.cm-header-1) {
		font-size: 1.25rem;
		line-height: 1.4;
	}

	.form-markdown-editor__body :global(.cm-header-2) {
		font-size: 1.125rem;
		line-height: 1.4;
	}

	.form-markdown-editor__body :global(.cm-header-3) {
		font-size: 1rem;
		line-height: 1.4;
	}

	.form-markdown-editor__body :global(.cm-header) {
		font-weight: 600;
		color: var(--fd-foreground) !important;
	}

	.form-markdown-editor__body :global(.cm-processingInstruction) {
		color: var(--fd-success) !important;
	}

	.form-markdown-editor__body :global(.cm-emphasis) {
		color: var(--fd-foreground) !important;
		font-style: italic;
	}

	.form-markdown-editor__body :global(.cm-strong) {
		color: var(--fd-foreground) !important;
		font-weight: 700;
	}

	.form-markdown-editor__body :global(.cm-strikethrough) {
		color: var(--fd-muted-foreground) !important;
		text-decoration: line-through;
	}

	.form-markdown-editor__body :global(.cm-url) {
		color: var(--fd-primary) !important;
	}

	.form-markdown-editor__body :global(.cm-link) {
		color: var(--fd-primary) !important;
		text-decoration: underline;
	}

	.form-markdown-editor__body :global(.cm-meta) {
		color: var(--fd-muted-foreground) !important;
	}

	.form-markdown-editor__body :global(.cm-quote) {
		color: var(--fd-success) !important;
		font-style: italic;
	}
</style>

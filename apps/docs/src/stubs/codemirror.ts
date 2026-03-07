/**
 * Stub module for optional CodeMirror peer dependencies.
 * The docs demos don't use code/markdown editors, so we provide
 * no-op stubs to avoid bundling CodeMirror (~300KB).
 */

const noop = () => {};
const noopExtension: never[] = [];

// @codemirror/view
export const EditorView = class {
	constructor() {}
	destroy() {}
	static theme() { return noopExtension; }
};
export const lineNumbers = () => noopExtension;
export const highlightActiveLineGutter = () => noopExtension;
export const drawSelection = () => noopExtension;
export const keymap = { of: () => noopExtension };
export const highlightSpecialChars = () => noopExtension;
export const highlightActiveLine = () => noopExtension;
export const tooltips = () => noopExtension;
export const Decoration = { set: noop, none: noopExtension, mark: () => ({}) };
export const ViewPlugin = { fromClass: () => noopExtension, define: () => noopExtension };
export const MatchDecorator = class { constructor() {} };

// @codemirror/state
export const EditorState = { create: () => ({}) };
export const Compartment = class {
	of() { return noopExtension; }
	reconfigure() { return {}; }
};

// @codemirror/commands
export const history = () => noopExtension;
export const historyKeymap: never[] = [];
export const defaultKeymap: never[] = [];
export const indentWithTab = {};

// @codemirror/language
export const syntaxHighlighting = () => noopExtension;
export const defaultHighlightStyle = {};

// @codemirror/lang-markdown
export const markdown = () => noopExtension;

// @codemirror/lang-json
export const json = () => noopExtension;
export const jsonParseLinter = () => noop;

// @codemirror/theme-one-dark
export const oneDark = noopExtension;

// @codemirror/lint
export const linter = () => noopExtension;

// @codemirror/autocomplete
export const autocompletion = () => noopExtension;

// codemirror (main package)
export const basicSetup = noopExtension;

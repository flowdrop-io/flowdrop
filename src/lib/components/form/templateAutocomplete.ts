/**
 * Template Variable Autocomplete Extension for CodeMirror
 * Provides autocomplete suggestions for {{ variable }} syntax in template editors.
 *
 * Features:
 * - Triggers on `{{` to show top-level variables
 * - Triggers on `.` to show child properties for objects
 * - Triggers on `[` to show array index options
 * - Supports deep nesting (e.g., `user.address.city`)
 *
 * @module components/form/templateAutocomplete
 */

import {
	autocompletion,
	type Completion,
	type CompletionContext,
	type CompletionResult
} from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { VariableSchema, TemplateVariable } from '$lib/types/index.js';
import {
	getChildVariables,
	getArrayIndexSuggestions,
	isArrayVariable,
	hasChildren
} from '$lib/services/variableService.js';

/**
 * Icon type hints for different variable types in autocomplete dropdown.
 */
const TYPE_ICONS: Record<string, string> = {
	string: '𝑆',
	number: '#',
	integer: '#',
	float: '#',
	boolean: '☑',
	array: '[]',
	object: '{}',
	mixed: '⋯'
};

/**
 * Extracts the current variable path being typed inside {{ }}.
 * Returns null if cursor is not inside a template expression.
 *
 * @param text - The full document text
 * @param pos - Current cursor position
 * @returns Object with the path and start position, or null
 *
 * @example
 * For text "Hello {{ user.name }}" with cursor after "user."
 * Returns { path: "user.", startPos: 9 }
 */
function extractVariablePath(
	text: string,
	pos: number
): { path: string; startPos: number; isInsideExpression: boolean } | null {
	// Look backwards from cursor to find the opening {{
	let openBracePos = -1;
	let searchPos = pos - 1;

	while (searchPos >= 0) {
		// Check for opening {{
		if (text[searchPos] === '{' && searchPos > 0 && text[searchPos - 1] === '{') {
			openBracePos = searchPos - 1;
			break;
		}
		// Check for closing }} - means we're outside an expression
		if (text[searchPos] === '}' && searchPos > 0 && text[searchPos - 1] === '}') {
			return null;
		}
		searchPos--;
	}

	if (openBracePos === -1) {
		return null;
	}

	// Check if there's a closing }} after cursor (still inside expression)
	const afterCursor = text.slice(pos);
	const closingMatch = afterCursor.match(/^\s*\}\}/);
	const hasClosing = closingMatch !== null;

	// Extract the content between {{ and cursor
	const contentStart = openBracePos + 2;
	const content = text.slice(contentStart, pos).trimStart();

	return {
		path: content,
		startPos:
			contentStart +
			(text.slice(contentStart, pos).length - text.slice(contentStart, pos).trimStart().length),
		isInsideExpression: true
	};
}

/**
 * Determines what type of completion to provide based on the current path.
 */
type CompletionType =
	| { type: 'top-level' }
	| { type: 'property'; parentPath: string }
	| { type: 'array-index'; parentPath: string };

/**
 * Determines the completion type based on the current input.
 *
 * @param path - The current variable path being typed
 * @returns The type of completion to provide
 */
function getCompletionType(path: string): CompletionType {
	// Empty or only whitespace - show top-level variables
	if (path.trim() === '') {
		return { type: 'top-level' };
	}

	// Ends with [ - show array indices
	if (path.endsWith('[')) {
		const parentPath = path.slice(0, -1);
		return { type: 'array-index', parentPath };
	}

	// Ends with . - show child properties
	if (path.endsWith('.')) {
		const parentPath = path.slice(0, -1);
		return { type: 'property', parentPath };
	}

	// Otherwise, we're typing a variable name - show matching options
	const lastDotIndex = path.lastIndexOf('.');
	const lastBracketIndex = path.lastIndexOf('[');
	const lastSeparator = Math.max(lastDotIndex, lastBracketIndex);

	if (lastSeparator === -1) {
		// Typing at top level
		return { type: 'top-level' };
	}

	// Extract parent path based on separator
	if (lastDotIndex > lastBracketIndex) {
		// Last separator was a dot
		return { type: 'property', parentPath: path.slice(0, lastDotIndex) };
	} else {
		// Last separator was a bracket
		return { type: 'array-index', parentPath: path.slice(0, lastBracketIndex) };
	}
}

/**
 * Converts a TemplateVariable to a CodeMirror Completion object.
 *
 * @param variable - The template variable
 * @param prefix - Prefix to add to the completion label
 * @returns A CodeMirror Completion object
 */
function variableToCompletion(variable: TemplateVariable, prefix: string = ''): Completion {
	const icon = TYPE_ICONS[variable.type] ?? TYPE_ICONS.mixed;
	const hasChildProps = variable.properties && Object.keys(variable.properties).length > 0;
	const isArray = variable.type === 'array';

	// Add indicator if variable can be drilled into
	let suffix = '';
	if (hasChildProps) suffix = '.';
	else if (isArray) suffix = '[';

	return {
		label: `${prefix}${variable.name}`,
		displayLabel: `${icon} ${variable.label ?? variable.name}${suffix ? ' ' + suffix : ''}`,
		detail: variable.type,
		info: variable.description,
		type: 'variable',
		boost: hasChildProps || isArray ? 1 : 0 // Boost drillable variables
	};
}

/**
 * Creates the completion source function for template variables.
 *
 * @param schema - The variable schema containing available variables
 * @returns A completion source function for CodeMirror
 */
function createTemplateCompletionSource(
	schema: VariableSchema
): (context: CompletionContext) => CompletionResult | null {
	return (context: CompletionContext): CompletionResult | null => {
		const { state, pos } = context;
		const text = state.doc.toString();

		// Check if we're inside a {{ }} expression
		const pathInfo = extractVariablePath(text, pos);

		if (!pathInfo) {
			// Check if user just typed {{
			const beforeCursor = text.slice(Math.max(0, pos - 2), pos);
			if (beforeCursor === '{{') {
				// Show top-level variables
				const options: Completion[] = Object.values(schema.variables).map((v) =>
					variableToCompletion(v)
				);

				return {
					from: pos,
					options,
					validFor: /^[\w.[\]]*$/
				};
			}
			return null;
		}

		const { path, startPos } = pathInfo;
		const completionType = getCompletionType(path);

		let options: Completion[] = [];
		let from = pos;

		switch (completionType.type) {
			case 'top-level': {
				// Show all top-level variables
				const currentWord = path.trim();
				options = Object.values(schema.variables)
					.filter(
						(v) => currentWord === '' || v.name.toLowerCase().startsWith(currentWord.toLowerCase())
					)
					.map((v) => variableToCompletion(v));
				// Calculate from position for replacement
				from = startPos + (path.length - path.trimStart().length);
				break;
			}

			case 'property': {
				// Show child properties of the parent
				const children = getChildVariables(schema, completionType.parentPath);
				const currentWord = path.slice(path.lastIndexOf('.') + 1);
				options = children
					.filter(
						(v) => currentWord === '' || v.name.toLowerCase().startsWith(currentWord.toLowerCase())
					)
					.map((v) => variableToCompletion(v));
				// From should be right after the last dot
				from = startPos + path.lastIndexOf('.') + 1;
				break;
			}

			case 'array-index': {
				// Check if the parent is actually an array
				if (isArrayVariable(schema, completionType.parentPath)) {
					const indices = getArrayIndexSuggestions(5);
					const currentIndex = path.slice(path.lastIndexOf('[') + 1);
					options = indices
						.filter((idx) => currentIndex === '' || idx.startsWith(currentIndex))
						.map((idx) => ({
							label: idx,
							displayLabel: idx === '*]' ? '* (all items)' : `[${idx}`,
							detail: idx === '*]' ? 'Iterate all items' : `Index ${idx.slice(0, -1)}`,
							type: 'keyword'
						}));
					// From should be right after the [
					from = startPos + path.lastIndexOf('[') + 1;
				}
				break;
			}
		}

		if (options.length === 0) {
			return null;
		}

		return {
			from,
			options,
			validFor: /^[\w\]*]*$/
		};
	};
}

/**
 * Creates a CodeMirror extension for template variable autocomplete.
 *
 * @param schema - The variable schema containing available variables
 * @returns A CodeMirror extension that provides autocomplete
 *
 * @example
 * ```typescript
 * const extensions = [
 *   // ... other extensions
 *   createTemplateAutocomplete(variableSchema)
 * ];
 * ```
 */
export function createTemplateAutocomplete(schema: VariableSchema): Extension {
	return autocompletion({
		override: [createTemplateCompletionSource(schema)],
		activateOnTyping: true,
		defaultKeymap: true,
		optionClass: () => 'cm-template-autocomplete-option',
		icons: false, // We use our own icons in displayLabel
		addToOptions: [
			{
				render: (completion: Completion) => {
					const el = document.createElement('span');
					el.className = 'cm-template-autocomplete-info';
					if (completion.info) {
						el.textContent = String(completion.info);
					}
					return el;
				},
				position: 100
			}
		]
	});
}

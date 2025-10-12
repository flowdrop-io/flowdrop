/**
 * Default port configuration for FlowDrop
 * Provides backward compatibility and serves as an example configuration
 */

import type { PortConfig } from '../types/index.js';

export const DEFAULT_PORT_CONFIG: PortConfig = {
	version: '1.0.0',
	defaultDataType: 'string',

	dataTypes: [

		// Text and basic types
		{
			id: 'trigger',
			name: 'Trigger',
			description: 'Control flow of the workflow',
			color: 'var(--color-ref-purple-500)',
			category: 'basic',
			enabled: true
		},
		// Text and basic types
		{
			id: 'string',
			name: 'String',
			description: 'Text data',
			color: 'var(--color-ref-emerald-500)',
			category: 'basic',
			enabled: true
		},

		// Numeric types
		{
			id: 'number',
			name: 'Number',
			description: 'Numeric data',
			color: 'var(--color-ref-blue-600)',
			category: 'numeric',
			enabled: true
		},

		// Boolean types
		{
			id: 'boolean',
			name: 'Boolean',
			description: 'True/false values',
			color: 'var(--color-ref-purple-600)',
			category: 'logical',
			enabled: true
		},

		// Collection types
		{
			id: 'array',
			name: 'Array',
			description: 'Ordered list of items',
			color: 'var(--color-ref-amber-500)',
			category: 'collection',
			enabled: true
		},

		// Typed arrays
		{
			id: 'string[]',
			name: 'String Array',
			description: 'Array of strings',
			color: 'var(--color-ref-emerald-400)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'number[]',
			name: 'Number Array',
			description: 'Array of numbers',
			color: 'var(--color-ref-blue-400)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'boolean[]',
			name: 'Boolean Array',
			description: 'Array of true/false values',
			color: 'var(--color-ref-purple-400)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'json[]',
			name: 'JSON Array',
			description: 'Array of JSON objects',
			color: 'var(--color-ref-orange-400)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'file[]',
			name: 'File Array',
			description: 'Array of files',
			color: 'var(--color-ref-red-400)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'image[]',
			name: 'Image Array',
			description: 'Array of images',
			color: 'var(--color-ref-pink-400)',
			category: 'collection',
			enabled: true
		},

		// Complex types
		{
			id: 'json',
			name: 'JSON',
			description: 'JSON structured data',
			color: 'var(--color-ref-orange-500)',
			category: 'complex',
			enabled: true
		},

		// File types
		{
			id: 'file',
			name: 'File',
			description: 'File data',
			color: 'var(--color-ref-red-500)',
			category: 'file',
			enabled: true
		},

		// Media types
		{
			id: 'image',
			name: 'Image',
			description: 'Image data',
			color: 'var(--color-ref-pink-500)',
			category: 'media',
			enabled: true
		},
		{
			id: 'audio',
			name: 'Audio',
			description: 'Audio data',
			color: 'var(--color-ref-indigo-500)',
			category: 'media',
			enabled: true
		},
		{
			id: 'video',
			name: 'Video',
			description: 'Video data',
			color: 'var(--color-ref-teal-500)',
			category: 'media',
			enabled: true
		},

		// Special types
		{
			id: 'url',
			name: 'URL',
			description: 'Web address',
			color: 'var(--color-ref-cyan-500)',
			category: 'special',
			enabled: true
		},
		{
			id: 'email',
			name: 'Email',
			description: 'Email address',
			color: 'var(--color-ref-cyan-500)',
			category: 'special',
			enabled: true
		},
		{
			id: 'date',
			name: 'Date',
			description: 'Date value',
			color: 'var(--color-ref-lime-500)',
			category: 'temporal',
			enabled: true
		},
		{
			id: 'datetime',
			name: 'DateTime',
			description: 'Date and time value',
			color: 'var(--color-ref-lime-500)',
			category: 'temporal',
			enabled: true
		},
		{
			id: 'time',
			name: 'Time',
			description: 'Time value',
			color: 'var(--color-ref-lime-500)',
			category: 'temporal',
			enabled: true
		}
	],

	compatibilityRules: [
		// Pure same-type compatibility: string connects to string, number to number, etc.
		// No additional rules needed - the system handles same-type connections automatically
	]
};

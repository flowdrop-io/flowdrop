import type { PortConfig } from '../types.js';

export const portConfig: PortConfig = {
	version: '1.0.0',
	defaultDataType: 'string',

	dataTypes: [
		{
			id: 'trigger',
			name: 'Trigger',
			description: 'Control flow of the workflow',
			color: 'var(--fd-node-purple)',
			category: 'basic',
			enabled: true
		},
		{
			id: 'string',
			name: 'String',
			description: 'Text data',
			color: 'var(--fd-node-emerald)',
			category: 'basic',
			enabled: true
		},
		{
			id: 'number',
			name: 'Number',
			description: 'Numeric data',
			color: 'var(--fd-node-blue)',
			category: 'numeric',
			enabled: true
		},
		{
			id: 'boolean',
			name: 'Boolean',
			description: 'True/false values',
			color: 'var(--fd-node-purple)',
			category: 'logical',
			enabled: true
		},
		{
			id: 'array',
			name: 'Array',
			description: 'Ordered list of items',
			color: 'var(--fd-node-amber)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'string[]',
			name: 'String Array',
			description: 'Array of strings',
			color: 'var(--fd-node-emerald)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'number[]',
			name: 'Number Array',
			description: 'Array of numbers',
			color: 'var(--fd-node-blue)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'boolean[]',
			name: 'Boolean Array',
			description: 'Array of true/false values',
			color: 'var(--fd-node-purple)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'json[]',
			name: 'JSON Array',
			description: 'Array of JSON objects',
			color: 'var(--fd-node-orange)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'file[]',
			name: 'File Array',
			description: 'Array of files',
			color: 'var(--fd-node-red)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'image[]',
			name: 'Image Array',
			description: 'Array of images',
			color: 'var(--fd-node-pink)',
			category: 'collection',
			enabled: true
		},
		{
			id: 'json',
			name: 'JSON',
			description: 'JSON structured data',
			color: 'var(--fd-node-orange)',
			category: 'complex',
			enabled: true
		},
		{
			id: 'file',
			name: 'File',
			description: 'File data',
			color: 'var(--fd-node-red)',
			category: 'file',
			enabled: true
		},
		{
			id: 'image',
			name: 'Image',
			description: 'Image data',
			color: 'var(--fd-node-pink)',
			category: 'media',
			enabled: true
		},
		{
			id: 'audio',
			name: 'Audio',
			description: 'Audio data',
			color: 'var(--fd-node-indigo)',
			category: 'media',
			enabled: true
		},
		{
			id: 'video',
			name: 'Video',
			description: 'Video data',
			color: 'var(--fd-node-teal)',
			category: 'media',
			enabled: true
		},
		{
			id: 'tool',
			name: 'Tool',
			description: 'Tool interface for agent connections',
			color: 'var(--fd-node-amber)',
			category: 'special',
			enabled: true
		},
		{
			id: 'url',
			name: 'URL',
			description: 'Web address',
			color: 'var(--fd-node-cyan)',
			category: 'special',
			enabled: true
		},
		{
			id: 'email',
			name: 'Email',
			description: 'Email address',
			color: 'var(--fd-node-cyan)',
			category: 'special',
			enabled: true
		},
		{
			id: 'date',
			name: 'Date',
			description: 'Date value',
			color: 'var(--fd-node-lime)',
			category: 'temporal',
			enabled: true
		},
		{
			id: 'datetime',
			name: 'DateTime',
			description: 'Date and time value',
			color: 'var(--fd-node-lime)',
			category: 'temporal',
			enabled: true
		},
		{
			id: 'time',
			name: 'Time',
			description: 'Time value',
			color: 'var(--fd-node-lime)',
			category: 'temporal',
			enabled: true
		}
	],

	compatibilityRules: []
};

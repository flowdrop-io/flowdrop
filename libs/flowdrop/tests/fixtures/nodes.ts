/**
 * Test fixtures for node metadata
 *
 * Reusable node type definitions for testing.
 */

import type { NodeMetadata } from '$lib/types';

/**
 * Basic text input node
 */
export const textInputNode: NodeMetadata = {
	id: 'text_input',
	name: 'Text Input',
	description: 'Accept text input from user',
	category: 'inputs',
	version: '1.0.0',
	type: 'default',
	icon: 'mdi:text-box',
	color: '#3b82f6',
	inputs: [],
	outputs: [
		{
			id: 'value',
			name: 'Value',
			type: 'output',
			dataType: 'string',
			description: 'The input text value'
		}
	],
	configSchema: {
		type: 'object',
		properties: {
			defaultValue: {
				type: 'string',
				title: 'Default Value',
				description: 'Initial value for the input',
				default: ''
			},
			placeholder: {
				type: 'string',
				title: 'Placeholder',
				description: 'Placeholder text',
				default: 'Enter text...'
			},
			required: {
				type: 'boolean',
				title: 'Required',
				description: 'Whether input is required',
				default: false
			}
		}
	},
	tags: ['input', 'text', 'user-input']
};

/**
 * Calculator node for testing processing
 */
export const calculatorNode: NodeMetadata = {
	id: 'calculator',
	name: 'Calculator',
	description: 'Perform mathematical operations',
	category: 'processing',
	version: '1.0.0',
	type: 'default',
	icon: 'mdi:calculator',
	color: '#10b981',
	inputs: [
		{
			id: 'a',
			name: 'Number A',
			type: 'input',
			dataType: 'number',
			required: true
		},
		{
			id: 'b',
			name: 'Number B',
			type: 'input',
			dataType: 'number',
			required: true
		}
	],
	outputs: [
		{
			id: 'result',
			name: 'Result',
			type: 'output',
			dataType: 'number'
		}
	],
	configSchema: {
		type: 'object',
		properties: {
			operation: {
				type: 'string',
				title: 'Operation',
				enum: ['add', 'subtract', 'multiply', 'divide'],
				default: 'add'
			}
		},
		required: ['operation']
	},
	tags: ['math', 'calculator', 'processing']
};

/**
 * Gateway node for conditional branching
 */
export const gatewayNode: NodeMetadata = {
	id: 'gateway',
	name: 'Gateway',
	description: 'Route data based on conditions',
	category: 'control',
	version: '1.0.0',
	type: 'gateway',
	icon: 'mdi:call-split',
	color: '#f59e0b',
	inputs: [
		{
			id: 'input',
			name: 'Input',
			type: 'input',
			dataType: 'mixed',
			required: true
		}
	],
	outputs: [],
	configSchema: {
		type: 'object',
		properties: {
			branches: {
				type: 'array',
				title: 'Branches',
				description: 'Conditional branches',
				items: {
					type: 'object',
					properties: {
						name: {
							type: 'string',
							title: 'Branch ID'
						},
						label: {
							type: 'string',
							title: 'Label'
						},
						condition: {
							type: 'string',
							title: 'Condition'
						},
						isDefault: {
							type: 'boolean',
							title: 'Default Branch',
							default: false
						}
					},
					required: ['name', 'label']
				}
			}
		}
	},
	tags: ['control', 'branching', 'conditional']
};

/**
 * Terminal node (start/end)
 */
export const terminalNode: NodeMetadata = {
	id: 'terminal',
	name: 'Terminal',
	description: 'Workflow start or end point',
	category: 'control',
	version: '1.0.0',
	type: 'terminal',
	icon: 'mdi:circle',
	color: '#8b5cf6',
	inputs: [],
	outputs: [
		{
			id: 'trigger',
			name: 'Trigger',
			type: 'output',
			dataType: 'trigger'
		}
	],
	configSchema: {
		type: 'object',
		properties: {
			terminalType: {
				type: 'string',
				title: 'Type',
				enum: ['start', 'end', 'exit'],
				default: 'start'
			}
		}
	},
	tags: ['control', 'terminal', 'start', 'end']
};

/**
 * Note node for documentation
 */
export const noteNode: NodeMetadata = {
	id: 'note',
	name: 'Note',
	description: 'Add documentation notes',
	category: 'helpers',
	version: '1.0.0',
	type: 'note',
	icon: 'mdi:note-text',
	color: '#f97316',
	inputs: [],
	outputs: [],
	configSchema: {
		type: 'object',
		properties: {
			content: {
				type: 'string',
				title: 'Content',
				format: 'multiline',
				default: '# Note\n\nAdd your notes here...'
			}
		}
	},
	tags: ['documentation', 'note', 'markdown']
};

/**
 * Node with dynamic inputs/outputs
 */
export const dynamicNode: NodeMetadata = {
	id: 'dynamic_processor',
	name: 'Dynamic Processor',
	description: 'Node with user-defined ports',
	category: 'processing',
	version: '1.0.0',
	type: 'default',
	icon: 'mdi:tune',
	color: '#06b6d4',
	inputs: [
		{
			id: 'data',
			name: 'Data',
			type: 'input',
			dataType: 'mixed'
		}
	],
	outputs: [
		{
			id: 'output',
			name: 'Output',
			type: 'output',
			dataType: 'mixed'
		}
	],
	configSchema: {
		type: 'object',
		properties: {
			dynamicInputs: {
				type: 'array',
				title: 'Dynamic Inputs',
				items: {
					type: 'object',
					properties: {
						name: { type: 'string', title: 'Port ID' },
						label: { type: 'string', title: 'Label' },
						dataType: { type: 'string', title: 'Data Type', default: 'string' },
						required: { type: 'boolean', title: 'Required', default: false }
					},
					required: ['name', 'label']
				}
			},
			dynamicOutputs: {
				type: 'array',
				title: 'Dynamic Outputs',
				items: {
					type: 'object',
					properties: {
						name: { type: 'string', title: 'Port ID' },
						label: { type: 'string', title: 'Label' },
						dataType: { type: 'string', title: 'Data Type', default: 'string' }
					},
					required: ['name', 'label']
				}
			}
		}
	},
	tags: ['dynamic', 'flexible', 'processing']
};

/**
 * Collection of all test nodes
 */
export const testNodes = {
	textInput: textInputNode,
	calculator: calculatorNode,
	gateway: gatewayNode,
	terminal: terminalNode,
	note: noteNode,
	dynamic: dynamicNode
};

/**
 * Array of all test nodes (for API responses)
 */
export const testNodesList: NodeMetadata[] = Object.values(testNodes);

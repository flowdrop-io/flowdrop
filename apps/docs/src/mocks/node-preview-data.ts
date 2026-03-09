/**
 * Node data for the node type preview pages.
 * Each entry mirrors the Storybook story data for that node type.
 */

function base(overrides: Record<string, unknown>) {
	return {
		label: 'Sample Node',
		config: {},
		metadata: {
			id: 'sample-node',
			name: 'Sample Node',
			description: 'A sample node for preview',
			category: 'processing',
			version: '1.0.0',
			type: 'default',
			inputs: [
				{ id: 'input', name: 'Input', type: 'input', dataType: 'any', required: false }
			],
			outputs: [
				{ id: 'output', name: 'Output', type: 'output', dataType: 'any' }
			]
		},
		...overrides
	};
}

export const nodePreviewData: Record<string, Record<string, unknown>> = {
	default: base({
		label: 'Simple Agent',
		config: { systemPrompt: 'You are a helpful assistant.', temperature: 0.7, maxTokens: 1000 },
		metadata: {
			id: 'simple_agent',
			name: 'Simple Agent',
			description: 'Agent for tool orchestration',
			category: 'agents',
			version: '1.0.0',
			type: 'default',
			supportedTypes: ['default'],
			icon: 'mdi:account-cog',
			color: '#06b6d4',
			inputs: [
				{ id: 'message', name: 'Message', type: 'input', dataType: 'string', required: false, description: 'The message for the agent to process' },
				{ id: 'tools', name: 'Tools', type: 'input', dataType: 'array', required: false, description: 'Tools available to the agent' },
				{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger', required: false, description: '' }
			],
			outputs: [
				{ id: 'response', name: 'response', type: 'output', dataType: 'json', required: false, description: 'The agent response' },
				{ id: 'message', name: 'message', type: 'output', dataType: 'string', required: false, description: 'The input message' }
			]
		}
	}),

	simple: base({
		label: 'Text Input',
		metadata: {
			id: 'text_input',
			name: 'Text Input',
			description: 'Simple text input for user data',
			category: 'inputs',
			version: '1.0.0',
			type: 'simple',
			supportedTypes: ['simple', 'square', 'default'],
			icon: 'mdi:text',
			color: '#22c55e',
			inputs: [],
			outputs: [
				{ id: 'text', name: 'text', type: 'output', dataType: 'string', required: false, description: 'The input text value' }
			]
		}
	}),

	square: base({
		label: 'Text Input',
		metadata: {
			id: 'text_input',
			name: 'Text Input',
			description: 'Simple text input for user data',
			category: 'inputs',
			version: '1.0.0',
			type: 'square',
			supportedTypes: ['square'],
			icon: 'mdi:text',
			color: '#22c55e',
			inputs: [],
			outputs: [
				{ id: 'text', name: 'text', type: 'output', dataType: 'string', required: false, description: 'The input text value' }
			]
		}
	}),

	tool: base({
		label: 'AI Content Analyzer',
		metadata: {
			id: 'ai_content_analyzer',
			name: 'AI Content Analyzer',
			description: 'AI-powered content analysis for smart text processing',
			category: 'ai',
			version: '1.0.0',
			type: 'tool',
			supportedTypes: ['tool', 'default'],
			icon: 'mdi:brain',
			color: '#9C27B0',
			inputs: [
				{ id: 'content', name: 'Content to Analyze', type: 'input', dataType: 'mixed', required: false, description: 'Text content for AI analysis' },
				{ id: 'tool', name: 'Tool', type: 'input', dataType: 'tool', required: false, description: 'Available Tools' },
				{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger', required: false, description: '' }
			],
			outputs: [
				{ id: 'tool', name: 'Tool', type: 'output', dataType: 'tool', required: false, description: 'Available tools' },
				{ id: 'analyzed_content', name: 'analyzed_content', type: 'output', dataType: 'array', required: false, description: 'Content items with AI analysis results' },
				{ id: 'total_analyzed', name: 'total_analyzed', type: 'output', dataType: 'number', required: false, description: 'Total number of items analyzed' }
			]
		}
	}),

	gateway: base({
		label: 'If/Else',
		config: {
			textInput: '',
			matchText: '',
			operator: 'equals',
			caseSensitive: false,
			branches: [
				{ name: 'True', value: true },
				{ name: 'False', value: false }
			]
		},
		metadata: {
			id: 'if_else',
			name: 'If/Else',
			description: 'Simple conditional logic with text input, match text, and operator',
			category: 'logic',
			version: '1.0.0',
			type: 'gateway',
			supportedTypes: ['gateway'],
			icon: 'mdi:code-braces',
			color: '#8b5cf6',
			inputs: [
				{ id: 'data', name: 'Input Data', type: 'input', dataType: 'mixed', required: false, description: 'Optional input data' },
				{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger', required: false, description: '' }
			],
			outputs: []
		}
	}),

	terminal: {
		label: 'Start',
		config: {},
		metadata: {
			id: 'start',
			name: 'Start',
			description: 'Workflow start point',
			category: 'terminal',
			version: '1.0.0',
			type: 'terminal',
			inputs: [],
			outputs: [
				{ id: 'output', name: 'Output', type: 'output', dataType: 'any' }
			]
		}
	},

	idea: {
		label: 'Feature Idea',
		config: {
			content: 'Add batch processing support to handle multiple items in parallel.'
		},
		metadata: {
			id: 'idea',
			name: 'Idea',
			description: 'Planning node',
			category: 'helpers',
			version: '1.0.0',
			type: 'idea',
			inputs: [],
			outputs: []
		}
	},

	note: {
		label: 'Notes',
		config: {
			content: '## Important\n\nThis workflow handles **user onboarding**.\n\n- Step 1: Validate email\n- Step 2: Create account\n- Step 3: Send welcome email',
			noteType: 'info'
		},
		metadata: {
			id: 'notes',
			name: 'Notes',
			description: 'Documentation node',
			category: 'helpers',
			version: '1.0.0',
			type: 'note',
			inputs: [],
			outputs: []
		}
	}
};

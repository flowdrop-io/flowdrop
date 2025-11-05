/**
 * Demo configuration for FlowDrop UI
 * Controls which nodes and workflows are shown in demo mode
 */

import type { DemoConfig } from '../data/samples.js';

/**
 * Default demo configuration
 * Change this to enable/disable demo mode and control what's shown
 */
export const defaultDemoConfig: DemoConfig = {
	enabled: true, // Set to true to enable demo mode
	mode: 'content-management' // Show only whitelisted content management nodes
};

/**
 * Demo mode presets for different scenarios
 */
export const demoPresets: Record<string, DemoConfig> = {
	// Content management demo mode - show only whitelisted nodes
	'content-management': {
		enabled: true,
		mode: 'content-management'
	},

	// Show all nodes (disable demo filtering)
	'all-nodes': {
		enabled: false,
		mode: 'all'
	}
};

/**
 * Get the current demo configuration
 * You can modify this function to read from localStorage, URL params, etc.
 */
export function getCurrentDemoConfig(): DemoConfig {
	// For now, return the default config
	// In the future, this could check localStorage or URL parameters
	return defaultDemoConfig;
}

/**
 * Set demo configuration (for future use with UI controls)
 */
export function setDemoConfig(config: DemoConfig): void {
	// Store in localStorage for persistence
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('flowdrop-demo-config', JSON.stringify(config));
	}
}

/**
 * Load demo configuration from localStorage
 */
export function loadDemoConfig(): DemoConfig {
	if (typeof localStorage !== 'undefined') {
		const stored = localStorage.getItem('flowdrop-demo-config');
		if (stored) {
			try {
				return JSON.parse(stored);
			} catch {
				// Fall back to default if parsing fails
				return defaultDemoConfig;
			}
		}
	}
	return defaultDemoConfig;
}

/**
 * Demo workflow configuration
 */
export const demoWorkflowConfig = {
	// Which workflow to show by default in demo mode
	defaultWorkflow: 'sample', // Use sample workflow for now

	// Whether to auto-load a workflow on startup
	autoLoadDemo: false,

	// Sample workflow is used in demo mode
	sampleWorkflowName: 'Simple Chat Workflow',
	sampleWorkflowDescription: 'A basic workflow demonstrating direct text input to AI model response'
};

/**
 * Demo instructions for non-technical users
 */
export const demoInstructions = {
	title: 'Multi-Agent Workflow Demo',
	description:
		'This demo shows how FlowDrop uses multiple AI agents working together to process and manage data workflows.',

	steps: [
		{
			step: 1,
			title: 'User Input',
			description: 'Start by providing input data or instructions to the main agent.',
			example: 'Analyze and process the provided dataset'
		},
		{
			step: 2,
			title: 'Main Agent Orchestration',
			description:
				'The main conversational agent understands your request and coordinates with specialized sub-agents.',
			note: 'Acts as the intelligent orchestrator of the entire workflow'
		},
		{
			step: 3,
			title: 'Data Analysis Agent',
			description:
				'Specialized agent analyzes data using search and processing tools to find and examine relevant information.',
			note: 'Uses connected data sources and search tools for intelligent data discovery'
		},
		{
			step: 4,
			title: 'Data Processing Agent',
			description:
				'Specialized agent processes and transforms data using available tools and formatters.',
			note: 'Has access to multiple tools and makes tracked transformations'
		},
		{
			step: 5,
			title: 'Tool Integration',
			description:
				'Sub-agents use specialized tools for data processing, formatting, and transformation.',
			note: "Tools are connected via special 'tool' interface ports"
		},
		{
			step: 6,
			title: 'Agent Collaboration',
			description:
				'Sub-agents report back to the main agent with their findings and completed work.',
			note: 'Multi-agent coordination ensures comprehensive task completion'
		},
		{
			step: 7,
			title: 'Orchestrated Response',
			description:
				'Main agent compiles results from all sub-agents and provides a comprehensive response.',
			note: 'Includes summaries, results, and next steps for review'
		}
	],

	benefits: [
		'Multi-agent collaboration for complex tasks',
		'Specialized agents for specific data processing functions',
		'Intelligent task orchestration and coordination',
		'Tool-based architecture for extensibility',
		'Human oversight through review process',
		'Scalable agent-to-agent communication patterns'
	],

	useCases: [
		'Multi-agent data analysis and processing',
		'Coordinated data transformation workflows',
		'Agent-orchestrated data quality checks',
		'Collaborative data processing pipelines',
		'Tool-assisted bulk data operations',
		'Intelligent workflow automation'
	]
};

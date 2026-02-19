/**
 * Agent-Level Adapter
 *
 * Handles conversion between FlowDrop workflows and full Agent Spec Documents
 * (which wrap a Flow with Agent metadata like tools, LLM config, etc.)
 */

import type {
	AgentSpecDocument,
	AgentSpecAgent,
	AgentSpecFlow,
	AgentSpecTool,
	AgentSpecLLMConfig
} from '../../types/agentspec.js';

import type { StandardWorkflow } from '../WorkflowAdapter.js';
import { AgentSpecAdapter } from './AgentSpecAdapter.js';

/**
 * Agent-level configuration that wraps a workflow.
 * Contains the Agent Spec agent metadata that lives outside the flow.
 */
export interface AgentConfig {
	/** Agent name */
	name: string;
	/** Agent description */
	description?: string;
	/** System prompt for the agent */
	systemPrompt?: string;
	/** Tools available to the agent */
	tools?: AgentSpecTool[];
	/** LLM configuration */
	llmConfig?: AgentSpecLLMConfig;
}

/**
 * Result of importing an Agent Spec Document.
 */
export interface AgentSpecImportResult {
	/** The FlowDrop workflow (from the flow) */
	workflow: StandardWorkflow;
	/** Agent metadata (from the agent, if present) */
	agentConfig?: AgentConfig;
	/** Shared tools declared at document level */
	tools?: AgentSpecTool[];
	/** Shared LLM configurations declared at document level */
	llmConfigs?: AgentSpecLLMConfig[];
}

export class AgentSpecAgentAdapter {
	private flowAdapter: AgentSpecAdapter;

	constructor() {
		this.flowAdapter = new AgentSpecAdapter();
	}

	/**
	 * Convert a FlowDrop workflow + agent config into a full AgentSpecDocument.
	 *
	 * The document wraps the flow with agent metadata (tools, LLM config, system prompt).
	 */
	toAgentSpecDocument(
		workflow: StandardWorkflow,
		agentConfig?: AgentConfig,
		tools?: AgentSpecTool[],
		llmConfigs?: AgentSpecLLMConfig[]
	): AgentSpecDocument {
		const flow: AgentSpecFlow = this.flowAdapter.toAgentSpec(workflow);

		const doc: AgentSpecDocument = {
			flow,
			metadata: {
				'flowdrop:exported_at': new Date().toISOString()
			}
		};

		// Add agent definition if config provided
		if (agentConfig) {
			const agent: AgentSpecAgent = {
				component_type: 'agent',
				name: agentConfig.name,
				description: agentConfig.description,
				system_prompt: agentConfig.systemPrompt,
				tools: agentConfig.tools,
				llm_config: agentConfig.llmConfig
			};
			doc.agent = agent;
		}

		// Add shared tools
		if (tools && tools.length > 0) {
			doc.tools = tools;
		}

		// Add shared LLM configs
		if (llmConfigs && llmConfigs.length > 0) {
			doc.llm_configs = llmConfigs;
		}

		return doc;
	}

	/**
	 * Import a full AgentSpecDocument, extracting the flow and agent metadata.
	 */
	fromAgentSpecDocument(doc: AgentSpecDocument): AgentSpecImportResult {
		if (!doc.flow) {
			throw new Error('AgentSpecDocument has no flow definition');
		}

		const workflow = this.flowAdapter.fromAgentSpec(doc.flow);

		const result: AgentSpecImportResult = {
			workflow
		};

		// Extract agent config
		if (doc.agent) {
			result.agentConfig = {
				name: doc.agent.name,
				description: doc.agent.description,
				systemPrompt: doc.agent.system_prompt,
				tools: doc.agent.tools?.filter((t): t is AgentSpecTool => typeof t !== 'string'),
				llmConfig:
					doc.agent.llm_config && typeof doc.agent.llm_config !== 'string'
						? doc.agent.llm_config
						: undefined
			};
		}

		// Extract shared declarations
		if (doc.tools) result.tools = doc.tools;
		if (doc.llm_configs) result.llmConfigs = doc.llm_configs;

		return result;
	}

	/**
	 * Export a full AgentSpecDocument as JSON string.
	 */
	exportJSON(
		workflow: StandardWorkflow,
		agentConfig?: AgentConfig,
		tools?: AgentSpecTool[],
		llmConfigs?: AgentSpecLLMConfig[]
	): string {
		return JSON.stringify(
			this.toAgentSpecDocument(workflow, agentConfig, tools, llmConfigs),
			null,
			2
		);
	}

	/**
	 * Import from JSON string containing an AgentSpecDocument.
	 */
	importJSON(json: string): AgentSpecImportResult {
		const doc = JSON.parse(json) as AgentSpecDocument;
		return this.fromAgentSpecDocument(doc);
	}
}

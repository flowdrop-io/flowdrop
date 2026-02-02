/**
 * Mock node data for MSW mock server
 * Contains actual FlowDrop node definitions from the API
 */

import type { NodeMetadata } from '../../lib/types/index.js';

/**
 * All available mock nodes - actual node definitions from FlowDrop API
 */
export const mockNodes: NodeMetadata[] = [
	{
		id: 'ai_content_analyzer',
		name: 'AI Content Analyzer',
		type: 'tool',
		supportedTypes: ['tool', 'default'],
		description: 'AI-powered content analysis for smart text processing and context understanding',
		category: 'ai',
		icon: 'mdi:brain',
		color: '#9C27B0',
		version: '1.0.0',
		tags: ['ai', 'analysis', 'content', 'context', 'smart-processing'],
		inputs: [
			{
				id: 'content',
				name: 'Content to Analyze',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description: 'Text content or array of content items for AI analysis'
			},
			{
				id: 'tool',
				name: 'Tool',
				type: 'input',
				dataType: 'tool',
				required: false,
				description: 'Available Tools'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'tool',
				name: 'Tool',
				type: 'output',
				dataType: 'tool',
				required: false,
				description: 'Available tools'
			},
		{
			id: 'analyzed_content',
			name: 'analyzed_content',
			type: 'output',
			dataType: 'array',
			required: false,
			description: 'Content items with AI analysis results',
			// Example output schema for autocomplete demonstration
			schema: {
				type: 'object',
				properties: {
					items: {
						type: 'array',
						title: 'Analyzed Items',
						description: 'Array of analyzed content items',
						items: {
							type: 'object',
							properties: {
								id: {
									type: 'string',
									description: 'Content item ID'
								},
								title: {
									type: 'string',
									description: 'Content title'
								},
								sentiment: {
									type: 'object',
									title: 'Sentiment',
									description: 'Sentiment analysis results',
									properties: {
										score: {
											type: 'number',
											description: 'Sentiment score (-1 to 1)'
										},
										label: {
											type: 'string',
											description: 'Sentiment label (positive, neutral, negative)'
										},
										confidence: {
											type: 'number',
											description: 'Confidence level (0 to 1)'
										}
									}
								},
								keywords: {
									type: 'array',
									title: 'Keywords',
									description: 'Extracted keywords',
									items: {
										type: 'string'
									}
								}
							}
						}
					},
					summary: {
						type: 'object',
						title: 'Summary',
						description: 'Analysis summary',
						properties: {
							total_items: {
								type: 'integer',
								description: 'Total number of items analyzed'
							},
							average_sentiment: {
								type: 'number',
								description: 'Average sentiment score'
							},
							processing_time_ms: {
								type: 'integer',
								description: 'Processing time in milliseconds'
							}
						}
					}
				}
			}
		},
			{
				id: 'total_analyzed',
				name: 'total_analyzed',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Total number of items analyzed'
			},
			{
				id: 'total_replacements',
				name: 'total_replacements',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Total number of replacements made'
			},
			{
				id: 'analysis_mode',
				name: 'analysis_mode',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The analysis mode used'
			},
			{
				id: 'confidence_threshold',
				name: 'confidence_threshold',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Confidence threshold used for replacements'
			},
			{
				id: 'analyzed_at',
				name: 'analyzed_at',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Timestamp when analysis was completed'
			}
		],
		config: {
			targetText: 'XB',
			replacementText: 'Canvas',
			analysisMode: 'context_aware',
			confidenceThreshold: 0.8
		},
		configSchema: {
			type: 'object',
			properties: {
				nodeType: {
					type: 'string',
					title: 'Node Type',
					description: 'Choose the visual representation for this node',
					default: 'tool',
					oneOf: [
						{ const: 'tool', title: 'Tool Node (with metadata port)' },
						{ const: 'default', title: 'Default Node (standard ports)' }
					]
				},
				targetText: {
					type: 'string',
					title: 'Target Text',
					description: 'Text to analyze and potentially replace',
					default: 'XB'
				},
				replacementText: {
					type: 'string',
					title: 'Replacement Text',
					description: 'Text to replace with when appropriate',
					default: 'Canvas'
				},
				analysisMode: {
					type: 'string',
					title: 'Analysis Mode',
					description: 'Type of AI analysis to perform',
					enum: ['acronym_detection', 'sentence_flow', 'context_aware'],
					default: 'context_aware'
				},
				confidenceThreshold: {
					type: 'number',
					format: 'range',
					title: 'Confidence Threshold',
					description: 'Minimum confidence level for making replacements (0-1)',
					minimum: 0,
					maximum: 1,
					step: 0.01,
					default: 0.8
				}
			}
		}
	},
	{
		id: 'calculator',
		name: 'Calculator',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Perform mathematical calculations',
		category: 'tools',
		icon: 'mdi:calculator',
		color: '#6366f1',
		version: '1.0.0',
		tags: ['tools', 'calculator', 'math', 'compute'],
		inputs: [
			{
				id: 'values',
				name: 'Values',
				type: 'input',
				dataType: 'array',
				required: false,
				description: 'Numeric values for calculation'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'result',
				name: 'result',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The calculation result'
			},
			{
				id: 'operation',
				name: 'operation',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The operation performed'
			},
			{
				id: 'values',
				name: 'values',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The input values used'
			},
			{
				id: 'precision',
				name: 'precision',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The precision used'
			}
		],
		configSchema: {
			type: 'object',
			properties: {
				operation: {
					type: 'string',
					title: 'Operation',
					description: 'Mathematical operation to perform',
					default: 'add',
					enum: [
						'add',
						'subtract',
						'multiply',
						'divide',
						'power',
						'sqrt',
						'average',
						'min',
						'max',
						'median',
						'mode'
					]
				},
				precision: {
					type: 'integer',
					title: 'Precision',
					description: 'Number of decimal places',
					default: 2
				}
			}
		}
	},
	{
		id: 'chat_model',
		name: 'Chat Model',
		type: 'default',
		supportedTypes: ['default'],
		description: 'AI chat model for conversation and text generation',
		category: 'models',
		icon: 'mdi:robot',
		color: '#8b5cf6',
		version: '1.0.0',
		tags: ['model', 'ai', 'chat', 'gpt'],
		inputs: [
			{
				id: 'message',
				name: 'Message',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The message to send to the model'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'response',
				name: 'response',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The model response'
			},
			{
				id: 'model',
				name: 'model',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The model used'
			},
			{
				id: 'temperature',
				name: 'temperature',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The temperature setting'
			},
			{
				id: 'tokens_used',
				name: 'tokens_used',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of tokens used'
			}
		],
		config: { model: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 1000, systemPrompt: '' },
		configSchema: {
			type: 'object',
			properties: {
				model: {
					type: 'string',
					title: 'Model',
					description: 'The chat model to use',
					default: 'gpt-3.5-turbo'
				},
				temperature: {
					type: 'number',
					format: 'range',
					title: 'Temperature',
					description: 'Model temperature (0.0 to 2.0)',
					minimum: 0,
					maximum: 2,
					step: 0.1,
					default: 0.7
				},
				maxTokens: {
					type: 'integer',
					title: 'Max Tokens',
					description: 'Maximum tokens in response',
					default: 1000
				},
				systemPrompt: {
					type: 'string',
					title: 'System Prompt',
					description: 'System prompt for the model',
					format: 'multiline',
					default: ''
				}
			}
		}
	},
	{
		id: 'chat_output',
		name: 'Chat Output',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Display chat-style output with formatting',
		category: 'outputs',
		icon: 'mdi:chat',
		color: '#8b5cf6',
		version: '1.0.0',
		tags: ['output', 'chat', 'display'],
		inputs: [
			{
				id: 'message',
				name: 'Chat Message',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The chat message to output'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'message',
				name: 'message',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The chat message'
			},
			{
				id: 'format',
				name: 'format',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The message format'
			},
			{
				id: 'timestamp',
				name: 'timestamp',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The message timestamp'
			}
		],
		config: { showTimestamp: true, maxLength: 2000, markdown: true },
		configSchema: {
			type: 'object',
			properties: {
				message: {
					type: 'string',
					title: 'Message',
					description: 'Default chat message',
					default: ''
				},
				format: {
					type: 'string',
					title: 'Format',
					description: 'Message format (text, markdown, html)',
					default: 'text'
				},
				showTimestamp: {
					type: 'boolean',
					title: 'Show Timestamp',
					description: 'Whether to include timestamp',
					default: false
				}
			}
		}
	},
	{
		id: 'content_classifier',
		name: 'Content Classifier',
		type: 'tool',
		supportedTypes: ['tool', 'default'],
		description: 'Classify content into categories (support, features, sales) for proper triage',
		category: 'ai',
		icon: 'mdi:tag-multiple',
		color: '#9C27B0',
		version: '1.0.0',
		tags: ['classification', 'triage', 'ai', 'content-analysis'],
		inputs: [
			{
				id: 'tool',
				name: 'Tool',
				type: 'input',
				dataType: 'tool',
				required: false,
				description: 'Available Tools'
			},
			{
				id: 'structured_data',
				name: 'Structured Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Processed form data for classification'
			},
			{
				id: 'raw_data',
				name: 'Raw Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Original form data'
			},
			{
				id: 'submission_id',
				name: 'Submission ID',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Unique submission identifier'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'tool',
				name: 'Tool',
				type: 'output',
				dataType: 'tool',
				required: false,
				description: 'Available tools'
			},
			{
				id: 'submission_id',
				name: 'submission_id',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Unique submission identifier'
			},
			{
				id: 'primary_category',
				name: 'primary_category',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Primary classification category'
			},
			{
				id: 'confidence',
				name: 'confidence',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Classification confidence score (0-1)'
			},
			{
				id: 'category_scores',
				name: 'category_scores',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Scores for all categories'
			},
			{
				id: 'classification_reasoning',
				name: 'classification_reasoning',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Explanation of the classification decision'
			},
			{
				id: 'suggested_teams',
				name: 'suggested_teams',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'Recommended teams to handle this submission'
			},
			{
				id: 'priority_level',
				name: 'priority_level',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Priority level (normal, medium, high)'
			},
			{
				id: 'keywords_found',
				name: 'keywords_found',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Keywords that influenced classification'
			},
			{
				id: 'classified_at',
				name: 'classified_at',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Classification timestamp'
			}
		],
		config: {
			classificationMode: 'full_analysis',
			confidenceThreshold: 0.7,
			categories: ['support', 'features', 'sales', 'general']
		},
		configSchema: {
			type: 'object',
			properties: {
				nodeType: {
					type: 'string',
					title: 'Node Type',
					description: 'Choose the visual representation for this node',
					default: 'tool',
					oneOf: [
						{ const: 'tool', title: 'Tool Node (with metadata port)' },
						{ const: 'default', title: 'Default Node (standard ports)' }
					]
				},
				classificationMode: {
					type: 'string',
					title: 'Classification Mode',
					description: 'Type of analysis to perform',
					enum: ['keyword_only', 'sentiment_analysis', 'full_analysis'],
					default: 'full_analysis'
				},
				confidenceThreshold: {
					type: 'number',
					title: 'Confidence Threshold',
					description: 'Minimum confidence for classification (0-1)',
					format: 'range',
					minimum: 0,
					maximum: 1,
					default: 0.7
				},
				categories: {
					type: 'array',
					title: 'Available Categories',
					description: 'Categories to classify content into',
					items: { type: 'string' },
					default: ['support', 'features', 'sales', 'general']
				}
			}
		}
	},
	{
		id: 'content_loader',
		name: 'Content Loader',
		type: 'tool',
		supportedTypes: ['tool', 'default'],
		description: 'Load content from the site for batch processing',
		category: 'data',
		icon: 'mdi:database-import',
		color: '#FF9800',
		version: '1.0.0',
		tags: ['content', 'drupal', 'batch', 'loader'],
		inputs: [
			{
				id: 'tool',
				name: 'Tool',
				type: 'input',
				dataType: 'tool',
				required: false,
				description: 'Available Tools'
			},
			{
				id: 'filters',
				name: 'Additional Filters',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Additional filtering criteria'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'tool',
				name: 'Tool',
				type: 'output',
				dataType: 'tool',
				required: false,
				description: 'Available tools'
			},
			{
				id: 'content_items',
				name: 'content_items',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'Array of loaded content items'
			},
			{
				id: 'total_count',
				name: 'total_count',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Total number of items loaded'
			},
			{
				id: 'content_type',
				name: 'content_type',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The content type that was loaded'
			},
			{
				id: 'loaded_at',
				name: 'loaded_at',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Timestamp when content was loaded'
			}
		],
		config: { contentType: 'article', status: 'published', limit: 50, fields: ['title', 'body'] },
		configSchema: {
			type: 'object',
			properties: {
				nodeType: {
					type: 'string',
					title: 'Node Type',
					description: 'Choose the visual representation for this node',
					default: 'tool',
					oneOf: [
						{ const: 'tool', title: 'Tool Node (with metadata port)' },
						{ const: 'default', title: 'Default Node (standard ports)' }
					]
				},
				contentType: {
					type: 'string',
					title: 'Content Type',
					description: 'The content type to load',
					enum: ['article', 'page', 'blog_post', 'news'],
					default: 'article'
				},
				status: {
					type: 'string',
					title: 'Publication Status',
					description: 'Filter by publication status',
					enum: ['published', 'unpublished', 'all'],
					default: 'published'
				},
				limit: {
					type: 'integer',
					title: 'Limit',
					description: 'Maximum number of items to load',
					minimum: 1,
					maximum: 1000,
					default: 50
				},
				fields: {
					type: 'array',
					title: 'Fields to Load',
					description: 'Which fields to include in the output',
					items: {
						type: 'string',
						enum: ['title', 'body', 'summary', 'author', 'created', 'tags']
					},
					default: ['title', 'body']
				}
			}
		}
	},
	{
		id: 'conversation_buffer',
		name: 'Conversation Buffer',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Store conversation history',
		category: 'memories',
		icon: 'mdi:database',
		color: '#8b5cf6',
		version: '1.0.0',
		tags: ['memory', 'conversation', 'history', 'buffer'],
		inputs: [
			{
				id: 'message',
				name: 'Message',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The message to add to the buffer'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'buffer',
				name: 'buffer',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The conversation buffer'
			},
			{
				id: 'operation',
				name: 'operation',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The operation performed'
			},
			{
				id: 'buffer_size',
				name: 'buffer_size',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of messages in buffer'
			},
			{
				id: 'max_messages',
				name: 'max_messages',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Maximum messages allowed'
			},
			{
				id: 'include_metadata',
				name: 'include_metadata',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether metadata is included'
			},
			{
				id: 'format',
				name: 'format',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The output format'
			}
		],
		config: { maxTokens: 2000, returnMessages: true },
		configSchema: {
			type: 'object',
			properties: {
				operation: {
					type: 'string',
					title: 'Operation',
					description: 'Buffer operation to perform',
					default: 'add',
					enum: ['add', 'clear', 'get', 'truncate']
				},
				maxMessages: {
					type: 'integer',
					title: 'Max Messages',
					description: 'Maximum number of messages to keep',
					default: 10
				},
				includeMetadata: {
					type: 'boolean',
					title: 'Include Metadata',
					description: 'Whether to include message metadata',
					default: true
				},
				format: {
					type: 'string',
					title: 'Format',
					description: 'Output format to use',
					default: 'array',
					enum: ['array', 'json', 'text']
				}
			}
		}
	},
	{
		id: 'conversation_history',
		name: 'Conversation History',
		type: 'conversation_history',
		supportedTypes: ['conversation_history'],
		description: 'Manages conversation history for AI agents and chat interfaces',
		category: 'ai',
		icon: 'mdi:message-text-clock',
		color: '#06b6d4',
		version: '1.0.0',
		tags: ['conversation', 'history', 'memory', 'ai', 'chat'],
		inputs: [
			{
				id: 'action',
				name: 'Action',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Action to perform on the conversation',
				defaultValue: 'get'
			},
			{
				id: 'conversationId',
				name: 'Conversation ID',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'ID of the conversation to operate on'
			},
			{
				id: 'role',
				name: 'Role',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Message role (for add action)',
				defaultValue: 'user'
			},
			{
				id: 'content',
				name: 'Content',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Message content (for add action)'
			},
			{
				id: 'systemPrompt',
				name: 'System Prompt',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'System prompt (for create action)'
			},
			{
				id: 'toolCallId',
				name: 'Tool Call ID',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Tool call ID (for tool role messages)'
			},
			{
				id: 'metadata',
				name: 'Metadata',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Additional metadata (for create action)'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'conversationId',
				name: 'Conversation ID',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The conversation identifier'
			},
			{
				id: 'messages',
				name: 'Messages',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'Conversation messages formatted for LLM'
			},
			{
				id: 'messageCount',
				name: 'Message Count',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Total number of messages in conversation'
			},
			{
				id: 'found',
				name: 'Found',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the conversation was found (get action)'
			},
			{
				id: 'created',
				name: 'Created',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether a new conversation was created'
			},
			{
				id: 'added',
				name: 'Added',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether a message was added (add action)'
			},
			{
				id: 'cleared',
				name: 'Cleared',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the history was cleared (clear action)'
			},
			{
				id: 'deleted',
				name: 'Deleted',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the conversation was deleted'
			},
			{
				id: 'systemPrompt',
				name: 'System Prompt',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The system prompt if set'
			},
			{
				id: 'metadata',
				name: 'Metadata',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Conversation metadata'
			},
			{
				id: 'error',
				name: 'Error',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Error message if operation failed'
			}
		],
		config: { strategy: 'full', windowSize: 20 },
		configSchema: {
			type: 'object',
			properties: {
				systemPrompt: {
					type: 'string',
					title: 'Default System Prompt',
					description: 'Default system prompt for new conversations',
					default: ''
				},
				strategy: {
					type: 'string',
					title: 'History Strategy',
					description: 'How to manage conversation history',
					enum: ['full', 'window'],
					default: 'full'
				},
				windowSize: {
					type: 'integer',
					title: 'Window Size',
					description: 'Number of recent messages to keep (for window strategy)',
					default: 20,
					minimum: 1,
					maximum: 100
				}
			}
		}
	},
	{
		id: 'data_extractor',
		name: 'Data Extractor',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Extracts Data.',
		category: 'processing',
		icon: 'mdi:cog',
		color: '#007cba',
		version: '1.0.0',
		tags: [],
		inputs: [
			{
				id: 'json',
				name: 'JSON Input',
				type: 'input',
				dataType: 'string',
				required: false,
				description: "JSON string to extract data from (alternative to 'data' input)"
			},
			{
				id: 'data',
				name: 'Data Input',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description: "Structured data (array/object) to extract from (alternative to 'json' input)"
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'data',
				name: 'data',
				type: 'output',
				dataType: 'mixed',
				required: false,
				description: 'The extracted data from the JSON using the property path'
			},
			{
				id: 'path',
				name: 'path',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The property path used for extraction'
			},
			{
				id: 'success',
				name: 'success',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the extraction was successful'
			}
		],
		config: {},
		configSchema: {
			type: 'object',
			properties: {
				path: {
					type: 'string',
					title: 'Property Path',
					description:
						'Property path to extract data (e.g., "[users][0][name]" or "data.user.email"). Leave empty to return entire JSON.',
					default: ''
				}
			}
		}
	},
	{
		id: 'data_operations',
		name: 'Data Operations',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Perform operations on Data objects',
		category: 'processing',
		icon: 'mdi:database-cog',
		color: '#6366f1',
		version: '1.0.0',
		tags: ['processing', 'data', 'operations'],
		inputs: [
			{
				id: 'data',
				name: 'Data',
				type: 'input',
				dataType: 'array',
				required: false,
				description: 'Data to process'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'result',
				name: 'result',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The processed data result'
			},
			{
				id: 'operation',
				name: 'operation',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The operation performed'
			},
			{
				id: 'input_count',
				name: 'input_count',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of input items'
			},
			{
				id: 'output_count',
				name: 'output_count',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of output items'
			}
		],
		config: { operation: 'select_keys', keys: [], filterKey: '', filterValue: '' },
		configSchema: {
			type: 'object',
			properties: {
				operation: {
					type: 'string',
					title: 'Operation',
					description: 'Data operation to perform',
					default: 'filter',
					enum: ['filter', 'sort', 'group', 'map', 'reduce', 'unique', 'slice', 'merge']
				},
				key: { type: 'string', title: 'Key', description: 'Key to operate on', default: '' },
				value: {
					type: 'object',
					title: 'Value',
					description: 'Value for the operation',
					default: ''
				},
				condition: {
					type: 'string',
					title: 'Condition',
					description: 'Condition for filtering',
					default: 'equals',
					enum: [
						'equals',
						'not_equals',
						'contains',
						'greater_than',
						'less_than',
						'greater_than_or_equal',
						'less_than_or_equal',
						'is_empty',
						'is_not_empty'
					]
				}
			}
		}
	},
	{
		id: 'data_to_dataframe',
		name: 'Data to DataFrame',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Convert Data objects to DataFrame',
		category: 'data',
		icon: 'mdi:table-plus',
		color: '#10b981',
		version: '1.0.0',
		tags: ['data', 'dataframe', 'convert', 'table'],
		inputs: [
			{
				id: 'data',
				name: 'Data',
				type: 'input',
				dataType: 'array',
				required: false,
				description: 'The data to convert to dataframe'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'dataframe',
				name: 'dataframe',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The dataframe structure'
			},
			{
				id: 'format',
				name: 'format',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The output format'
			},
			{
				id: 'rows_count',
				name: 'rows_count',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of rows in dataframe'
			},
			{
				id: 'columns_count',
				name: 'columns_count',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of columns in dataframe'
			},
			{
				id: 'include_index',
				name: 'include_index',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether index is included'
			},
			{
				id: 'orient',
				name: 'orient',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The orientation used'
			}
		],
		config: { includeText: true },
		configSchema: {
			type: 'object',
			properties: {
				format: {
					type: 'string',
					title: 'Format',
					description: 'Output format to use',
					default: 'json',
					enum: ['json', 'csv', 'parquet']
				},
				includeIndex: {
					type: 'boolean',
					title: 'Include Index',
					description: 'Whether to include row indices',
					default: false
				},
				orient: {
					type: 'string',
					title: 'Orientation',
					description: 'Data orientation to use',
					default: 'records',
					enum: ['records', 'index', 'columns', 'split']
				}
			}
		}
	},
	{
		id: 'data_to_json',
		name: 'Data to JSON',
		type: 'default',
		supportedTypes: ['default'],
		description: '',
		category: 'processing',
		icon: 'mdi:cog',
		color: '#007cba',
		version: '1.0.0',
		tags: [],
		inputs: [
			{
				id: 'data',
				name: 'Data',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description: 'The structured data to encode as JSON (array/object)'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'json',
				name: 'json',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The JSON string representation'
			},
			{
				id: 'success',
				name: 'success',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the conversion was successful'
			}
		],
		config: {},
		configSchema: { type: 'object', properties: {} }
	},
	{
		id: 'dataframe_operations',
		name: 'DataFrame Operations',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Perform operations on DataFrames',
		category: 'processing',
		icon: 'mdi:table-cog',
		color: '#84cc16',
		version: '1.0.0',
		tags: ['processing', 'dataframe', 'table', 'operations'],
		inputs: [
			{
				id: 'dataframe',
				name: 'Dataframe',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'The dataframe to operate on'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'result',
				name: 'result',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The processed dataframe'
			},
			{
				id: 'operation',
				name: 'operation',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The operation performed'
			},
			{
				id: 'input_rows',
				name: 'input_rows',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of input rows'
			},
			{
				id: 'output_rows',
				name: 'output_rows',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of output rows'
			},
			{
				id: 'columns',
				name: 'columns',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The columns used'
			},
			{
				id: 'rows',
				name: 'rows',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The number of rows'
			}
		],
		config: { operation: 'filter', columnName: '', filterValue: '', ascending: true },
		configSchema: {
			type: 'object',
			properties: {
				operation: {
					type: 'string',
					title: 'Operation',
					description: 'Dataframe operation to perform',
					default: 'head',
					enum: ['head', 'tail', 'select', 'filter', 'sort', 'group', 'aggregate', 'merge']
				},
				columns: {
					type: 'array',
					title: 'Columns',
					description: 'Columns to operate on',
					default: []
				},
				rows: {
					type: 'integer',
					title: 'Rows',
					description: 'Number of rows for head/tail operations',
					default: 5
				},
				condition: {
					type: 'string',
					title: 'Condition',
					description: 'Filter condition',
					default: ''
				}
			}
		}
	},
	{
		id: 'date_time',
		name: 'Date & Time',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Handle date and time operations',
		category: 'tools',
		icon: 'mdi:calendar-clock',
		color: '#84cc16',
		version: '1.0.0',
		tags: ['tools', 'date', 'time', 'format'],
		inputs: [
			{
				id: 'datetime',
				name: 'DateTime',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Optional datetime input to process'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'datetime',
				name: 'datetime',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The formatted datetime'
			},
			{
				id: 'timestamp',
				name: 'timestamp',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The Unix timestamp'
			},
			{
				id: 'format',
				name: 'format',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The format used'
			},
			{
				id: 'timezone',
				name: 'timezone',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The timezone used'
			},
			{
				id: 'operation',
				name: 'operation',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The operation performed'
			},
			{
				id: 'iso',
				name: 'iso',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'ISO 8601 formatted datetime'
			}
		],
		config: { format: 'YYYY-MM-DD', timezone: 'UTC' },
		configSchema: {
			type: 'object',
			properties: {
				operation: {
					type: 'string',
					title: 'Operation',
					description: 'DateTime operation (current, timestamp, iso, unix, custom)',
					default: 'current'
				},
				format: {
					type: 'string',
					title: 'Format',
					description: 'PHP date format string',
					default: 'Y-m-d H:i:s'
				},
				timezone: {
					type: 'string',
					title: 'Timezone',
					description: 'Timezone to use',
					default: 'UTC'
				},
				customFormat: {
					type: 'string',
					title: 'Custom Format',
					description: 'Custom date format for custom operation',
					default: 'Y-m-d H:i:s'
				}
			}
		}
	},
	{
		id: 'file_upload',
		name: 'File Upload',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Upload and process files of various formats',
		category: 'inputs',
		icon: 'mdi:file-upload',
		color: '#ef4444',
		version: '1.0.0',
		tags: ['input', 'file', 'upload', 'document'],
		inputs: [
			{
				id: 'files',
				name: 'Files',
				type: 'input',
				dataType: 'array',
				required: false,
				description: 'Array of files to upload with name and content'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'uploaded_files',
				name: 'uploaded_files',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The uploaded files information'
			},
			{
				id: 'errors',
				name: 'errors',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'Any errors that occurred'
			},
			{
				id: 'directory',
				name: 'directory',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The upload directory'
			},
			{
				id: 'total_files',
				name: 'total_files',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Total number of files uploaded'
			},
			{
				id: 'total_errors',
				name: 'total_errors',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Total number of errors'
			}
		],
		config: { allowedTypes: ['txt', 'pdf', 'docx', 'csv', 'json'], maxSize: 10485760 },
		configSchema: {
			type: 'object',
			properties: {
				directory: {
					type: 'string',
					title: 'Directory',
					description: 'Directory to upload files to',
					default: 'public://flowdrop/uploads/'
				},
				allowedExtensions: {
					type: 'array',
					title: 'Allowed Extensions',
					description: 'Allowed file extensions',
					items: { type: 'string', title: 'Extension', placeholder: 'e.g., pdf' },
					default: ['txt', 'pdf', 'doc', 'docx']
				},
				maxFileSize: {
					type: 'integer',
					title: 'Max File Size',
					description: 'Maximum file size in bytes',
					default: 10485760
				},
				overwrite: {
					type: 'boolean',
					title: 'Overwrite',
					description: 'Whether to overwrite existing files',
					default: false
				}
			}
		}
	},
	{
		id: 'form_data_receiver',
		name: 'Form Data Receiver',
		type: 'tool',
		supportedTypes: ['tool', 'default'],
		description: 'Receive and process form submission data from contact forms',
		category: 'inputs',
		icon: 'mdi:form-select',
		color: '#4CAF50',
		version: '1.0.0',
		tags: ['form', 'input', 'contact', 'submission'],
		inputs: [
			{
				id: 'tool',
				name: 'Tool',
				type: 'input',
				dataType: 'tool',
				required: false,
				description: 'Available Tools'
			},
			{
				id: 'form_data',
				name: 'Form Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Raw form submission data'
			},
			{
				id: 'submission_id',
				name: 'Submission ID',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Unique identifier for this submission'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'tool',
				name: 'Tool',
				type: 'output',
				dataType: 'tool',
				required: false,
				description: 'Available tools'
			},
			{
				id: 'submission_id',
				name: 'submission_id',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Unique submission identifier'
			},
			{
				id: 'form_id',
				name: 'form_id',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Form identifier'
			},
			{
				id: 'raw_data',
				name: 'raw_data',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Original form data as submitted'
			},
			{
				id: 'structured_data',
				name: 'structured_data',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Processed and structured form data'
			},
			{
				id: 'validation_results',
				name: 'validation_results',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Validation results for each field'
			},
			{
				id: 'is_valid',
				name: 'is_valid',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the form data is valid'
			},
			{
				id: 'received_at',
				name: 'received_at',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Timestamp when form was received'
			},
			{
				id: 'processing_metadata',
				name: 'processing_metadata',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Additional metadata about the submission'
			}
		],
		config: {
			formId: 'contact_form',
			requiredFields: ['name', 'email', 'message'],
			validateEmail: true
		},
		configSchema: {
			type: 'object',
			properties: {
				nodeType: {
					type: 'string',
					title: 'Node Type',
					description: 'Choose the visual representation for this node',
					default: 'tool',
					oneOf: [
						{ const: 'tool', title: 'Tool Node (with metadata port)' },
						{ const: 'default', title: 'Default Node (standard ports)' }
					]
				},
				formId: {
					type: 'string',
					title: 'Form ID',
					description: 'Identifier for the form type',
					default: 'contact_form'
				},
				requiredFields: {
					type: 'array',
					title: 'Required Fields',
					description: 'List of required form fields',
					items: { type: 'string' },
					default: ['name', 'email', 'message']
				},
				validateEmail: {
					type: 'boolean',
					title: 'Validate Email',
					description: 'Whether to validate email field format',
					default: true
				}
			}
		}
	},
	{
		id: 'http_request',
		name: 'HTTP Request',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Make HTTP requests to external APIs and services',
		category: 'tools',
		icon: 'mdi:web',
		color: '#3b82f6',
		version: '1.0.0',
		tags: ['tool', 'http', 'api', 'request'],
		inputs: [
			{
				id: 'url',
				name: 'URL',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The URL to request (overrides config)'
			},
			{
				id: 'method',
				name: 'HTTP Method',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The HTTP method to use (overrides config)'
			},
			{
				id: 'headers',
				name: 'Headers',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Additional headers to send'
			},
			{
				id: 'body',
				name: 'Request Body',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Request body (overrides config)'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'status_code',
				name: 'status_code',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'HTTP response status code'
			},
			{
				id: 'headers',
				name: 'headers',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'HTTP response headers'
			},
			{
				id: 'body',
				name: 'body',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'HTTP response body'
			},
		{
			id: 'json',
			name: 'json',
			type: 'output',
			dataType: 'array',
			required: false,
			description: 'Parsed JSON response (if applicable)',
			// Example output schema for autocomplete demonstration
			schema: {
				type: 'object',
				properties: {
					user: {
						type: 'object',
						title: 'User',
						description: 'User information from API',
						properties: {
							id: {
								type: 'integer',
								description: 'User ID'
							},
							name: {
								type: 'string',
								description: 'User full name'
							},
							email: {
								type: 'string',
								description: 'User email address'
							},
							address: {
								type: 'object',
								title: 'Address',
								description: 'User address',
								properties: {
									street: {
										type: 'string',
										description: 'Street address'
									},
									city: {
										type: 'string',
										description: 'City name'
									},
									country: {
										type: 'string',
										description: 'Country name'
									}
								}
							}
						}
					},
					orders: {
						type: 'array',
						title: 'Orders',
						description: 'List of user orders',
						items: {
							type: 'object',
							properties: {
								order_id: {
									type: 'string',
									description: 'Order identifier'
								},
								product_name: {
									type: 'string',
									description: 'Name of the product'
								},
								quantity: {
									type: 'integer',
									description: 'Quantity ordered'
								},
								price: {
									type: 'number',
									description: 'Total price'
								},
								status: {
									type: 'string',
									description: 'Order status'
								}
							}
						}
					}
				}
			}
		},
			{
				id: 'url',
				name: 'url',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The URL that was requested'
			},
			{
				id: 'method',
				name: 'method',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The HTTP method used'
			},
			{
				id: 'request_time',
				name: 'request_time',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Timestamp when request was made'
			}
		],
		config: { method: 'GET', url: '', headers: [], timeout: 30, followRedirects: true },
		configSchema: {
			type: 'object',
			properties: {
				url: { type: 'string', title: 'URL', description: 'The URL to request', default: '' },
				method: {
					type: 'string',
					title: 'HTTP Method',
					description: 'The HTTP method to use',
					default: 'GET',
					enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
				},
				headers: {
					type: 'object',
					title: 'Headers',
					description: 'HTTP headers to send',
					default: []
				},
				body: {
					type: 'string',
					title: 'Request Body',
					description: 'Request body for POST/PUT requests',
					default: ''
				},
				timeout: {
					type: 'integer',
					title: 'Timeout',
					description: 'Request timeout in seconds',
					default: 30,
					minimum: 1,
					maximum: 300
				},
				follow_redirects: {
					type: 'boolean',
					title: 'Follow Redirects',
					description: 'Whether to follow HTTP redirects',
					default: true
				}
			}
		}
	},
	{
		id: 'huggingface_embeddings',
		name: 'HuggingFace Embeddings',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Generate embeddings using HuggingFace models',
		category: 'embeddings',
		icon: 'mdi:vector-square',
		color: '#f59e0b',
		version: '1.0.0',
		tags: ['embeddings', 'huggingface', 'vector'],
		inputs: [
			{
				id: 'texts',
				name: 'Texts',
				type: 'input',
				dataType: 'array',
				required: false,
				description: 'Texts to generate embeddings for'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'embeddings',
				name: 'embeddings',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The generated embeddings'
			},
			{
				id: 'model',
				name: 'model',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The model used'
			},
			{
				id: 'usage',
				name: 'usage',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Usage information'
			},
			{
				id: 'texts_count',
				name: 'texts_count',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of texts processed'
			},
			{
				id: 'embedding_dimensions',
				name: 'embedding_dimensions',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of dimensions in embeddings'
			},
			{
				id: 'normalize',
				name: 'normalize',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether embeddings were normalized'
			}
		],
		config: { model: 'sentence-transformers/all-MiniLM-L6-v2', apiToken: '' },
		configSchema: {
			type: 'object',
			properties: {
				model: {
					type: 'string',
					title: 'Model',
					description: 'Hugging Face model to use for embeddings',
					default: 'sentence-transformers/all-MiniLM-L6-v2'
				},
				apiKey: {
					type: 'string',
					title: 'API Key',
					description: 'Hugging Face API key',
					default: ''
				},
				maxLength: {
					type: 'integer',
					title: 'Max Length',
					description: 'Maximum sequence length',
					default: 512
				},
				normalize: {
					type: 'boolean',
					title: 'Normalize',
					description: 'Whether to normalize embeddings',
					default: true
				}
			}
		}
	},
	{
		id: 'if_else',
		name: 'If/Else',
		type: 'gateway',
		supportedTypes: ['gateway'],
		description: 'Simple conditional logic with text input, match text, and operator',
		category: 'logic',
		icon: 'mdi:code-braces',
		color: '#8b5cf6',
		version: '1.0.0',
		tags: ['logic', 'if', 'else', 'conditional', 'text', 'comparison'],
		inputs: [
			{
				id: 'data',
				name: 'Input Data',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description: 'Optional input data (if not using textInput config)'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [],
		config: { textInput: '', matchText: '', operator: 'equals', caseSensitive: false },
		configSchema: {
			type: 'object',
			properties: {
				matchText: {
					type: 'string',
					title: 'Match Text',
					description: 'The text to match against',
					default: ''
				},
				operator: {
					type: 'string',
					title: 'Operator',
					description: 'The comparison operator to use',
					default: 'equals',
					enum: ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'regex']
				},
				caseSensitive: {
					type: 'boolean',
					title: 'Case Sensitive',
					description: 'Whether string comparisons are case sensitive',
					default: false
				},
				branches: {
					type: 'array',
					description: 'The active branches',
					default: [
						{ name: 'True', value: true },
						{ name: 'False', value: false }
					],
					format: 'hidden',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string', description: 'The name of the branch' },
							value: { type: 'boolean', description: 'The value of the branch' }
						},
						description: 'The active branch'
					}
				}
			}
		}
	},
	{
		id: 'switch',
		name: 'Switch',
		type: 'gateway',
		supportedTypes: ['gateway'],
		description: 'Multi-branch routing based on configurable case values',
		category: 'logic',
		icon: 'mdi:source-branch-sync',
		color: '#8b5cf6',
		version: '1.0.0',
		tags: ['logic', 'switch', 'case', 'routing', 'conditional', 'branch'],
		inputs: [
			{
				id: 'value',
				name: 'Value',
				type: 'input',
				dataType: 'string',
				required: true,
				description: 'The value to match against branch cases'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [],
		config: {
			defaultBranch: 'default',
			caseSensitive: false,
			branches: [
				{ name: 'case_1', label: 'Case 1', value: 'option1' },
				{ name: 'case_2', label: 'Case 2', value: 'option2' },
				{ name: 'default', label: 'Default', value: '' }
			]
		},
		configSchema: {
			type: 'object',
			properties: {
				defaultBranch: {
					type: 'string',
					title: 'Default Branch',
					description: 'The branch to use when no case matches',
					default: 'default'
				},
				caseSensitive: {
					type: 'boolean',
					title: 'Case Sensitive',
					description: 'Whether case matching is case sensitive',
					default: false
				},
				branches: {
					type: 'array',
					title: 'Branches',
					description: 'Configure the switch cases and their output branches',
					items: {
						type: 'object',
						title: 'Branch',
						properties: {
							name: {
								type: 'string',
								title: 'Branch ID',
								description: 'Unique identifier for this branch (used for connections)',
								placeholder: 'e.g., case_success'
							},
							label: {
								type: 'string',
								title: 'Label',
								description: 'Display label for this branch',
								placeholder: 'e.g., Success Case'
							},
							value: {
								type: 'string',
								title: 'Match Value',
								description: 'Value to match for this branch (leave empty for default)',
								placeholder: 'e.g., success'
							}
						},
						required: ['name']
					},
					default: [
						{ name: 'case_1', label: 'Case 1', value: 'option1' },
						{ name: 'case_2', label: 'Case 2', value: 'option2' },
						{ name: 'default', label: 'Default', value: '' }
					],
					minItems: 1
				}
			}
		}
	},
	{
		id: 'foreach',
		name: 'ForEach Loop',
		type: 'default',
		supportedTypes: ['default', 'simple'],
		description:
			'Iterates over an array, processing each item sequentially. Connect the output back to the loop_back input to trigger the next iteration.',
		category: 'logic',
		icon: 'mdi:repeat',
		color: '#8b5cf6',
		version: '1.0.0',
		tags: ['logic', 'loop', 'foreach', 'iterate', 'array', 'iteration', 'loopback'],
		inputs: [
			{
				id: 'items',
				name: 'Items',
				type: 'input',
				dataType: 'array',
				required: true,
				description: 'The array of items to iterate over'
			},
			{
				id: 'loop_back',
				name: 'Loop Back',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description:
					'Connect any output here to trigger the next iteration. Accepts any data type. This creates a valid loopback cycle.'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: 'Start the loop iteration'
			}
		],
		outputs: [
			{
				id: 'item',
				name: 'Item',
				type: 'output',
				dataType: 'mixed',
				required: false,
				description: 'The current item being processed in each iteration'
			},
			{
				id: 'index',
				name: 'Index',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Zero-based index of the current item'
			},
			{
				id: 'total',
				name: 'Total',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Total number of items in the array'
			},
			{
				id: 'is_first',
				name: 'Is First',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'True if this is the first item in the array'
			},
			{
				id: 'is_last',
				name: 'Is Last',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'True if this is the last item in the array'
			},
			{
				id: 'completed',
				name: 'Completed',
				type: 'output',
				dataType: 'trigger',
				required: false,
				description: 'Triggered when all items have been processed'
			}
		],
		config: {
			maxIterations: 1000,
			continueOnError: false
		},
		configSchema: {
			type: 'object',
			properties: {
				nodeType: {
					type: 'string',
					title: 'Node Type',
					description: 'Choose the visual representation for this node',
					default: 'default',
					oneOf: [
						{ const: 'default', title: 'Default (Standard node)' },
						{ const: 'simple', title: 'Simple (Compact)' }
					]
				},
				maxIterations: {
					type: 'integer',
					title: 'Max Iterations',
					description: 'Maximum number of iterations (safety limit to prevent infinite loops)',
					default: 1000,
					minimum: 1,
					maximum: 100000
				},
				continueOnError: {
					type: 'boolean',
					title: 'Continue on Error',
					description: 'If true, continue iterating even if an item fails processing',
					default: false
				}
			}
		}
	},
	{
		id: 'json_to_data',
		name: 'JSON to Data',
		type: 'default',
		supportedTypes: ['default'],
		description: '',
		category: 'processing',
		icon: 'mdi:cog',
		color: '#007cba',
		version: '1.0.0',
		tags: [],
		inputs: [
			{
				id: 'json',
				name: 'JSON String',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The JSON string to decode'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'data',
				name: 'data',
				type: 'output',
				dataType: 'mixed',
				required: false,
				description: 'The decoded structured data (array/object)'
			},
			{
				id: 'success',
				name: 'success',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the conversion was successful'
			}
		],
		config: {},
		configSchema: { type: 'object', properties: {} }
	},
	{
		id: 'message_to_data',
		name: 'Message to Data',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Convert Message objects to Data objects',
		category: 'data',
		icon: 'mdi:message-arrow-right',
		color: '#f59e0b',
		version: '1.0.0',
		tags: ['data', 'message', 'convert'],
		inputs: [
			{
				id: 'message',
				name: 'Message',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The message to convert to data'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'data',
				name: 'data',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The parsed data'
			},
			{
				id: 'format',
				name: 'format',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The format used for parsing'
			},
			{
				id: 'extracted_fields',
				name: 'extracted_fields',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The fields that were extracted'
			},
			{
				id: 'original_message',
				name: 'original_message',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The original message'
			}
		],
		config: {},
		configSchema: {
			type: 'object',
			properties: {
				format: {
					type: 'string',
					title: 'Format',
					description: 'Data format to parse',
					default: 'json',
					enum: ['json', 'csv', 'xml', 'yaml', 'key_value']
				},
				extractFields: {
					type: 'array',
					title: 'Extract Fields',
					description: 'Specific fields to extract from the data',
					default: []
				}
			}
		}
	},
	{
		id: 'notes',
		name: 'Notes',
		type: 'note',
		supportedTypes: ['note'],
		description: 'Add documentation and comments to your workflow with Markdown support',
		category: 'tools',
		icon: 'mdi:note-text',
		color: '#fbbf24',
		version: '1.0.0',
		tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
		inputs: [
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'content',
				name: 'Note Content',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The markdown content of the note'
			},
			{
				id: 'noteType',
				name: 'Note Type',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The visual type of the note (info, warning, success, error, note)'
			},
			{
				id: 'message',
				name: 'Message',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Status message about the note'
			}
		],
		config: {
			content:
				'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
			noteType: 'info'
		},
		configSchema: {
			type: 'object',
			properties: {
				content: {
					type: 'string',
					title: 'Note Content',
					description: 'Documentation or comment text (supports Markdown)',
					format: 'markdown',
					default:
						'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
				},
				noteType: {
					type: 'string',
					title: 'Note Type',
					description: 'Visual style and color of the note',
					default: 'info',
					enum: ['info', 'warning', 'success', 'error', 'note']
				}
			}
		}
	},
	{
		id: 'openai_chat',
		name: 'OpenAI Chat',
		type: 'default',
		supportedTypes: null,
		description: 'OpenAI GPT models for text generation',
		category: 'models',
		icon: 'mdi:robot',
		color: '#10a37f',
		version: '1.0.0',
		tags: ['model', 'openai', 'gpt', 'chat'],
		inputs: [],
		outputs: [],
		config: { model: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 1000, apiKey: '' },
		configSchema: { type: 'object', properties: {} }
	},
	{
		id: 'openai_embeddings',
		name: 'OpenAI Embeddings',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Generate embeddings using OpenAI models',
		category: 'embeddings',
		icon: 'mdi:vector-point',
		color: '#10a37f',
		version: '1.0.0',
		tags: ['embeddings', 'openai', 'vector'],
		inputs: [
			{
				id: 'texts',
				name: 'Texts',
				type: 'input',
				dataType: 'array',
				required: false,
				description: 'Texts to generate embeddings for'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'embeddings',
				name: 'embeddings',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The generated embeddings'
			},
			{
				id: 'model',
				name: 'model',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The model used'
			},
			{
				id: 'usage',
				name: 'usage',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Token usage information'
			},
			{
				id: 'texts_count',
				name: 'texts_count',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of texts processed'
			},
			{
				id: 'embedding_dimensions',
				name: 'embedding_dimensions',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of dimensions in embeddings'
			}
		],
		config: { model: 'text-embedding-3-small', apiKey: '' },
		configSchema: {
			type: 'object',
			properties: {
				model: {
					type: 'string',
					title: 'Model',
					description: 'OpenAI embedding model to use',
					default: 'text-embedding-ada-002'
				},
				apiKey: { type: 'string', title: 'API Key', description: 'OpenAI API key', default: '' },
				maxTokens: {
					type: 'integer',
					title: 'Max Tokens',
					description: 'Maximum tokens per request',
					default: 8191
				}
			}
		}
	},
	{
		id: 'regex_extractor',
		name: 'Regex Extractor',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Extract patterns using regular expressions',
		category: 'processing',
		icon: 'mdi:regex',
		color: '#ec4899',
		version: '1.0.0',
		tags: ['processing', 'regex', 'extract', 'pattern'],
		inputs: [
			{
				id: 'text',
				name: 'Text',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The text to extract from'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'matches',
				name: 'matches',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The regex matches'
			},
			{
				id: 'pattern',
				name: 'pattern',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The regex pattern used'
			},
			{
				id: 'flags',
				name: 'flags',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The regex flags used'
			},
			{
				id: 'match_all',
				name: 'match_all',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether to match all occurrences'
			},
			{
				id: 'total_matches',
				name: 'total_matches',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The total number of matches'
			}
		],
		config: { pattern: '', flags: 'g' },
		configSchema: {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					title: 'Pattern',
					description: 'The regex pattern to match',
					default: ''
				},
				flags: {
					type: 'string',
					title: 'Flags',
					description: 'Regex flags (i, m, s, x, etc.)',
					default: ''
				},
				matchAll: {
					type: 'boolean',
					title: 'Match All',
					description: 'Whether to match all occurrences',
					default: false
				}
			}
		}
	},
	{
		id: 'save_to_file',
		name: 'Save to File',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Save data to various file formats',
		category: 'data',
		icon: 'mdi:content-save',
		color: '#ef4444',
		version: '1.0.0',
		tags: ['data', 'save', 'file', 'export'],
		inputs: [
			{
				id: 'content',
				name: 'Content',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description: 'The content to save to file'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'success',
				name: 'success',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the file was saved successfully'
			},
			{
				id: 'filename',
				name: 'filename',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The filename used'
			},
			{
				id: 'filepath',
				name: 'filepath',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The full file path'
			},
			{
				id: 'bytes_written',
				name: 'bytes_written',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Number of bytes written'
			},
			{
				id: 'format',
				name: 'format',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The output format used'
			},
			{
				id: 'append',
				name: 'append',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the file was appended to'
			}
		],
		config: { fileFormat: 'json', filePath: './output/data.json' },
		configSchema: {
			type: 'object',
			properties: {
				filename: {
					type: 'string',
					title: 'Filename',
					description: 'The filename to save to',
					default: 'output.txt'
				},
				format: {
					type: 'string',
					title: 'Format',
					description: 'Output format to use',
					default: 'text',
					enum: ['text', 'json']
				},
				append: {
					type: 'boolean',
					title: 'Append',
					description: 'Whether to append to existing file',
					default: false
				},
				directory: {
					type: 'string',
					title: 'Directory',
					description: 'Directory to save file in',
					default: 'public://flowdrop/'
				}
			}
		}
	},
	{
		id: 'simple_agent',
		name: 'Simple Agent',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Agent for tool orchestration',
		category: 'agents',
		icon: 'mdi:account-cog',
		color: '#06b6d4',
		version: '1.0.0',
		tags: ['agent', 'orchestration', 'tools'],
		inputs: [
			{
				id: 'message',
				name: 'Message',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The message for the agent to process'
			},
			{
				id: 'tools',
				name: 'Tools',
				type: 'input',
				dataType: 'array',
				required: false,
				description: 'Tools available to the agent',
				defaultValue: []
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'response',
				name: 'response',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The agent response'
			},
			{
				id: 'system_prompt',
				name: 'system_prompt',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The system prompt used'
			},
			{
				id: 'temperature',
				name: 'temperature',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The temperature setting'
			},
			{
				id: 'max_tokens',
				name: 'max_tokens',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The maximum tokens allowed'
			},
			{
				id: 'tools_used',
				name: 'tools_used',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The tools used by the agent'
			},
			{
				id: 'message',
				name: 'message',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The input message'
			}
		],
		config: { model: 'gpt-3.5-turbo', temperature: 0.7, maxIterations: 5 },
		configSchema: {
			type: 'object',
			properties: {
				systemPrompt: {
					type: 'string',
					title: 'System Prompt',
					description: 'System prompt for the agent',
					format: 'multiline',
					default: 'You are a helpful assistant.'
				},
				temperature: {
					type: 'number',
					format: 'range',
					title: 'Temperature',
					description: 'Temperature for response generation (0.0 to 1.0)',
					minimum: 0,
					maximum: 1,
					step: 0.1,
					default: 0.7
				},
				maxTokens: {
					type: 'integer',
					title: 'Max Tokens',
					description: 'Maximum tokens for response',
					default: 1000
				}
			}
		}
	},
	{
		id: 'split_text',
		name: 'Split Text',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Split text into chunks for processing',
		category: 'processing',
		icon: 'mdi:content-cut',
		color: '#f59e0b',
		version: '1.0.0',
		tags: ['processing', 'text', 'split', 'chunking'],
		inputs: [
			{
				id: 'text',
				name: 'Text',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The text to split'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'chunks',
				name: 'chunks',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'The text chunks'
			},
			{
				id: 'method',
				name: 'method',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The splitting method used'
			},
			{
				id: 'chunk_size',
				name: 'chunk_size',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The size of each chunk'
			},
			{
				id: 'total_chunks',
				name: 'total_chunks',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The total number of chunks'
			}
		],
		config: { chunkSize: 1000, chunkOverlap: 200, separator: '\\\\n' },
		configSchema: {
			type: 'object',
			properties: {
				method: {
					type: 'string',
					title: 'Method',
					description: 'Splitting method to use',
					default: 'words',
					enum: ['words', 'characters', 'sentences', 'paragraphs']
				},
				chunkSize: {
					type: 'integer',
					title: 'Chunk Size',
					description: 'Size of each chunk',
					default: 100
				},
				separator: {
					type: 'string',
					title: 'Separator',
					description: 'Separator for word splitting',
					default: ' '
				}
			}
		}
	},
	{
		id: 'structured_output',
		name: 'Structured Output',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Generate structured output from models',
		category: 'prompts',
		icon: 'mdi:table',
		color: '#6366f1',
		version: '1.0.0',
		tags: ['prompt', 'structured', 'output', 'schema'],
		inputs: [
			{
				id: 'data',
				name: 'Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'The data to structure and output'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'output',
				name: 'output',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The formatted output'
			},
			{
				id: 'data',
				name: 'data',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The structured data'
			},
			{
				id: 'format',
				name: 'format',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The output format used'
			},
			{
				id: 'validation_errors',
				name: 'validation_errors',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'Any validation errors'
			},
			{
				id: 'is_valid',
				name: 'is_valid',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the data is valid'
			}
		],
		config: { schema: [], outputType: 'json' },
		configSchema: {
			type: 'object',
			properties: {
				format: {
					type: 'string',
					title: 'Format',
					description: 'Output format to use',
					default: 'json',
					enum: ['json', 'xml', 'yaml', 'csv']
				},
				schema: {
					type: 'object',
					title: 'Schema',
					description: 'Validation schema for the output',
					default: []
				},
				validate: {
					type: 'boolean',
					title: 'Validate',
					description: 'Whether to validate against schema',
					default: true
				}
			}
		}
	},
	{
		id: 'text_find_replace',
		name: 'Text Find & Replace',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Find and replace text in content with advanced options',
		category: 'processing',
		icon: 'mdi:find-replace',
		color: '#2196F3',
		version: '1.0.0',
		tags: ['text', 'replace', 'content', 'processing'],
		inputs: [
			{
				id: 'content',
				name: 'Content to Process',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description: 'Text content or array of content items to process'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'processed_content',
				name: 'processed_content',
				type: 'output',
				dataType: 'mixed',
				required: false,
				description: 'The processed content with replacements made'
			},
			{
				id: 'replacements_made',
				name: 'replacements_made',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'Total number of replacements made'
			},
			{
				id: 'find_text',
				name: 'find_text',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The text that was searched for'
			},
			{
				id: 'replace_text',
				name: 'replace_text',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The replacement text used'
			},
			{
				id: 'processed_at',
				name: 'processed_at',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Timestamp when processing completed'
			}
		],
		config: {
			findText: 'XB',
			replaceText: 'Canvas',
			caseSensitive: false,
			useRegex: false,
			wholeWordsOnly: true
		},
		configSchema: {
			type: 'object',
			properties: {
				findText: {
					type: 'string',
					title: 'Find Text',
					description: 'Text to search for',
					default: 'XB'
				},
				replaceText: {
					type: 'string',
					title: 'Replace Text',
					description: 'Text to replace with',
					default: 'Canvas'
				},
				caseSensitive: {
					type: 'boolean',
					title: 'Case Sensitive',
					description: 'Whether the search should be case sensitive',
					default: false
				},
				useRegex: {
					type: 'boolean',
					title: 'Use Regular Expressions',
					description: 'Treat find text as a regular expression',
					default: false
				},
				wholeWordsOnly: {
					type: 'boolean',
					title: 'Whole Words Only',
					description: 'Only match whole words, not partial matches',
					default: true
				}
			}
		}
	},
	{
		id: 'text_input',
		name: 'Text Input',
		type: 'simple',
		supportedTypes: ['simple', 'square', 'default'],
		description: 'Simple text input for user data',
		category: 'inputs',
		icon: 'mdi:text',
		color: '#22c55e',
		version: '1.0.0',
		tags: ['input', 'text', 'user-input'],
		inputs: [],
		outputs: [
			{
				id: 'text',
				name: 'text',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The input text value'
			}
		],
		config: { placeholder: 'Enter text here...', defaultValue: '', multiline: false },
		configSchema: {
			type: 'object',
			properties: {
				nodeType: {
					type: 'string',
					title: 'Node Type',
					description: 'Choose the visual representation for this node',
					default: 'simple',
					oneOf: [
						{ const: 'simple', title: 'Simple (compact layout)' },
						{ const: 'square', title: 'Square (square layout)' },
						{ const: 'default', title: 'Default' }
					]
				},
				placeholder: {
					type: 'string',
					title: 'Placeholder',
					description: 'Placeholder text for the input field',
					default: 'Enter text...'
				},
				defaultValue: {
					type: 'string',
					title: 'Default Value',
					description: 'Default text value',
					default: ''
				}
			}
		}
	},
	{
		id: 'text_output',
		name: 'Text Output',
		type: 'simple',
		supportedTypes: ['square', 'simple', 'default'],
		description: 'Simple text output for displaying data',
		category: 'outputs',
		icon: 'mdi:text-box',
		color: '#ef4444',
		version: '1.0.0',
		tags: ['output', 'text', 'display'],
		inputs: [
			{
				id: 'text',
				name: 'Text Input',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The text to output'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [],
		config: { format: 'plain', maxLength: 1000, showTimestamp: false },
		configSchema: {
			type: 'object',
			properties: {
				nodeType: {
					type: 'string',
					title: 'Node Type',
					description: 'Choose the visual representation for this node',
					default: 'simple',
					oneOf: [
						{ const: 'simple', title: 'Simple (compact layout)' },
						{ const: 'square', title: 'Square (square layout)' },
						{ const: 'default', title: 'Default' }
					]
				},
				maxLength: {
					type: 'integer',
					title: 'Maximum Length',
					description: 'Maximum length of output text',
					default: 1000,
					minimum: 1,
					maximum: 10000
				},
				format: {
					type: 'string',
					title: 'Text Format',
					description: 'Text formatting option',
					default: 'plain',
					enum: ['plain', 'html', 'markdown']
				}
			}
		}
	},
	{
		id: 'trigger',
		name: 'Trigger',
		type: 'terminal',
		supportedTypes: ['terminal'],
		description: '',
		category: 'processing',
		icon: 'mdi:cog',
		color: '#007cba',
		version: '1.0.0',
		tags: [],
		inputs: [],
		outputs: [
			{
				id: 'output',
				name: 'Output',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Trigger output containing entity data, event type, and metadata'
			}
		],
		config: {
			triggerData: [],
			enabled: 1,
			eventType: 'entity.insert',
			entityTypes: ['node'],
			bundles: [],
			orchestrator: 'default'
		},
		configSchema: {
			type: 'object',
			properties: {
				triggerData: {
					type: 'object',
					title: 'Trigger Data',
					description: 'Default data to use when the trigger is activated',
					default: []
				},
				workflowId: {
					type: 'string',
					title: 'Workflow ID',
					description: 'The ID of the workflow to trigger',
					default: ''
				},
				pipelineId: {
					type: 'string',
					title: 'Pipeline ID',
					description: 'The ID of the pipeline to trigger',
					default: ''
				},
				description: {
					type: 'string',
					title: 'Description',
					description: 'Optional description for this trigger',
					default: ''
				},
				enabled: {
					type: 'boolean',
					title: 'Enabled',
					description: 'Whether this trigger is enabled',
					default: true
				},
				variant: {
					type: 'string',
					title: 'Variant',
					description: 'Terminal node variant (start for triggers)',
					enum: ['start'],
					default: 'start'
				},
				eventType: {
					type: 'string',
					title: 'Event Type',
					description: 'The type of entity event to trigger on',
					oneOf: [
						{ const: 'entity.insert', title: 'Entity Created' },
						{ const: 'entity.update', title: 'Entity Updated' },
						{ const: 'entity.delete', title: 'Entity Deleted' },
						{ const: 'entity.presave', title: 'Before Entity Save' },
						{ const: 'user.login', title: 'User Login' },
						{ const: 'user.logout', title: 'User Logout' }
					],
					default: 'entity.insert'
				},
				entityTypes: {
					type: 'array',
					title: 'Entity Types',
					description: 'Entity types to trigger on (empty = all content entities)',
					items: { type: 'string' },
					default: ['node']
				},
				bundles: {
					type: 'array',
					title: 'Bundles',
					description: 'Content type bundles to trigger on (empty = all)',
					items: { type: 'string' },
					default: []
				},
				orchestrator: {
					type: 'string',
					title: 'Orchestrator',
					description:
						"Override the default orchestrator for this trigger. Use 'default' for automatic selection based on event type, or specify a custom orchestrator ID.",
					examples: ['default', 'synchronous', 'asynchronous'],
					default: 'default'
				}
			},
			required: []
		}
	},
	{
		id: 'url_fetch',
		name: 'URL Fetch',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Fetch content from URLs',
		category: 'inputs',
		icon: 'mdi:link',
		color: '#3b82f6',
		version: '1.0.0',
		tags: ['input', 'url', 'web', 'fetch'],
		inputs: [
			{
				id: 'url',
				name: 'URL',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'The URL to fetch'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'response',
				name: 'response',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The HTTP response'
			},
			{
				id: 'url',
				name: 'url',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The URL that was fetched'
			},
			{
				id: 'method',
				name: 'method',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The HTTP method used'
			},
			{
				id: 'timeout',
				name: 'timeout',
				type: 'output',
				dataType: 'number',
				required: false,
				description: 'The timeout used'
			},
			{
				id: 'follow_redirects',
				name: 'follow_redirects',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether redirects were followed'
			},
			{
				id: 'parse_json',
				name: 'parse_json',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether JSON was parsed'
			}
		],
		config: { urls: [], maxDepth: 1, format: 'text', timeout: 30 },
		configSchema: {
			type: 'object',
			properties: {
				url: { type: 'string', title: 'URL', description: 'The URL to fetch', default: '' },
				method: {
					type: 'string',
					title: 'Method',
					description: 'HTTP method to use',
					default: 'GET',
					enum: ['GET', 'POST', 'PUT', 'DELETE']
				},
				headers: {
					type: 'object',
					title: 'Headers',
					description: 'HTTP headers to send',
					default: []
				},
				timeout: {
					type: 'integer',
					title: 'Timeout',
					description: 'Request timeout in seconds',
					default: 30
				},
				followRedirects: {
					type: 'boolean',
					title: 'Follow Redirects',
					description: 'Whether to follow HTTP redirects',
					default: true
				},
				parseJson: {
					type: 'boolean',
					title: 'Parse JSON',
					description: 'Whether to parse JSON response',
					default: false
				}
			}
		}
	},
	{
		id: 'webhook',
		name: 'Webhook',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Receive data from external webhooks',
		category: 'inputs',
		icon: 'mdi:webhook',
		color: '#06b6d4',
		version: '1.0.0',
		tags: ['input', 'webhook', 'external'],
		inputs: [
			{
				id: 'payload',
				name: 'Payload',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'The data to send in the webhook'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'response',
				name: 'response',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The webhook response'
			},
			{
				id: 'url',
				name: 'url',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The webhook URL'
			},
			{
				id: 'method',
				name: 'method',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The HTTP method used'
			},
			{
				id: 'payload',
				name: 'payload',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The payload sent'
			},
			{
				id: 'headers',
				name: 'headers',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The headers sent'
			}
		],
		config: { endpoint: '', method: 'POST' },
		configSchema: {
			type: 'object',
			properties: {
				url: { type: 'string', title: 'URL', description: 'The webhook URL', default: '' },
				method: {
					type: 'string',
					title: 'Method',
					description: 'HTTP method to use',
					default: 'POST',
					enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
				},
				headers: {
					type: 'object',
					title: 'Headers',
					description: 'HTTP headers to send',
					default: []
				},
				timeout: {
					type: 'integer',
					title: 'Timeout',
					description: 'Request timeout in seconds',
					default: 30
				}
			}
		}
	},
	{
		id: 'custom_function',
		name: 'Custom Function',
		type: 'default',
		supportedTypes: ['default'],
		description: 'A node with user-defined dynamic inputs and outputs for custom data processing',
		category: 'processing',
		icon: 'mdi:function-variant',
		color: '#8b5cf6',
		version: '1.0.0',
		tags: ['processing', 'function', 'custom', 'dynamic', 'ports'],
		inputs: [
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: 'Workflow trigger input'
			}
		],
		outputs: [
			{
				id: 'success',
				name: 'Success',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the function executed successfully'
			}
		],
		config: {
			functionName: 'myCustomFunction',
			dynamicInputs: [
				{
					name: 'input_1',
					label: 'First Input',
					description: 'The first input parameter',
					dataType: 'string',
					required: true
				},
				{
					name: 'input_2',
					label: 'Second Input',
					description: 'The second input parameter',
					dataType: 'number',
					required: false
				}
			],
			dynamicOutputs: [
				{
					name: 'output_1',
					label: 'Primary Output',
					description: 'The main output value',
					dataType: 'string',
					required: false
				},
				{
					name: 'output_2',
					label: 'Metadata',
					description: 'Additional metadata from processing',
					dataType: 'json',
					required: false
				}
			]
		},
		configSchema: {
			type: 'object',
			properties: {
				functionName: {
					type: 'string',
					title: 'Function Name',
					description: 'Name identifier for this custom function',
					default: 'myCustomFunction'
				},
				dynamicInputs: {
					type: 'array',
					title: 'Dynamic Inputs',
					description: 'Configure custom input ports for this node',
					items: {
						type: 'object',
						title: 'Input Port',
						properties: {
							name: {
								type: 'string',
								title: 'Port ID',
								description: 'Unique identifier for this input port (used for connections)',
								placeholder: 'e.g., my_input'
							},
							label: {
								type: 'string',
								title: 'Label',
								description: 'Display label for this input port',
								placeholder: 'e.g., My Input'
							},
							description: {
								type: 'string',
								title: 'Description',
								description: 'Description of what this input accepts',
								placeholder: 'e.g., The data to process'
							},
							dataType: {
								type: 'string',
								title: 'Data Type',
								description: 'The type of data this input accepts',
								default: 'string',
								enum: ['string', 'number', 'boolean', 'array', 'json', 'mixed', 'trigger', 'tool']
							},
							required: {
								type: 'boolean',
								title: 'Required',
								description: 'Whether this input is required for execution',
								default: false
							}
						},
						required: ['name', 'label', 'dataType']
					},
					default: [
						{
							name: 'input_1',
							label: 'First Input',
							description: 'The first input parameter',
							dataType: 'string',
							required: true
						}
					],
					minItems: 0
				},
				dynamicOutputs: {
					type: 'array',
					title: 'Dynamic Outputs',
					description: 'Configure custom output ports for this node',
					items: {
						type: 'object',
						title: 'Output Port',
						properties: {
							name: {
								type: 'string',
								title: 'Port ID',
								description: 'Unique identifier for this output port (used for connections)',
								placeholder: 'e.g., my_output'
							},
							label: {
								type: 'string',
								title: 'Label',
								description: 'Display label for this output port',
								placeholder: 'e.g., My Output'
							},
							description: {
								type: 'string',
								title: 'Description',
								description: 'Description of what this output provides',
								placeholder: 'e.g., The processed result'
							},
							dataType: {
								type: 'string',
								title: 'Data Type',
								description: 'The type of data this output provides',
								default: 'string',
								enum: ['string', 'number', 'boolean', 'array', 'json', 'mixed', 'trigger', 'tool']
							},
							required: {
								type: 'boolean',
								title: 'Required',
								description: 'Whether this output is always provided',
								default: false
							}
						},
						required: ['name', 'label', 'dataType']
					},
					default: [
						{
							name: 'output_1',
							label: 'Primary Output',
							description: 'The main output value',
							dataType: 'string',
							required: false
						}
					],
					minItems: 0
				}
			}
		}
	},
	{
		id: 'data_mapper',
		name: 'Data Mapper',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Map and transform data with configurable input/output ports',
		category: 'processing',
		icon: 'mdi:map-marker-path',
		color: '#10b981',
		version: '1.0.0',
		tags: ['processing', 'mapping', 'transform', 'dynamic', 'ports'],
		inputs: [
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: 'Workflow trigger input'
			}
		],
		outputs: [
			{
				id: 'mapped_data',
				name: 'Mapped Data',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The transformed data output'
			}
		],
		config: {
			mappingMode: 'simple',
			dynamicInputs: [
				{
					name: 'source_data',
					label: 'Source Data',
					description: 'The source data to map from',
					dataType: 'json',
					required: true
				}
			],
			dynamicOutputs: [
				{
					name: 'result',
					label: 'Mapped Result',
					description: 'The mapped result data',
					dataType: 'json',
					required: false
				}
			]
		},
		configSchema: {
			type: 'object',
			properties: {
				mappingMode: {
					type: 'string',
					title: 'Mapping Mode',
					description: 'The type of mapping to perform',
					default: 'simple',
					enum: ['simple', 'advanced', 'expression']
				},
				dynamicInputs: {
					type: 'array',
					title: 'Input Ports',
					description: 'Define the input ports for receiving data',
					items: {
						type: 'object',
						title: 'Input Port',
						properties: {
							name: {
								type: 'string',
								title: 'Port ID',
								description: 'Unique identifier for this input port',
								placeholder: 'e.g., source_field'
							},
							label: {
								type: 'string',
								title: 'Label',
								description: 'Display label for this input',
								placeholder: 'e.g., Source Field'
							},
							description: {
								type: 'string',
								title: 'Description',
								description: 'Description of the input',
								placeholder: 'e.g., Field to map from'
							},
							dataType: {
								type: 'string',
								title: 'Data Type',
								description: 'Expected data type',
								default: 'mixed',
								enum: ['string', 'number', 'boolean', 'array', 'json', 'mixed']
							},
							required: {
								type: 'boolean',
								title: 'Required',
								description: 'Is this input required?',
								default: false
							}
						},
						required: ['name', 'label', 'dataType']
					},
					default: [
						{
							name: 'source_data',
							label: 'Source Data',
							description: 'The source data to map from',
							dataType: 'json',
							required: true
						}
					]
				},
				dynamicOutputs: {
					type: 'array',
					title: 'Output Ports',
					description: 'Define the output ports for transformed data',
					items: {
						type: 'object',
						title: 'Output Port',
						properties: {
							name: {
								type: 'string',
								title: 'Port ID',
								description: 'Unique identifier for this output port',
								placeholder: 'e.g., target_field'
							},
							label: {
								type: 'string',
								title: 'Label',
								description: 'Display label for this output',
								placeholder: 'e.g., Target Field'
							},
							description: {
								type: 'string',
								title: 'Description',
								description: 'Description of the output',
								placeholder: 'e.g., Mapped field value'
							},
							dataType: {
								type: 'string',
								title: 'Data Type',
								description: 'Output data type',
								default: 'mixed',
								enum: ['string', 'number', 'boolean', 'array', 'json', 'mixed']
							},
							required: {
								type: 'boolean',
								title: 'Required',
								description: 'Is this output always provided?',
								default: false
							}
						},
						required: ['name', 'label', 'dataType']
					},
					default: [
						{
							name: 'result',
							label: 'Mapped Result',
							description: 'The mapped result data',
							dataType: 'json',
							required: false
						}
					]
				}
			}
		}
	},
	{
		id: 'json_validator',
		name: 'JSON Validator',
		type: 'default',
		supportedTypes: ['default'],
		description:
			'Validates JSON data against a JSON Schema and outputs validation result with original data',
		category: 'processing',
		icon: 'mdi:check-decagram',
		color: '#10b981',
		version: '1.0.0',
		tags: ['validation', 'json', 'schema', 'data-quality'],
		inputs: [
			{
				id: 'data',
				name: 'Data',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description: 'JSON data to validate'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'valid',
				name: 'valid',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether the data is valid (true/false)'
			},
			{
				id: 'data',
				name: 'data',
				type: 'output',
				dataType: 'mixed',
				required: false,
				description: 'Original data passed through'
			},
			{
				id: 'errors',
				name: 'errors',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'Array of validation errors (if any)'
			},
			{
				id: 'schema',
				name: 'schema',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The schema used for validation'
			}
		],
		config: {
			jsonSchema: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					age: { type: 'number' }
				},
				required: ['name']
			},
			strictMode: true
		},
		configSchema: {
			type: 'object',
			properties: {
				jsonSchema: {
					type: 'object',
					title: 'JSON Schema',
					description: 'The JSON Schema to validate against (JSON Schema Draft 7)',
					format: 'json',
					default: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							age: { type: 'number' }
						},
						required: ['name']
					}
				},
				strictMode: {
					type: 'boolean',
					title: 'Strict Mode',
					description: 'Fail validation if additional properties are present',
					default: true
				}
			}
		}
	},
	{
		id: 'prompt_template',
		name: 'Prompt Template',
		type: 'default',
		supportedTypes: ['default'],
		description:
			'Render dynamic templates using Twig-style {{ variable }} placeholders with data from inputs',
		category: 'processing',
		icon: 'mdi:text-box-edit-outline',
		color: '#a855f7',
		version: '1.0.0',
		tags: ['template', 'prompt', 'text', 'variable', 'twig', 'render', 'interpolation'],
		inputs: [
			{
				id: 'data',
				name: 'Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description:
					"Object containing variables to substitute in the template (e.g., { name: 'John', order_id: 123 })"
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'output',
				name: 'output',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The rendered template with all variables substituted'
			},
			{
				id: 'template',
				name: 'template',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'The original template string used'
			},
			{
				id: 'variables',
				name: 'variables',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Object containing the variables that were substituted'
			},
			{
				id: 'missing_variables',
				name: 'missing_variables',
				type: 'output',
				dataType: 'array',
				required: false,
				description: 'List of variable names found in template but missing from data'
			},
			{
				id: 'success',
				name: 'success',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether template rendering completed without errors'
			}
		],
		config: {
			template:
				'Hello {{ name }},\n\nYour order #{{ order_id }} has been {{ status }}.\n\nThank you for choosing us!',
			strictMode: false,
			preserveWhitespace: true
		},
		configSchema: {
			type: 'object',
			properties: {
				template: {
					type: 'string',
					title: 'Template',
					description:
						'Template text with {{ variable }} placeholders that will be replaced with values from the data input',
					format: 'template',
					// Configure which input port(s) provide variables for autocomplete
					variables: {
						ports: ['data'],
						showHints: true
					},
					default:
						'Hello {{ name }},\n\nYour order #{{ order_id }} has been {{ status }}.\n\nThank you for choosing us!',
					height: '300px',
					placeholderExample:
						'Dear {{ customer_name }}, your {{ product_name }} is ready for pickup.'
				},
				strictMode: {
					type: 'boolean',
					title: 'Strict Mode',
					description:
						'When enabled, throw an error if a variable in the template is missing from the data. When disabled, missing variables are left as-is.',
					default: false
				},
				preserveWhitespace: {
					type: 'boolean',
					title: 'Preserve Whitespace',
					description: 'Preserve whitespace and newlines in the rendered output',
					default: true
				},
				fallbackValue: {
					type: 'string',
					title: 'Fallback Value',
					description:
						'Value to use for missing variables when strict mode is off (leave empty to keep the placeholder)',
					default: ''
				}
			}
		}
	},
	// ==========================================
	// Demo nodes showcasing configEdit feature
	// ==========================================
	{
		id: 'dynamic_config_demo',
		name: 'Dynamic Config Demo',
		type: 'default',
		supportedTypes: ['default'],
		description:
			'Demo node showcasing configEdit feature with external edit link and dynamic schema fetching',
		category: 'tools',
		icon: 'mdi:cog-sync',
		color: '#7c3aed',
		version: '1.0.0',
		tags: ['demo', 'dynamic', 'config', 'external', 'admin'],
		inputs: [
			{
				id: 'data',
				name: 'Data Input',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Input data to process'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'result',
				name: 'result',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'The processed result'
			},
			{
				id: 'config_source',
				name: 'config_source',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Source of the configuration (static, dynamic, or external)'
			}
		],
		config: {},
		// No static configSchema - this will be fetched dynamically or configured externally
		configSchema: undefined,
		// ConfigEdit configuration for dynamic/external configuration
		configEdit: {
			// Option 1: External edit link - opens a 3rd party form in new tab
			externalEditLink: {
				url: 'https://admin.example.com/nodes/{nodeTypeId}/configure?instance={instanceId}&workflow={workflowId}',
				label: 'Configure in Admin Portal',
				icon: 'mdi:open-in-new',
				description:
					'This node requires advanced configuration. Click to open the admin portal where you can configure all options.',
				parameterMapping: {
					nodeTypeId: 'metadata.id',
					instanceId: 'id',
					workflowId: 'workflowId'
				},
				openInNewTab: true,
				callbackUrlParam: 'returnUrl'
			},
			// Option 2: Dynamic schema endpoint - fetches config schema at runtime
			dynamicSchema: {
				url: '/nodes/{nodeTypeId}/schema',
				method: 'GET',
				parameterMapping: {
					nodeTypeId: 'metadata.id'
				},
				headers: {
					'X-FlowDrop-Instance': '{instanceId}'
				},
				cacheSchema: true,
				timeout: 10000
			},
			// When both are configured, prefer dynamic schema (falls back to external if fetch fails)
			preferDynamicSchema: true,
			showRefreshButton: true,
			loadingMessage: 'Loading dynamic configuration options...',
			errorMessage: 'Could not load configuration. Please use the external admin portal instead.'
		}
	},
	{
		id: 'external_only_config_demo',
		name: 'External Config Only Demo',
		type: 'default',
		supportedTypes: ['default'],
		description:
			'Demo node with only external edit link - config is managed entirely by 3rd party system',
		category: 'tools',
		icon: 'mdi:link-variant',
		color: '#0891b2',
		version: '1.0.0',
		tags: ['demo', 'external', 'config', 'admin', 'third-party'],
		inputs: [
			{
				id: 'input',
				name: 'Input',
				type: 'input',
				dataType: 'mixed',
				required: false,
				description: 'Input to process'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'output',
				name: 'output',
				type: 'output',
				dataType: 'mixed',
				required: false,
				description: 'Processed output'
			}
		],
		config: {},
		configSchema: undefined,
		configEdit: {
			externalEditLink: {
				url: 'https://settings.example.com/integrations/{nodeTypeId}',
				label: 'Open Configuration Portal',
				icon: 'mdi:application-cog',
				description:
					'Configuration for this integration is managed in the external settings portal. Click to configure authentication, API keys, and advanced options.',
				parameterMapping: {
					nodeTypeId: 'metadata.id'
				},
				openInNewTab: true
			}
		}
	},
	{
		id: 'dynamic_schema_only_demo',
		name: 'Dynamic Schema Only Demo',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Demo node with only dynamic schema - config schema is fetched from REST endpoint',
		category: 'tools',
		icon: 'mdi:cloud-sync',
		color: '#059669',
		version: '1.0.0',
		tags: ['demo', 'dynamic', 'schema', 'rest', 'api'],
		inputs: [
			{
				id: 'data',
				name: 'Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Data to process'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: ''
			}
		],
		outputs: [
			{
				id: 'result',
				name: 'result',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Processing result'
			},
			{
				id: 'schema_version',
				name: 'schema_version',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Version of the dynamic schema used'
			}
		],
		config: {},
		configSchema: undefined,
		configEdit: {
			dynamicSchema: {
				url: '/nodes/{nodeTypeId}/schema?version=latest',
				method: 'GET',
				parameterMapping: {
					nodeTypeId: 'metadata.id'
				},
				cacheSchema: true,
				timeout: 15000
			},
			showRefreshButton: true,
			loadingMessage: 'Fetching latest configuration schema...',
			errorMessage: 'Failed to load configuration schema. Please check your network connection.'
		}
	},
	{
		id: 'idea',
		name: 'Idea',
		type: 'idea',
		supportedTypes: ['idea'],
		description:
			'Conceptual idea node for BPMN-like flow diagrams. Chain ideas together without committing to specific implementations.',
		category: 'helpers',
		icon: 'mdi:lightbulb-outline',
		color: '#6366f1',
		version: '1.0.0',
		tags: ['idea', 'concept', 'bpmn', 'flow', 'planning', 'brainstorm'],
		inputs: [],
		outputs: [],
		config: {
			title: 'New Idea',
			description: 'Describe your idea here...',
			icon: 'mdi:lightbulb-outline',
			color: '#6366f1',
			enableLeftPort: true,
			enableRightPort: true,
			enableTopPort: false,
			enableBottomPort: false
		},
		configSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					title: 'Title',
					description: 'The main title or name of your idea',
					default: 'New Idea'
				},
				description: {
					type: 'string',
					title: 'Description',
					description: 'Detailed description of the idea or concept',
					format: 'multiline',
					default: 'Describe your idea here...'
				},
				icon: {
					type: 'string',
					title: 'Icon',
					description: 'Custom icon for the idea (Iconify format, e.g., mdi:brain)',
					default: 'mdi:lightbulb-outline'
				},
				color: {
					type: 'string',
					title: 'Accent Color',
					description: 'Accent color for visual grouping (hex format)',
					default: '#6366f1'
				},
				enableLeftPort: {
					type: 'boolean',
					title: 'Enable Left Port',
					description: 'Show connection port on the left side (input)',
					default: true
				},
				enableRightPort: {
					type: 'boolean',
					title: 'Enable Right Port',
					description: 'Show connection port on the right side (output)',
					default: true
				},
				enableTopPort: {
					type: 'boolean',
					title: 'Enable Top Port',
					description: 'Show connection port on the top (input)',
					default: false
				},
				enableBottomPort: {
					type: 'boolean',
					title: 'Enable Bottom Port',
					description: 'Show connection port on the bottom (output)',
					default: false
				}
			}
		}
	},
	// Task Assignment Node - demonstrates autocomplete form fields
	{
		id: 'task_assignment',
		name: 'Task Assignment',
		type: 'default',
		supportedTypes: ['default', 'simple'],
		description:
			'Assign tasks to team members with categories and tags. Demonstrates autocomplete form fields.',
		category: 'helpers',
		icon: 'mdi:account-check',
		color: '#10b981',
		version: '1.0.0',
		tags: ['task', 'assignment', 'team', 'autocomplete', 'demo'],
		inputs: [
			{
				id: 'task_data',
				name: 'Task Data',
				type: 'input',
				dataType: 'object',
				required: false,
				description: 'Task data to process'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: 'Trigger input'
			}
		],
		outputs: [
			{
				id: 'assignment',
				name: 'Assignment',
				type: 'output',
				dataType: 'object',
				required: false,
				description: 'Complete task assignment object'
			},
			{
				id: 'assignee_id',
				name: 'Assignee ID',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'ID of the assigned user'
			},
			{
				id: 'category_id',
				name: 'Category ID',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'ID of the selected category'
			}
		],
		config: {
			assignee: '',
			category: '',
			tags: '',
			location: '',
			priority: 'medium',
			notifyAssignee: true,
			description: ''
		},
		configSchema: {
			type: 'object',
			properties: {
				nodeType: {
					type: 'string',
					title: 'Node Type',
					description: 'Choose the visual representation for this node',
					default: 'default',
					enum: ['default', 'simple']
				},
				assignee: {
					type: 'string',
					title: 'Assignee',
					description: 'Select a team member to assign this task to',
					format: 'autocomplete',
					autocomplete: {
						url: '/api/flowdrop/autocomplete/users',
						queryParam: 'q',
						minChars: 0,
						debounceMs: 300,
						fetchOnFocus: true,
						labelField: 'label',
						valueField: 'value',
						allowFreeText: false
					}
				},
				category: {
					type: 'string',
					title: 'Category',
					description: 'Select a category for this task',
					format: 'autocomplete',
					autocomplete: {
						url: '/api/flowdrop/autocomplete/categories',
						queryParam: 'q',
						minChars: 0,
						debounceMs: 300,
						fetchOnFocus: true,
						labelField: 'label',
						valueField: 'value',
						allowFreeText: false
					}
				},
				tags: {
					type: 'string',
					title: 'Tags',
					description: 'Add tags to categorize this task (allows custom tags)',
					format: 'autocomplete',
					autocomplete: {
						url: '/api/flowdrop/autocomplete/tags',
						queryParam: 'q',
						minChars: 1,
						debounceMs: 200,
						fetchOnFocus: true,
						labelField: 'label',
						valueField: 'value',
						allowFreeText: true,
						multiple: true
					}
				},
				location: {
					type: 'string',
					title: 'Location',
					description: 'Select a location for this task',
					format: 'autocomplete',
					autocomplete: {
						url: '/api/flowdrop/autocomplete/locations',
						queryParam: 'q',
						minChars: 0,
						debounceMs: 300,
						fetchOnFocus: true,
						labelField: 'label',
						valueField: 'value',
						allowFreeText: false
					}
				},
				priority: {
					type: 'string',
					title: 'Priority',
					description: 'Task priority level',
					enum: ['low', 'medium', 'high', 'urgent'],
					default: 'medium'
				},
				notifyAssignee: {
					type: 'boolean',
					title: 'Notify Assignee',
					description: 'Send notification to the assignee when task is created',
					default: true
				},
				description: {
					type: 'string',
					title: 'Description',
					description: 'Additional task details',
					format: 'multiline',
					default: ''
				}
			},
			required: ['assignee', 'category']
		}
	},
	// User Notification Node - another autocomplete example
	{
		id: 'user_notification',
		name: 'User Notification',
		type: 'default',
		supportedTypes: ['default', 'simple'],
		description: 'Send notifications to specific users. Demonstrates user autocomplete.',
		category: 'outputs',
		icon: 'mdi:bell-ring',
		color: '#f59e0b',
		version: '1.0.0',
		tags: ['notification', 'user', 'alert', 'autocomplete'],
		inputs: [
			{
				id: 'message',
				name: 'Message',
				type: 'input',
				dataType: 'string',
				required: false,
				description: 'Notification message content'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: 'Trigger input'
			}
		],
		outputs: [
			{
				id: 'sent',
				name: 'Sent',
				type: 'output',
				dataType: 'boolean',
				required: false,
				description: 'Whether notification was sent successfully'
			},
			{
				id: 'recipient_id',
				name: 'Recipient ID',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'ID of the notification recipient'
			}
		],
		config: {
			recipient: '',
			notificationType: 'info',
			title: '',
			message: ''
		},
		configSchema: {
			type: 'object',
			properties: {
				recipient: {
					type: 'string',
					title: 'Recipient',
					description: 'Select the user to receive this notification',
					format: 'autocomplete',
					autocomplete: {
						url: '/api/flowdrop/autocomplete/users',
						queryParam: 'q',
						minChars: 0,
						debounceMs: 300,
						fetchOnFocus: true,
						labelField: 'label',
						valueField: 'value',
						allowFreeText: false
					}
				},
				notificationType: {
					type: 'string',
					title: 'Notification Type',
					description: 'Type of notification to send',
					enum: ['info', 'success', 'warning', 'error'],
					default: 'info'
				},
				title: {
					type: 'string',
					title: 'Title',
					description: 'Notification title',
					default: ''
				},
				message: {
					type: 'string',
					title: 'Message',
					description: 'Notification message body',
					format: 'multiline',
					default: ''
				}
			},
			required: ['recipient']
		}
	},
	{
		id: 'email_template_generator',
		name: 'Email Template Generator',
		type: 'default',
		supportedTypes: ['default'],
		description: 'Generate personalized email templates with dynamic variables from API',
		category: 'outputs',
		icon: 'mdi:email-edit',
		color: '#10b981',
		version: '1.0.0',
		tags: ['email', 'template', 'communication', 'api-variables'],
		inputs: [
			{
				id: 'user_data',
				name: 'User Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'User information for personalization',
				schema: {
					type: 'object',
					properties: {
						id: {
							type: 'string',
							description: 'User ID'
						},
						email: {
							type: 'string',
							description: 'User email address'
						},
						firstName: {
							type: 'string',
							description: 'First name'
						},
						lastName: {
							type: 'string',
							description: 'Last name'
						}
					}
				}
			},
			{
				id: 'order_data',
				name: 'Order Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Order information',
				schema: {
					type: 'object',
					properties: {
						orderNumber: {
							type: 'string',
							description: 'Order number'
						},
						total: {
							type: 'number',
							description: 'Order total'
						},
						items: {
							type: 'array',
							description: 'Order items',
							items: {
								type: 'object',
								properties: {
									name: {
										type: 'string',
										description: 'Product name'
									},
									quantity: {
										type: 'integer',
										description: 'Quantity'
									},
									price: {
										type: 'number',
										description: 'Price'
									}
								}
							}
						}
					}
				}
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: 'Execution trigger'
			}
		],
		outputs: [
			{
				id: 'email_html',
				name: 'Email HTML',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Generated HTML email content'
			},
			{
				id: 'email_text',
				name: 'Email Text',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Plain text version of email'
			},
			{
				id: 'subject',
				name: 'Subject',
				type: 'output',
				dataType: 'string',
				required: false,
				description: 'Email subject line'
			}
		],
		config: {
			templateType: 'order_confirmation',
			subjectTemplate: 'Order {{ order.orderNumber }} Confirmed',
			bodyTemplate: 'Hello {{ user.firstName }},\n\nYour order {{ order.orderNumber }} has been confirmed!'
		},
		configSchema: {
			type: 'object',
			properties: {
				templateType: {
					type: 'string',
					title: 'Template Type',
					description: 'Type of email template',
					enum: [
						'order_confirmation',
						'shipping_notification',
						'welcome_email',
						'password_reset',
						'custom'
					],
					default: 'order_confirmation'
				},
				subjectTemplate: {
					type: 'string',
					title: 'Email Subject',
					description: 'Subject line template with dynamic variables',
					format: 'template',
					default: 'Order {{ order.orderNumber }} Confirmed',
					placeholder: 'Enter subject template...',
					placeholderExample: 'Order {{ order.orderNumber }} Confirmed - {{ company.name }}',
					// API mode configuration - fetches variables from backend
					variables: {
						api: {
							endpoint: {
								url: '/variables/{workflowId}/{nodeId}',
								method: 'GET',
								timeout: 5000,
								cacheEnabled: true
							},
							cacheTtl: 300000,
							mergeWithSchema: false,
							mergeWithPorts: true,
							fallbackOnError: true
						}
					}
				},
				bodyTemplate: {
					type: 'string',
					title: 'Email Body',
					description: 'Email body template with dynamic variables',
					format: 'template',
					default:
						'Hello {{ user.firstName }},\n\nYour order {{ order.orderNumber }} has been confirmed!\n\nOrder Details:\n{% for item in order.items %}- {{ item.name }} x{{ item.quantity }} - ${{ item.price }}\n{% endfor %}\n\nTotal: ${{ order.total }}\n\nThank you for your purchase!\n\nBest regards,\n{{ company.name }}',
					placeholder: 'Enter email body template...',
					height: '400px',
					// Hybrid mode - API + port-derived variables
					variables: {
						ports: ['user_data', 'order_data'],
						includePortName: false,
						showHints: true,
						api: {
							endpoint: {
								url: '/variables/{workflowId}/{nodeId}',
								method: 'GET'
							},
							cacheTtl: 300000,
							mergeWithSchema: true,
							mergeWithPorts: true,
							fallbackOnError: true
						}
					}
				},
				includeUnsubscribeLink: {
					type: 'boolean',
					title: 'Include Unsubscribe Link',
					description: 'Add unsubscribe link to email footer',
					default: true
				},
				trackOpens: {
					type: 'boolean',
					title: 'Track Opens',
					description: 'Enable email open tracking',
					default: false
				}
			}
		}
	},
	{
		id: 'notification_template',
		name: 'Notification Template',
		type: 'simple',
		supportedTypes: ['simple', 'default'],
		description: 'Create notification templates with API-driven variable suggestions',
		category: 'outputs',
		icon: 'mdi:bell-ring',
		color: '#f59e0b',
		version: '1.0.0',
		tags: ['notification', 'template', 'api-variables'],
		inputs: [
			{
				id: 'event',
				name: 'Event Data',
				type: 'input',
				dataType: 'json',
				required: false,
				description: 'Event that triggered notification'
			},
			{
				id: 'trigger',
				name: 'Trigger',
				type: 'input',
				dataType: 'trigger',
				required: false,
				description: 'Execution trigger'
			}
		],
		outputs: [
			{
				id: 'notification',
				name: 'Notification',
				type: 'output',
				dataType: 'json',
				required: false,
				description: 'Formatted notification object'
			}
		],
		config: {
			title: 'New Event: {{ event.title }}',
			message: 'You have a new {{ event.type }} event'
		},
		configSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					title: 'Notification Title',
					description: 'Title template with variables',
					format: 'template',
					default: 'New Event: {{ event.title }}',
					// Pure API mode - only fetches from backend
					variables: {
						api: {
							endpoint: {
								url: '/variables/{workflowId}/{nodeId}',
								method: 'GET'
							},
							fallbackOnError: false
						}
					}
				},
				message: {
					type: 'string',
					title: 'Notification Message',
					description: 'Message body template',
					format: 'template',
					default: 'You have a new {{ event.type }} event: {{ event.description }}',
					height: '200px',
					// API with static fallback
					variables: {
						schema: {
							variables: {
								app: {
									name: 'app',
									label: 'Application',
									type: 'object',
									properties: {
										name: {
											name: 'name',
											label: 'App Name',
											type: 'string'
										},
										version: {
											name: 'version',
											label: 'Version',
											type: 'string'
										}
									}
								}
							}
						},
						api: {
							endpoint: {
								url: '/variables/{workflowId}/{nodeId}',
								method: 'GET'
							},
							mergeWithSchema: true,
							fallbackOnError: true
						}
					}
				},
				priority: {
					type: 'string',
					title: 'Priority Level',
					description: 'Notification priority',
					enum: ['low', 'normal', 'high', 'urgent'],
					default: 'normal'
				}
			}
		}
	}
];

/**
 * Total count of nodes
 */
export const mockNodesCount = mockNodes.length;

/**
 * Get a node by ID
 */
export function getNodeById(id: string): NodeMetadata | undefined {
	return mockNodes.find((node) => node.id === id);
}

/**
 * Filter nodes by category
 */
export function getNodesByCategory(category: string): NodeMetadata[] {
	if (category === 'all') {
		return mockNodes;
	}
	return mockNodes.filter((node) => node.category === category);
}

/**
 * Search nodes by name, description, or tags
 */
export function searchNodes(query: string): NodeMetadata[] {
	const lowerQuery = query.toLowerCase();
	return mockNodes.filter(
		(node) =>
			node.name.toLowerCase().includes(lowerQuery) ||
			node.description.toLowerCase().includes(lowerQuery) ||
			node.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
	);
}

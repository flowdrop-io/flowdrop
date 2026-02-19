/**
 * MSW handlers for variable suggestions API
 * Mocks backend endpoints for template variable autocomplete
 */

import { http, HttpResponse, delay } from 'msw';
import type { VariableSchema } from '../../lib/types/index.js';

/**
 * Mock variable suggestions handlers
 */
export const variableSuggestionsHandlers = [
	/**
	 * GET /api/variables/:workflowId/:nodeId
	 * Returns variable suggestions for a specific node in a workflow
	 */
	http.get('/api/flowdrop/variables/:workflowId/:nodeId', async ({ params }) => {
		const { workflowId, nodeId } = params;

		// Simulate network delay
		await delay(300);

		// Determine variables based on node ID or workflow ID
		const variableSchema: VariableSchema = getVariablesForNode(
			nodeId as string,
			workflowId as string
		);

		return HttpResponse.json({
			success: true,
			data: variableSchema
		});
	}),

	/**
	 * POST /api/variables
	 * Alternative endpoint for fetching variable suggestions
	 */
	http.post('/api/flowdrop/variables', async ({ request }) => {
		const body = (await request.json()) as { workflowId: string; nodeId: string };

		// Simulate network delay
		await delay(300);

		const variableSchema: VariableSchema = getVariablesForNode(body.nodeId, body.workflowId);

		return HttpResponse.json({
			success: true,
			data: variableSchema
		});
	})
];

/**
 * Get variable schema based on node and workflow context
 */
function getVariablesForNode(nodeId: string, workflowId: string): VariableSchema {
	// Demo: Return different variables based on context

	// Email template node
	if (nodeId.includes('email_template') || nodeId.includes('email-template')) {
		return {
			variables: {
				user: {
					name: 'user',
					label: 'User Information',
					description: 'Current user data from the system',
					type: 'object',
					properties: {
						id: {
							name: 'id',
							label: 'User ID',
							description: 'Unique user identifier',
							type: 'string'
						},
						email: {
							name: 'email',
							label: 'Email Address',
							description: 'User email address',
							type: 'string'
						},
						firstName: {
							name: 'firstName',
							label: 'First Name',
							description: 'User first name',
							type: 'string'
						},
						lastName: {
							name: 'lastName',
							label: 'Last Name',
							description: 'User last name',
							type: 'string'
						},
						preferences: {
							name: 'preferences',
							label: 'User Preferences',
							description: 'User preference settings',
							type: 'object',
							properties: {
								language: {
									name: 'language',
									label: 'Language',
									description: 'Preferred language',
									type: 'string'
								},
								timezone: {
									name: 'timezone',
									label: 'Timezone',
									description: 'User timezone',
									type: 'string'
								},
								notifications: {
									name: 'notifications',
									label: 'Notifications',
									description: 'Notification preferences',
									type: 'boolean'
								}
							}
						}
					}
				},
				order: {
					name: 'order',
					label: 'Order Details',
					description: 'Current order information',
					type: 'object',
					properties: {
						id: {
							name: 'id',
							label: 'Order ID',
							description: 'Unique order identifier',
							type: 'string'
						},
						orderNumber: {
							name: 'orderNumber',
							label: 'Order Number',
							description: 'Human-readable order number',
							type: 'string'
						},
						total: {
							name: 'total',
							label: 'Total Amount',
							description: 'Order total amount',
							type: 'number'
						},
						currency: {
							name: 'currency',
							label: 'Currency',
							description: 'Currency code (USD, EUR, etc.)',
							type: 'string'
						},
						status: {
							name: 'status',
							label: 'Order Status',
							description: 'Current order status',
							type: 'string'
						},
						items: {
							name: 'items',
							label: 'Order Items',
							description: 'List of items in the order',
							type: 'array',
							items: {
								name: 'item',
								label: 'Order Item',
								type: 'object',
								properties: {
									name: {
										name: 'name',
										label: 'Product Name',
										description: 'Name of the product',
										type: 'string'
									},
									quantity: {
										name: 'quantity',
										label: 'Quantity',
										description: 'Number of items',
										type: 'integer'
									},
									price: {
										name: 'price',
										label: 'Unit Price',
										description: 'Price per unit',
										type: 'number'
									},
									sku: {
										name: 'sku',
										label: 'SKU',
										description: 'Product SKU',
										type: 'string'
									}
								}
							}
						},
						shippingAddress: {
							name: 'shippingAddress',
							label: 'Shipping Address',
							description: 'Delivery address',
							type: 'object',
							properties: {
								street: {
									name: 'street',
									label: 'Street Address',
									type: 'string'
								},
								city: {
									name: 'city',
									label: 'City',
									type: 'string'
								},
								state: {
									name: 'state',
									label: 'State/Province',
									type: 'string'
								},
								zipCode: {
									name: 'zipCode',
									label: 'ZIP/Postal Code',
									type: 'string'
								},
								country: {
									name: 'country',
									label: 'Country',
									type: 'string'
								}
							}
						}
					}
				},
				company: {
					name: 'company',
					label: 'Company Information',
					description: 'Your company details',
					type: 'object',
					properties: {
						name: {
							name: 'name',
							label: 'Company Name',
							description: 'Legal company name',
							type: 'string'
						},
						email: {
							name: 'email',
							label: 'Support Email',
							description: 'Company support email',
							type: 'string'
						},
						phone: {
							name: 'phone',
							label: 'Support Phone',
							description: 'Company support phone',
							type: 'string'
						},
						website: {
							name: 'website',
							label: 'Website',
							description: 'Company website URL',
							type: 'string'
						}
					}
				},
				system: {
					name: 'system',
					label: 'System Variables',
					description: 'System-level variables and metadata',
					type: 'object',
					properties: {
						currentDate: {
							name: 'currentDate',
							label: 'Current Date',
							description: 'Current date (YYYY-MM-DD)',
							type: 'string'
						},
						currentTime: {
							name: 'currentTime',
							label: 'Current Time',
							description: 'Current time (HH:MM:SS)',
							type: 'string'
						},
						workflowId: {
							name: 'workflowId',
							label: 'Workflow ID',
							description: 'ID of the current workflow',
							type: 'string'
						},
						executionId: {
							name: 'executionId',
							label: 'Execution ID',
							description: 'ID of the current execution',
							type: 'string'
						}
					}
				}
			}
		};
	}

	// Notification template node
	if (nodeId.includes('notification') || nodeId.includes('notify')) {
		return {
			variables: {
				user: {
					name: 'user',
					label: 'User',
					description: 'Notification recipient',
					type: 'object',
					properties: {
						name: {
							name: 'name',
							label: 'Name',
							type: 'string'
						},
						email: {
							name: 'email',
							label: 'Email',
							type: 'string'
						}
					}
				},
				event: {
					name: 'event',
					label: 'Event Details',
					description: 'Event that triggered the notification',
					type: 'object',
					properties: {
						type: {
							name: 'type',
							label: 'Event Type',
							description: 'Type of event',
							type: 'string'
						},
						title: {
							name: 'title',
							label: 'Event Title',
							description: 'Short title',
							type: 'string'
						},
						description: {
							name: 'description',
							label: 'Description',
							description: 'Detailed description',
							type: 'string'
						},
						timestamp: {
							name: 'timestamp',
							label: 'Timestamp',
							description: 'When the event occurred',
							type: 'string'
						},
						url: {
							name: 'url',
							label: 'Action URL',
							description: 'Link to view details',
							type: 'string'
						}
					}
				}
			}
		};
	}

	// Default variables for any other node
	return {
		variables: {
			data: {
				name: 'data',
				label: 'Input Data',
				description: 'Data from previous step',
				type: 'object',
				properties: {
					value: {
						name: 'value',
						label: 'Value',
						description: 'The main data value',
						type: 'mixed'
					},
					metadata: {
						name: 'metadata',
						label: 'Metadata',
						description: 'Additional metadata',
						type: 'object',
						properties: {
							timestamp: {
								name: 'timestamp',
								label: 'Timestamp',
								type: 'string'
							},
							source: {
								name: 'source',
								label: 'Source',
								type: 'string'
							}
						}
					}
				}
			},
			env: {
				name: 'env',
				label: 'Environment Variables',
				description: 'Environment-specific configuration',
				type: 'object',
				properties: {
					apiUrl: {
						name: 'apiUrl',
						label: 'API URL',
						description: 'Base API URL',
						type: 'string'
					},
					environment: {
						name: 'environment',
						label: 'Environment',
						description: 'Current environment (dev, staging, prod)',
						type: 'string'
					}
				}
			}
		}
	};
}

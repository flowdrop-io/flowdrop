/**
 * In-memory workflow storage service
 * This can be replaced with a database implementation later
 */

import { v4 as uuidv4 } from 'uuid';
import type { Workflow } from '../types/index.js';

// In-memory storage
const workflows = new Map<string, Workflow>();

/**
 * Generate a unique workflow ID using UUID v4
 */
function generateWorkflowId(): string {
	return uuidv4();
}

/**
 * Save a workflow
 */
export async function saveWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow> {
	const id = generateWorkflowId();
	const newWorkflow: Workflow = {
		...workflow,
		id,
		metadata: {
			version: '1.0.0',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			...workflow.metadata
		}
	};

	workflows.set(id, newWorkflow);
	return newWorkflow;
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
	id: string,
	workflow: Partial<Workflow>
): Promise<Workflow | null> {
	const existing = workflows.get(id);
	if (!existing) {
		return null;
	}

	const updatedWorkflow: Workflow = {
		...existing,
		...workflow,
		id, // Ensure ID doesn't change
		metadata: {
			version: existing.metadata?.version || '1.0.0',
			createdAt: existing.metadata?.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			author: workflow.metadata?.author || existing.metadata?.author,
			tags: workflow.metadata?.tags || existing.metadata?.tags
		}
	};

	workflows.set(id, updatedWorkflow);
	return updatedWorkflow;
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(id: string): Promise<Workflow | null> {
	return workflows.get(id) || null;
}

/**
 * Get all workflows with optional filtering
 */
export async function getWorkflows(options?: {
	search?: string;
	limit?: number;
	offset?: number;
}): Promise<Workflow[]> {
	let filteredWorkflows = Array.from(workflows.values());

	// Apply search filter
	if (options?.search) {
		const searchLower = options.search.toLowerCase();
		filteredWorkflows = filteredWorkflows.filter(
			(workflow) =>
				workflow.name.toLowerCase().includes(searchLower) ||
				workflow.description?.toLowerCase().includes(searchLower) ||
				workflow.metadata?.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
		);
	}

	// Sort by updated date (newest first)
	filteredWorkflows.sort(
		(a, b) =>
			new Date(b.metadata?.updatedAt || 0).getTime() -
			new Date(a.metadata?.updatedAt || 0).getTime()
	);

	// Apply pagination
	const offset = options?.offset || 0;
	const limit = options?.limit || filteredWorkflows.length;

	return filteredWorkflows.slice(offset, offset + limit);
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<boolean> {
	return workflows.delete(id);
}

/**
 * Get workflow count
 */
export async function getWorkflowCount(): Promise<number> {
	return workflows.size;
}

/**
 * Initialize with sample workflows (for development)
 */
export async function initializeSampleWorkflows(): Promise<void> {
	// Only initialize if no workflows exist
	if (workflows.size > 0) {
		return;
	}

	// Add a sample workflow
	const sampleWorkflow: Omit<Workflow, 'id'> = {
		name: 'Sample Chat Workflow',
		description: 'A simple workflow demonstrating chat completion',
		nodes: [],
		edges: [],
		metadata: {
			version: '1.0.0',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			author: 'System',
			tags: ['sample', 'chat']
		}
	};

	await saveWorkflow(sampleWorkflow);
}

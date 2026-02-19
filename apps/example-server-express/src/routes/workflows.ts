import { Router } from 'express';
import {
	getAllWorkflows,
	getWorkflowById,
	createWorkflow,
	updateWorkflow,
	deleteWorkflow
} from '../data/workflows.js';
import type { Workflow } from '../types.js';

const router = Router();

/** GET /api/flowdrop/workflows */
router.get('/workflows', (req, res) => {
	const search = req.query.search as string | undefined;
	const tags = req.query.tags as string | undefined;
	let limit = parseInt(req.query.limit as string) || 50;
	let offset = parseInt(req.query.offset as string) || 0;
	const sort = (req.query.sort as string) || 'updated_at';
	const order = (req.query.order as string) || 'desc';

	if (isNaN(limit) || limit < 1 || limit > 100) limit = 50;
	if (isNaN(offset) || offset < 0) offset = 0;

	let workflows = getAllWorkflows();

	if (search && search.trim()) {
		const q = search.toLowerCase().slice(0, 100);
		workflows = workflows.filter(
			(w) =>
				w.name.toLowerCase().includes(q) ||
				(w.description && w.description.toLowerCase().includes(q))
		);
	}

	if (tags) {
		const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
		workflows = workflows.filter((w) =>
			w.metadata.tags?.some((tag) => tagList.includes(tag.toLowerCase()))
		);
	}

	workflows = [...workflows].sort((a, b) => {
		let valueA: string | undefined;
		let valueB: string | undefined;

		switch (sort) {
			case 'created_at':
				valueA = a.metadata.createdAt;
				valueB = b.metadata.createdAt;
				break;
			case 'name':
				valueA = a.name;
				valueB = b.name;
				break;
			case 'updated_at':
			default:
				valueA = a.metadata.updatedAt;
				valueB = b.metadata.updatedAt;
				break;
		}

		const comparison = (valueA || '').localeCompare(valueB || '');
		return order === 'desc' ? -comparison : comparison;
	});

	const totalCount = workflows.length;
	const paginated = workflows.slice(offset, offset + limit);

	res.set({
		'X-Total-Count': totalCount.toString(),
		'X-Page-Size': limit.toString(),
		'X-Page-Offset': offset.toString()
	});

	res.json({
		success: true,
		data: paginated,
		message: `Found ${paginated.length} workflows`
	});
});

/** POST /api/flowdrop/workflows */
router.post('/workflows', (req, res) => {
	const body = req.body as Record<string, unknown>;

	if (!body.name || typeof body.name !== 'string') {
		res.status(400).json({
			success: false,
			error: 'Validation failed',
			code: 'VALIDATION_ERROR',
			details: { field: 'name', message: 'Name is required' }
		});
		return;
	}

	const workflow = createWorkflow({
		name: body.name,
		description: body.description as string | undefined,
		nodes: body.nodes as Workflow['nodes'] | undefined,
		edges: body.edges as Workflow['edges'] | undefined,
		tags: body.tags as string[] | undefined
	});

	res.status(201).json({
		success: true,
		data: workflow,
		message: 'Workflow created successfully'
	});
});

/** GET /api/flowdrop/workflows/:id */
router.get('/workflows/:id', (req, res) => {
	const id = req.params.id;

	if (!id || id.trim() === '') {
		res.status(400).json({
			success: false,
			error: 'Workflow ID is required',
			code: 'BAD_REQUEST'
		});
		return;
	}

	const workflow = getWorkflowById(id);

	if (!workflow) {
		res.status(404).json({
			success: false,
			error: 'Workflow not found',
			code: 'NOT_FOUND'
		});
		return;
	}

	res.json({
		success: true,
		data: workflow,
		message: `Workflow "${workflow.name}" retrieved successfully`
	});
});

/** PUT /api/flowdrop/workflows/:id */
router.put('/workflows/:id', (req, res) => {
	const id = req.params.id;

	if (!id || id.trim() === '') {
		res.status(400).json({
			success: false,
			error: 'Workflow ID is required',
			code: 'BAD_REQUEST'
		});
		return;
	}

	const body = req.body as Record<string, unknown>;

	const updated = updateWorkflow(id, {
		name: body.name as string | undefined,
		description: body.description as string | undefined,
		nodes: body.nodes as Workflow['nodes'] | undefined,
		edges: body.edges as Workflow['edges'] | undefined,
		metadata: body.metadata as Partial<Workflow['metadata']> | undefined
	});

	if (!updated) {
		res.status(404).json({
			success: false,
			error: 'Workflow not found',
			code: 'NOT_FOUND'
		});
		return;
	}

	res.json({
		success: true,
		data: updated,
		message: 'Workflow updated successfully'
	});
});

/** DELETE /api/flowdrop/workflows/:id */
router.delete('/workflows/:id', (req, res) => {
	const id = req.params.id;

	if (!id || id.trim() === '') {
		res.status(400).json({
			success: false,
			error: 'Workflow ID is required',
			code: 'BAD_REQUEST'
		});
		return;
	}

	const deleted = deleteWorkflow(id);

	if (!deleted) {
		res.status(404).json({
			success: false,
			error: 'Workflow not found',
			code: 'NOT_FOUND'
		});
		return;
	}

	res.json({
		success: true,
		message: 'Workflow deleted successfully'
	});
});

export default router;

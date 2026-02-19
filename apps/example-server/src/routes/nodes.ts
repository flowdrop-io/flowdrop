import { Router } from 'express';
import { nodes, getNodeById } from '../data/nodes.js';
import type { NodeMetadata } from '../types.js';

const router = Router();

/** GET /api/flowdrop/nodes */
router.get('/nodes', (req, res) => {
	const category = req.query.category as string | undefined;
	const search = req.query.search as string | undefined;
	let limit = parseInt(req.query.limit as string) || 100;
	let offset = parseInt(req.query.offset as string) || 0;

	if (isNaN(limit) || limit < 1 || limit > 1000) limit = 100;
	if (isNaN(offset) || offset < 0) offset = 0;

	let filtered: NodeMetadata[] = [...nodes];

	if (category) {
		filtered = filtered.filter((node) => node.category === category);
	}

	if (search && search.trim()) {
		const q = search.toLowerCase().slice(0, 100);
		filtered = filtered.filter(
			(node) =>
				node.name.toLowerCase().includes(q) ||
				node.description.toLowerCase().includes(q) ||
				node.tags?.some((tag) => tag.toLowerCase().includes(q))
		);
	}

	const totalCount = filtered.length;
	const paginated = filtered.slice(offset, offset + limit);

	res.set({
		'X-Total-Count': totalCount.toString(),
		'X-Page-Size': limit.toString(),
		'X-Page-Offset': offset.toString()
	});

	res.json({
		success: true,
		data: paginated,
		message: `Found ${paginated.length} node types`
	});
});

/** GET /api/flowdrop/nodes/:id */
router.get('/nodes/:id', (req, res) => {
	const node = getNodeById(req.params.id);

	if (!node) {
		res.status(404).json({
			success: false,
			error: 'Node type not found',
			code: 'NOT_FOUND'
		});
		return;
	}

	res.json({
		success: true,
		data: node,
		message: `Node type "${node.name}" retrieved successfully`
	});
});

export default router;

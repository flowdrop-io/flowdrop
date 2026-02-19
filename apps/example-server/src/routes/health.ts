import { Router } from 'express';

const router = Router();
const startTime = Date.now();

/** GET /api/flowdrop/health */
router.get('/health', (_req, res) => {
	res.json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		version: '1.0.0',
		service: 'FlowDrop Example Server',
		uptime: Math.floor((Date.now() - startTime) / 1000)
	});
});

/** GET /api/flowdrop/system/config */
router.get('/system/config', (_req, res) => {
	res.json({
		apiBaseUrl: '/api/flowdrop',
		theme: 'auto',
		timeout: 30000,
		authType: 'none',
		version: '1.0.0',
		environment: 'development'
	});
});

export default router;

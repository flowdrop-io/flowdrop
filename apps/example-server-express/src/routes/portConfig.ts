import { Router } from 'express';
import { portConfig } from '../data/portConfig.js';

const router = Router();

/** GET /api/flowdrop/port-config */
router.get('/port-config', (_req, res) => {
  res.json({
    success: true,
    data: portConfig,
    message: 'Port configuration loaded successfully'
  });
});

export default router;

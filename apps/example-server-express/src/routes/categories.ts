import { Router } from 'express';
import { categories } from '../data/categories.js';

const router = Router();

/** GET /api/flowdrop/categories */
router.get('/categories', (_req, res) => {
  res.json({
    success: true,
    data: categories,
    message: 'Categories loaded successfully'
  });
});

export default router;

import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import nodeRoutes from './routes/nodes.js';
import workflowRoutes from './routes/workflows.js';
import categoryRoutes from './routes/categories.js';
import portConfigRoutes from './routes/portConfig.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const API_BASE = '/api/flowdrop';

app.use(cors());
app.use(express.json());

app.use(API_BASE, healthRoutes);
app.use(API_BASE, nodeRoutes);
app.use(API_BASE, workflowRoutes);
app.use(API_BASE, categoryRoutes);
app.use(API_BASE, portConfigRoutes);

app.listen(PORT, () => {
	console.log(`FlowDrop Example Server running at http://localhost:${PORT}`);
	console.log(`API base: http://localhost:${PORT}${API_BASE}`);
});

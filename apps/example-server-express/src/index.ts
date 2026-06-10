import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import nodeRoutes from './routes/nodes.js';
import workflowRoutes from './routes/workflows.js';
import categoryRoutes from './routes/categories.js';
import portConfigRoutes from './routes/portConfig.js';
import { renderLandingPage, type EndpointInfo } from './landing.js';

const app = express();
const PORT = parseInt(process.env.PORT || '7104', 10);
const API_BASE = '/api/flowdrop';

/** The full surface of this example server — drives the landing page and startup log. */
const endpoints: EndpointInfo[] = [
  { method: 'GET', path: `${API_BASE}/health`, description: 'Server health & uptime' },
  { method: 'GET', path: `${API_BASE}/system/config`, description: 'Client bootstrap config' },
  {
    method: 'GET',
    path: `${API_BASE}/nodes`,
    description: 'List node types (?category, ?search, ?limit, ?offset)'
  },
  { method: 'GET', path: `${API_BASE}/nodes/:id`, description: 'Get a single node type' },
  {
    method: 'GET',
    path: `${API_BASE}/workflows`,
    description: 'List workflows (?search, ?tags, ?sort, ?order)'
  },
  { method: 'POST', path: `${API_BASE}/workflows`, description: 'Create a workflow' },
  { method: 'GET', path: `${API_BASE}/workflows/:id`, description: 'Get a workflow' },
  { method: 'PUT', path: `${API_BASE}/workflows/:id`, description: 'Update a workflow' },
  { method: 'DELETE', path: `${API_BASE}/workflows/:id`, description: 'Delete a workflow' },
  { method: 'GET', path: `${API_BASE}/categories`, description: 'List node categories' },
  {
    method: 'GET',
    path: `${API_BASE}/port-config`,
    description: 'Port data types & compatibility rules'
  }
];

app.use(cors());
app.use(express.json());

// Browsable landing page so visiting the root in a browser shows what's available.
app.get('/', (_req, res) => {
  res.type('html').send(renderLandingPage({ port: PORT, apiBase: API_BASE, endpoints }));
});

app.use(API_BASE, healthRoutes);
app.use(API_BASE, nodeRoutes);
app.use(API_BASE, workflowRoutes);
app.use(API_BASE, categoryRoutes);
app.use(API_BASE, portConfigRoutes);

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  const line = '─'.repeat(58);

  console.log('');
  console.log('  🚀 FlowDrop Example Server (Express)');
  console.log(`  ${line}`);
  console.log(`  ▸ Server     ${url}`);
  console.log(`  ▸ API base   ${url}${API_BASE}`);
  console.log(`  ${line}`);
  console.log('  Available endpoints:');
  for (const e of endpoints) {
    console.log(`    ${e.method.padEnd(6)} ${url}${e.path}`);
  }
  console.log(`  ${line}`);
  console.log(`  Open ${url} in your browser to explore the API. ↑`);
  console.log('');
});

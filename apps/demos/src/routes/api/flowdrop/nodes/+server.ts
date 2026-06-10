import { json } from '@sveltejs/kit';
import { nodes } from '$lib/sample-data/index.js';

// Prerendered to a static file at /api/flowdrop/nodes. The seed module is the
// single source of truth; this just wraps it in FlowDrop's API envelope.
export const prerender = true;

export function GET() {
  return json({ success: true, data: nodes });
}

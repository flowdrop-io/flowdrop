import { json } from '@sveltejs/kit';
import { workflows } from '$lib/sample-data/index.js';

export const prerender = true;

// Collection only. A static filesystem can't serve both /workflows (a file) and
// /workflows/<id> (a directory), so there's no get-by-id endpoint — the demos
// load a workflow from this list. The editor never calls get-by-id here (no
// save path), and if it did it would 404 and fall through onApiError.
export function GET() {
  return json({ success: true, data: workflows });
}

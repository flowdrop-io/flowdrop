import { json } from '@sveltejs/kit';
import { portConfig } from '$lib/sample-data/index.js';

export const prerender = true;

export function GET() {
  return json({ success: true, data: portConfig });
}

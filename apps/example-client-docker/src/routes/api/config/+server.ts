import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/config
 * Returns runtime configuration read from environment variables.
 * Used by the Docker healthcheck and client-side config fetching.
 */
export const GET: RequestHandler = async () => {
  return json({
    apiBaseUrl: process.env.FLOWDROP_API_BASE_URL || process.env.API_BASE_URL || '/api/flowdrop',
    theme: process.env.FLOWDROP_THEME || 'auto',
    timeout: process.env.FLOWDROP_TIMEOUT ? parseInt(process.env.FLOWDROP_TIMEOUT, 10) : 30000,
    authType: process.env.FLOWDROP_AUTH_TYPE || 'none',
    version: process.env.FLOWDROP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    agentSpecBaseUrl: process.env.FLOWDROP_AGENTSPEC_BASE_URL || undefined
  });
};

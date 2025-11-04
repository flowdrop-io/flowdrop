import type { Handle } from '@sveltejs/kit';

/**
 * Server-side hook to add security headers and validate API requests
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { url } = event;

	// Add security headers for all responses
	const response = await resolve(event);

	// Additional security headers for all responses
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// API-specific security measures
	if (url.pathname.startsWith('/api/')) {
		// Ensure API routes are not cached by browsers
		response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');

		// Add API-specific security headers
		response.headers.set('X-API-Version', '1.0.0');

		// Log API requests for monitoring (in production, use proper logging)
		console.log(
			`API Request: ${event.request.method} ${url.pathname} - ${new Date().toISOString()}`
		);
	}

	return response;
};

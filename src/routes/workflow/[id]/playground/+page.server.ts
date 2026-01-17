import type { PageServerLoad } from './$types';

/**
 * Server-side page load function for Playground
 *
 * Ensures runtime configuration is available before the page loads.
 */
export const load: PageServerLoad = async ({ parent }) => {
	// Get runtime config from parent layout
	const { runtimeConfig } = await parent();

	return {
		runtimeConfig
	};
};

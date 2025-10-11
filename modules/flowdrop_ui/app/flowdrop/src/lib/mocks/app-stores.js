/**
 * Mock for $app/stores
 * Provides minimal implementations for SvelteKit stores in library context
 */

import { writable } from 'svelte/store';

// Mock page store
export const page = writable({
	url: new URL('http://localhost:3000'),
	params: {},
	route: { id: null },
	status: 200,
	error: null,
	data: {},
	form: null
});

// Mock navigating store
export const navigating = writable(null);

// Mock updated store
export const updated = writable(false);

// Mock preloadData function
export const preloadData = async () => ({});

/**
 * Mock for $app/environment
 * Provides minimal implementations for SvelteKit environment in library context
 */

// Mock browser check
export const browser = typeof window !== 'undefined';

// Mock dev check
export const dev = false;

// Mock building check
export const building = false;

// Mock version
export const version = '1.0.0';

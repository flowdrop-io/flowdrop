import { defineConfig, devices } from "@playwright/test";

/**
 * Modern Playwright configuration for E2E tests
 * 
 * Focus: Real user workflows and critical paths
 */
export default defineConfig({
	// Test directory
	testDir: "./tests/e2e",
	
	// Parallel execution
	fullyParallel: true,
	
	// Fail build on CI if tests were accidentally left in focused mode
	forbidOnly: !!process.env.CI,
	
	// Retry on CI only
	retries: process.env.CI ? 2 : 0,
	
	// Parallel workers
	workers: process.env.CI ? 1 : undefined,
	
	// Reporter configuration
	reporter: [
		["html"],
		["list"],
		...(process.env.CI ? [["github" as const]] : [])
	],
	
	// Shared settings for all tests
	use: {
		// Base URL for navigation
		baseURL: "http://localhost:4173",
		
		// Collect trace on failure
		trace: "on-first-retry",
		
		// Screenshot on failure
		screenshot: "only-on-failure",
		
		// Video on failure
		video: "retain-on-failure"
	},
	
	// Projects for different browsers
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] }
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] }
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] }
		},
		// Mobile viewports
		{
			name: "Mobile Chrome",
			use: { ...devices["Pixel 5"] }
		}
	],
	
	// Web server configuration
	webServer: {
		command: "npm run build && npm run preview",
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120000
	}
});

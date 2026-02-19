<!--
  Playground Page
  
  Standalone page for testing workflows interactively.
  Fetches workflow data and renders the Playground component.
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import Playground from '$lib/components/playground/Playground.svelte';
	import { createEndpointConfig, type EndpointConfig } from '$lib/config/endpoints.js';
	import { setEndpointConfig } from '$lib/services/api.js';
	import type { Workflow } from '$lib/types/index.js';
	import type { PlaygroundConfig } from '$lib/types/playground.js';

	let { data } = $props();

	/** API endpoint configuration */
	let endpointConfig = $state<EndpointConfig>(
		createEndpointConfig(data.runtimeConfig.apiBaseUrl, {
			auth: { type: data.runtimeConfig.authType, token: data.runtimeConfig.authToken },
			timeout: data.runtimeConfig.timeout
		})
	);

	/** Workflow ID from URL params (captured once at init to avoid re-renders) */
	const pageData = get(page);
	const workflowId: string = pageData.params.id;

	/** Session ID from URL query params (captured once at init) */
	const sessionId: string | undefined = pageData.url.searchParams.get('session') ?? undefined;

	/**
	 * Parse boolean query parameter
	 * Returns undefined if not present, allowing defaults to apply
	 */
	function parseBoolParam(value: string | null): boolean | undefined {
		if (value === null) return undefined;
		return value === 'true' || value === '1';
	}

	/**
	 * Playground configuration from URL query params (for testing)
	 *
	 * Supported params:
	 * - showChatInput: "true" | "false" - Show/hide chat text input
	 * - showRunButton: "true" | "false" - Show/hide Run button
	 * - predefinedMessage: string - Message sent when Run is clicked
	 * - autoRun: "true" | "false" - Auto-execute workflow on load
	 *
	 * Example URLs:
	 * - /workflow/demo/playground?showChatInput=false (Run button only)
	 * - /workflow/demo/playground?showChatInput=false&showRunButton=false (View-only)
	 * - /workflow/demo/playground?showChatInput=false&predefinedMessage=Execute%20pipeline
	 * - /workflow/demo/playground?showChatInput=false&autoRun=true (Auto-execute on load)
	 */
	const playgroundConfig: PlaygroundConfig = {
		showChatInput: parseBoolParam(pageData.url.searchParams.get('showChatInput')),
		showRunButton: parseBoolParam(pageData.url.searchParams.get('showRunButton')),
		predefinedMessage: pageData.url.searchParams.get('predefinedMessage') ?? undefined,
		autoRun: parseBoolParam(pageData.url.searchParams.get('autoRun'))
	};

	/** Workflow data */
	let workflow = $state<Workflow | null>(null);

	/** Loading state */
	let loading = $state(true);

	/** Error state */
	let error = $state<string | null>(null);

	/**
	 * Initialize API configuration
	 */
	onMount(() => {
		setEndpointConfig(endpointConfig);
		loadWorkflow();
	});

	/**
	 * Load workflow data with timeout protection
	 */
	async function loadWorkflow(): Promise<void> {
		if (!workflowId) {
			error = 'Missing workflow ID';
			loading = false;
			return;
		}

		try {
			loading = true;
			error = null;

			// Build the API URL
			const apiUrl = `${endpointConfig.baseUrl}/workflows/${encodeURIComponent(workflowId)}`;
			console.log('[Playground] Fetching workflow from:', apiUrl);

			// Create an AbortController for timeout handling
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
				console.warn('[Playground] Fetch timeout - aborting request');
			}, 10000); // 10 second timeout

			try {
				const response = await fetch(apiUrl, {
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const result = await response.json();
				console.log('[Playground] Workflow loaded:', result);

				// Extract workflow data from response
				workflow = result.success && result.data ? result.data : result;

				if (!workflow) {
					throw new Error('No workflow data in response');
				}
			} catch (fetchErr) {
				clearTimeout(timeoutId);
				throw fetchErr;
			}
		} catch (err) {
			console.error('[Playground] Failed to load workflow:', err);

			// Handle specific error types
			if (err instanceof Error) {
				if (err.name === 'AbortError') {
					error = 'Request timed out. Please check your connection and try again.';
				} else {
					error = err.message;
				}
			} else {
				error = 'Failed to load workflow';
			}
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Playground - {workflow?.name ?? 'Workflow'} - FlowDrop</title>
</svelte:head>

<div class="playground-page">
	<!-- Content -->
	<main class="playground-page__content">
		{#if loading}
			<div class="playground-page__loading">
				<Icon icon="mdi:loading" class="playground-page__loading-icon" />
				<p>Loading workflow...</p>
			</div>
		{:else if error}
			<div class="playground-page__error">
				<Icon icon="mdi:alert-circle" class="playground-page__error-icon" />
				<h2 class="playground-page__error-title">Failed to load workflow</h2>
				<p class="playground-page__error-text">{error}</p>
				<button type="button" class="playground-page__retry-btn" onclick={loadWorkflow}>
					<Icon icon="mdi:refresh" />
					Retry
				</button>
			</div>
		{:else if workflow}
			<Playground
				{workflowId}
				{workflow}
				{endpointConfig}
				mode="standalone"
				initialSessionId={sessionId}
				config={playgroundConfig}
			/>
		{:else}
			<div class="playground-page__empty">
				<Icon icon="mdi:file-question" class="playground-page__empty-icon" />
				<h2 class="playground-page__empty-title">Workflow not found</h2>
				<p class="playground-page__empty-text">
					The workflow you're looking for doesn't exist or has been deleted.
				</p>
				<a href="/" class="playground-page__home-link">
					<Icon icon="mdi:home" />
					Go to Home
				</a>
			</div>
		{/if}
	</main>
</div>

<style>
	.playground-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		overflow: hidden; /* Prevent page-level scrolling - let chat panel handle it */
		background-color: #f8fafc;
	}

	/* Content - fills the available space without scrolling */
	.playground-page__content {
		flex: 1;
		min-height: 0;
		overflow: hidden; /* Prevent content area scrolling - ChatPanel handles its own scroll */
		display: flex;
		flex-direction: column;
	}

	/* Loading */
	.playground-page__loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #64748b;
	}

	:global(.playground-page__loading-icon) {
		font-size: 3rem;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Error */
	.playground-page__error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 2rem;
		text-align: center;
	}

	:global(.playground-page__error-icon) {
		font-size: 4rem;
		color: #ef4444;
		margin-bottom: 1rem;
	}

	.playground-page__error-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.5rem 0;
	}

	.playground-page__error-text {
		font-size: 1rem;
		color: #64748b;
		margin: 0 0 1.5rem 0;
		max-width: 400px;
	}

	.playground-page__retry-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.5rem;
		background-color: #3b82f6;
		color: #ffffff;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;
	}

	.playground-page__retry-btn:hover {
		background-color: #2563eb;
	}

	/* Empty */
	.playground-page__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 2rem;
		text-align: center;
	}

	:global(.playground-page__empty-icon) {
		font-size: 4rem;
		color: #cbd5e1;
		margin-bottom: 1rem;
	}

	.playground-page__empty-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.5rem 0;
	}

	.playground-page__empty-text {
		font-size: 1rem;
		color: #64748b;
		margin: 0 0 1.5rem 0;
		max-width: 400px;
	}

	.playground-page__home-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		background: #ffffff;
		color: #475569;
		font-size: 1rem;
		text-decoration: none;
		transition: all 0.2s ease-in-out;
	}

	.playground-page__home-link:hover {
		background-color: #f8fafc;
		border-color: #cbd5e1;
		color: #1e293b;
	}
</style>

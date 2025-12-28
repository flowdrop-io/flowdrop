<script lang="ts">
	/**
	 * API Documentation Page
	 * Interactive documentation for the FlowDrop Mock API
	 * Allows testing endpoints directly in the browser
	 */
	import { onMount } from "svelte";
	import type { Workflow, NodeMetadata, PortConfig } from "$lib/types/index.js";

	/** API base URL for all endpoints */
	const API_BASE = "/api/flowdrop";

	/** Current response data */
	let responseData = $state<string>("");
	let responseStatus = $state<number>(0);
	let isLoading = $state<boolean>(false);

	/** Selected endpoint for testing */
	let selectedEndpoint = $state<string>("health");

	/** Form inputs for different endpoints */
	let nodeCategory = $state<string>("");
	let nodeSearch = $state<string>("");
	let nodeId = $state<string>("sample-openai");
	let workflowId = $state<string>("550e8400-e29b-41d4-a716-446655440001");
	let pipelineId = $state<string>("pipeline-001");

	/** MSW status */
	let mswEnabled = $state<boolean>(false);

	/** API Endpoint definitions */
	const endpoints = [
		{ id: "health", name: "Health Check", method: "GET", path: "/health" },
		{ id: "port-config", name: "Port Configuration", method: "GET", path: "/port-config" },
		{ id: "nodes", name: "List Node Types", method: "GET", path: "/nodes" },
		{ id: "node-by-id", name: "Get Node by ID", method: "GET", path: "/nodes/:id" },
		{ id: "workflows", name: "List Workflows", method: "GET", path: "/workflows" },
		{ id: "workflow-by-id", name: "Get Workflow by ID", method: "GET", path: "/workflows/:id" },
		{ id: "pipeline", name: "Get Pipeline Status", method: "GET", path: "/pipeline/:id" },
		{ id: "pipeline-logs", name: "Get Pipeline Logs", method: "GET", path: "/pipeline/:id/logs" }
	];

	/**
	 * Start the MSW mock server
	 */
	async function enableMockServer() {
		try {
			const { startMockServer } = await import("../../mocks/index.js");
			await startMockServer({
				onUnhandledRequest: "bypass",
				quiet: false
			});
			mswEnabled = true;
			console.log("🔶 Mock API server started");
		} catch (error) {
			console.error("Failed to start mock server:", error);
		}
	}

	/**
	 * Make an API request based on the selected endpoint
	 */
	async function makeRequest() {
		isLoading = true;
		responseData = "";
		responseStatus = 0;

		let url = API_BASE;
		const options: RequestInit = {
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			}
		};

		switch (selectedEndpoint) {
			case "health":
				url += "/health";
				break;
			case "port-config":
				url += "/port-config";
				break;
			case "nodes":
				url += "/nodes";
				if (nodeCategory) url += `?category=${encodeURIComponent(nodeCategory)}`;
				if (nodeSearch) url += `${nodeCategory ? "&" : "?"}search=${encodeURIComponent(nodeSearch)}`;
				break;
			case "node-by-id":
				url += `/nodes/${encodeURIComponent(nodeId)}`;
				break;
			case "workflows":
				url += "/workflows";
				break;
			case "workflow-by-id":
				url += `/workflows/${encodeURIComponent(workflowId)}`;
				break;
			case "pipeline":
				url += `/pipeline/${encodeURIComponent(pipelineId)}`;
				break;
			case "pipeline-logs":
				url += `/pipeline/${encodeURIComponent(pipelineId)}/logs`;
				break;
			default:
				url += "/health";
		}

		try {
			const response = await fetch(url, options);
			responseStatus = response.status;
			const data = await response.json();
			responseData = JSON.stringify(data, null, 2);
		} catch (error) {
			responseData = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
			responseStatus = 0;
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Get the current endpoint URL for display
	 */
	function getCurrentUrl(): string {
		let url = API_BASE;
		switch (selectedEndpoint) {
			case "health":
				return `${url}/health`;
			case "port-config":
				return `${url}/port-config`;
			case "nodes":
				url += "/nodes";
				if (nodeCategory) url += `?category=${nodeCategory}`;
				if (nodeSearch) url += `${nodeCategory ? "&" : "?"}search=${nodeSearch}`;
				return url;
			case "node-by-id":
				return `${url}/nodes/${nodeId}`;
			case "workflows":
				return `${url}/workflows`;
			case "workflow-by-id":
				return `${url}/workflows/${workflowId}`;
			case "pipeline":
				return `${url}/pipeline/${pipelineId}`;
			case "pipeline-logs":
				return `${url}/pipeline/${pipelineId}/logs`;
			default:
				return `${url}/health`;
		}
	}

	onMount(() => {
		// Auto-enable mock server on mount for demo purposes
		enableMockServer();
	});
</script>

<svelte:head>
	<title>FlowDrop API Documentation</title>
	<meta name="description" content="Interactive API documentation for FlowDrop workflow editor" />
</svelte:head>

<div class="api-docs">
	<header class="header">
		<div class="header-content">
			<h1>🔧 FlowDrop API Documentation</h1>
			<p class="subtitle">Interactive Mock API Reference</p>
		</div>
		<div class="msw-status" class:enabled={mswEnabled}>
			{#if mswEnabled}
				<span class="status-dot"></span>
				Mock Server Active
			{:else}
				<button onclick={enableMockServer} class="enable-btn">Enable Mock Server</button>
			{/if}
		</div>
	</header>

	<main class="main-content">
		<aside class="sidebar">
			<h2>Endpoints</h2>
			<nav class="endpoint-list">
				{#each endpoints as endpoint}
					<button
						class="endpoint-btn"
						class:active={selectedEndpoint === endpoint.id}
						onclick={() => (selectedEndpoint = endpoint.id)}
					>
						<span class="method method-{endpoint.method.toLowerCase()}">{endpoint.method}</span>
						<span class="endpoint-name">{endpoint.name}</span>
					</button>
				{/each}
			</nav>

			<div class="info-section">
				<h3>About MSW</h3>
				<p>
					This page uses <a href="https://mswjs.io" target="_blank" rel="noopener">MSW</a> (Mock Service Worker)
					to provide a fully functional mock API. All responses are generated in the browser.
				</p>
			</div>
		</aside>

		<section class="content">
			<div class="request-panel">
				<h2>Request</h2>
				
				<div class="url-display">
					<span class="method-badge">GET</span>
					<code>{getCurrentUrl()}</code>
				</div>

				{#if selectedEndpoint === "nodes"}
					<div class="form-group">
						<label for="category">Category Filter</label>
						<select id="category" bind:value={nodeCategory}>
							<option value="">All Categories</option>
							<option value="ai">AI</option>
							<option value="models">Models</option>
							<option value="inputs">Inputs</option>
							<option value="outputs">Outputs</option>
							<option value="processing">Processing</option>
							<option value="tools">Tools</option>
							<option value="agents">Agents</option>
						</select>
					</div>
					<div class="form-group">
						<label for="search">Search</label>
						<input id="search" type="text" bind:value={nodeSearch} placeholder="Search nodes..." />
					</div>
				{/if}

				{#if selectedEndpoint === "node-by-id"}
					<div class="form-group">
						<label for="nodeId">Node ID</label>
						<input id="nodeId" type="text" bind:value={nodeId} placeholder="e.g., sample-openai" />
					</div>
				{/if}

				{#if selectedEndpoint === "workflow-by-id"}
					<div class="form-group">
						<label for="workflowId">Workflow ID (UUID)</label>
						<input id="workflowId" type="text" bind:value={workflowId} placeholder="UUID" />
					</div>
				{/if}

				{#if selectedEndpoint === "pipeline" || selectedEndpoint === "pipeline-logs"}
					<div class="form-group">
						<label for="pipelineId">Pipeline ID</label>
						<select id="pipelineId" bind:value={pipelineId}>
							<option value="pipeline-001">pipeline-001 (Completed)</option>
							<option value="pipeline-002">pipeline-002 (Running)</option>
							<option value="pipeline-003">pipeline-003 (Failed)</option>
							<option value="pipeline-004">pipeline-004 (Pending)</option>
						</select>
					</div>
				{/if}

				<button class="send-btn" onclick={makeRequest} disabled={isLoading || !mswEnabled}>
					{#if isLoading}
						<span class="spinner"></span>
						Sending...
					{:else}
						Send Request
					{/if}
				</button>
			</div>

			<div class="response-panel">
				<h2>
					Response
					{#if responseStatus > 0}
						<span class="status-code" class:success={responseStatus < 400} class:error={responseStatus >= 400}>
							{responseStatus}
						</span>
					{/if}
				</h2>
				<pre class="response-body">{responseData || "Click 'Send Request' to see the response"}</pre>
			</div>
		</section>
	</main>

	<footer class="footer">
		<p>
			FlowDrop API v1.0.0 | 
			<a href="/api/openapi.yaml" target="_blank">OpenAPI Spec</a> |
			<a href="https://github.com/d34dman/flowdrop" target="_blank" rel="noopener">GitHub</a>
		</p>
	</footer>
</div>

<style>
	.api-docs {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		color: #e4e4e7;
		font-family: "JetBrains Mono", "Fira Code", monospace;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		background: rgba(0, 0, 0, 0.3);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		background: linear-gradient(90deg, #10b981, #3b82f6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		margin: 0.25rem 0 0 0;
		color: #71717a;
		font-size: 0.875rem;
	}

	.msw-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
		font-size: 0.875rem;
	}

	.msw-status.enabled {
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #10b981;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.enable-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-family: inherit;
	}

	.enable-btn:hover {
		background: #2563eb;
	}

	.main-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.sidebar {
		width: 280px;
		background: rgba(0, 0, 0, 0.2);
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		padding: 1.5rem;
		overflow-y: auto;
	}

	.sidebar h2 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.endpoint-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.endpoint-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #a1a1aa;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s;
		font-family: inherit;
	}

	.endpoint-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.endpoint-btn.active {
		background: rgba(59, 130, 246, 0.2);
		border-color: #3b82f6;
		color: white;
	}

	.method {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.method-get {
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
	}

	.endpoint-name {
		font-size: 0.875rem;
	}

	.info-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.info-section h3 {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0 0 0.75rem 0;
	}

	.info-section p {
		font-size: 0.8125rem;
		color: #a1a1aa;
		line-height: 1.6;
	}

	.info-section a {
		color: #3b82f6;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		gap: 1.5rem;
		overflow-y: auto;
	}

	.request-panel, .response-panel {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.5rem;
	}

	.request-panel h2, .response-panel h2 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.url-display {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		margin-bottom: 1rem;
		overflow-x: auto;
	}

	.method-badge {
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.url-display code {
		font-family: inherit;
		color: #a1a1aa;
		font-size: 0.875rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: #71717a;
	}

	.form-group input, .form-group select {
		width: 100%;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #e4e4e7;
		font-family: inherit;
		font-size: 0.875rem;
	}

	.form-group input:focus, .form-group select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.send-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.875rem;
		background: linear-gradient(90deg, #3b82f6, #8b5cf6);
		border: none;
		border-radius: 8px;
		color: white;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.send-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.response-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.status-code {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.status-code.success {
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
	}

	.status-code.error {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
	}

	.response-body {
		flex: 1;
		margin: 0;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.8125rem;
		line-height: 1.6;
		overflow: auto;
		color: #a1a1aa;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.footer {
		padding: 1rem 2rem;
		background: rgba(0, 0, 0, 0.3);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		text-align: center;
	}

	.footer p {
		margin: 0;
		font-size: 0.8125rem;
		color: #71717a;
	}

	.footer a {
		color: #3b82f6;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.main-content {
			flex-direction: column;
		}

		.sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		}

		.endpoint-list {
			flex-direction: row;
			flex-wrap: wrap;
		}

		.endpoint-btn {
			flex: 1;
			min-width: 140px;
		}
	}
</style>


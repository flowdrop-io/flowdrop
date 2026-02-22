<script lang="ts">
	import { App } from '@d34dman/flowdrop';
	import { createEndpointConfig, createAgentSpecEndpointConfig } from '@d34dman/flowdrop/core';
	import '@d34dman/flowdrop/styles/base.css';
	import { page } from '$app/stores';

	let { data } = $props();
	const { runtimeConfig } = data;

	const endpointConfig = $derived.by(() => {
		const useAgentSpec = $page.url.searchParams.has('agentspec');
		return createEndpointConfig(runtimeConfig.apiBaseUrl, {
			auth: {
				type: runtimeConfig.authType,
				token: runtimeConfig.authToken
			},
			timeout: runtimeConfig.timeout,
			agentSpec: useAgentSpec && runtimeConfig.agentSpecBaseUrl
				? createAgentSpecEndpointConfig(runtimeConfig.agentSpecBaseUrl)
				: undefined
		});
	});
</script>

<div class="editor-container">
	<App {endpointConfig} showNavbar={true} />
</div>

<style>
	.editor-container {
		width: 100vw;
		height: 100vh;
	}
</style>

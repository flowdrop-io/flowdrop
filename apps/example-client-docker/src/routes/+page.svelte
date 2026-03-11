<script lang="ts">
	import { App } from '@flowdrop/flowdrop';
	import { createEndpointConfig, createAgentSpecEndpointConfig } from '@flowdrop/flowdrop/core';
	import '@flowdrop/flowdrop/styles/base.css';
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
	<App {endpointConfig} showNavbar={true} theme="minimal" />
</div>

<style>
	.editor-container {
		width: 100vw;
		height: 100vh;
	}
</style>

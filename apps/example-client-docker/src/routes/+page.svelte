<script lang="ts">
	import { WorkflowEditor } from '@d34dman/flowdrop';
	import { createEndpointConfig } from '@d34dman/flowdrop/core';
	import '@d34dman/flowdrop/styles/base.css';

	let { data } = $props();
	const { runtimeConfig } = data;

	const endpointConfig = createEndpointConfig(runtimeConfig.apiBaseUrl, {
		auth: {
			type: runtimeConfig.authType,
			token: runtimeConfig.authToken
		},
		timeout: runtimeConfig.timeout
	});
</script>

<div class="editor-container">
	<WorkflowEditor {endpointConfig} />
</div>

<style>
	.editor-container {
		width: 100vw;
		height: 100vh;
	}
</style>

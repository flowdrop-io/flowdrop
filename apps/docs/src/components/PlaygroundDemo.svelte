<script lang="ts">
	interface Props {
		height?: string;
	}

	let {
		height = '70vh'
	}: Props = $props();
</script>

<div class="fd-demo-inline" style:height={height}>
	<iframe
		src="/playground-demo/"
		class="fd-demo-iframe"
		title="FlowDrop Playground Demo"
		allow="clipboard-write"
	></iframe>
</div>

<script lang="ts">
	interface Props {
		readOnly?: boolean;
		showNavbar?: boolean;
		height?: string;
	}

	let {
		readOnly = false,
		showNavbar = false,
		height = '70vh'
	}: Props = $props();

	const demoUrl = $derived(
		`/demo/?readOnly=${readOnly}&showNavbar=${showNavbar}`
	);
</script>

<div class="fd-demo-inline" style:height={height}>
	<iframe
		src={demoUrl}
		class="fd-demo-iframe"
		title="FlowDrop Interactive Demo"
		allow="clipboard-write"
	></iframe>
</div>

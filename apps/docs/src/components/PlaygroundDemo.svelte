<script lang="ts">
	interface Props {
		height?: string;
	}

	let {
		height = '70vh'
	}: Props = $props();
</script>

<div class="fd-demo-chrome">
	<div class="fd-chrome-bar">
		<div class="fd-chrome-dots"><span></span><span></span><span></span></div>
		<div class="fd-chrome-title">FlowDrop Playground</div>
		<div class="fd-chrome-spacer"></div>
	</div>
	<div class="fd-demo-inline" style:height={height}>
		<iframe
			src="/playground-demo/"
			class="fd-demo-iframe"
			title="FlowDrop Playground Demo"
			allow="clipboard-write"
		></iframe>
	</div>
</div>

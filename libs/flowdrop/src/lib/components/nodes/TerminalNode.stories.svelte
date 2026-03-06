<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NodeDecorator from '../../stories/NodeDecorator.svelte';
	import { createTerminalNodeData } from '../../stories/utils.js';

	const { Story } = defineMeta({
		title: 'Nodes/TerminalNode',
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		}
	});
</script>

<Story name="Start">
	<NodeDecorator data={createTerminalNodeData('start')} />
</Story>

<Story name="End">
	<NodeDecorator data={createTerminalNodeData('end')} />
</Story>

<Story name="Exit">
	<NodeDecorator data={createTerminalNodeData('exit')} />
</Story>

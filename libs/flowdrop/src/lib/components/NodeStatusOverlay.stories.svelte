<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NodeStatusOverlay from './NodeStatusOverlay.svelte';

	const { Story } = defineMeta({
		title: 'Editor/NodeStatusOverlay',
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		}
	});
</script>

{#snippet nodeBox(label)}
	<div
		style="position: relative; width: 220px; height: 100px; margin-top: 60px; border: 1px solid var(--fd-border, #e5e7eb); border-radius: 8px; background: var(--fd-card, white);"
	>
		<NodeStatusOverlay
			executionInfo={{
				status: 'idle',
				executionCount: 3,
				isExecuting: false,
				lastExecuted: new Date().toISOString()
			}}
		/>
		<div style="padding: 1rem; text-align: center; color: var(--fd-text, #374151);">{label}</div>
	</div>
{/snippet}

<Story name="Idle (with history)">
	<div
		style="position: relative; width: 220px; height: 100px; margin-top: 60px; border: 1px solid var(--fd-border, #e5e7eb); border-radius: 8px; background: var(--fd-card, white);"
	>
		<NodeStatusOverlay
			executionInfo={{
				status: 'idle',
				executionCount: 3,
				isExecuting: false,
				lastExecuted: new Date().toISOString()
			}}
			showDetails
		/>
		<div style="padding: 1rem; text-align: center; color: var(--fd-text, #374151);">
			Node Content
		</div>
	</div>
</Story>

<Story name="Running">
	<div
		style="position: relative; width: 220px; height: 100px; margin-top: 60px; border: 1px solid var(--fd-border, #e5e7eb); border-radius: 8px; background: var(--fd-card, white);"
	>
		<NodeStatusOverlay
			executionInfo={{
				status: 'running',
				executionCount: 1,
				isExecuting: true
			}}
		/>
		<div style="padding: 1rem; text-align: center; color: var(--fd-text, #374151);">
			Processing...
		</div>
	</div>
</Story>

<Story name="Completed">
	<div
		style="position: relative; width: 220px; height: 100px; margin-top: 60px; border: 1px solid var(--fd-border, #e5e7eb); border-radius: 8px; background: var(--fd-card, white);"
	>
		<NodeStatusOverlay
			executionInfo={{
				status: 'completed',
				executionCount: 5,
				isExecuting: false,
				lastExecuted: new Date().toISOString(),
				lastExecutionDuration: 1250
			}}
			showDetails
		/>
		<div style="padding: 1rem; text-align: center; color: var(--fd-text, #374151);">Done!</div>
	</div>
</Story>

<Story name="Failed">
	<div
		style="position: relative; width: 220px; height: 100px; margin-top: 60px; border: 1px solid var(--fd-border, #e5e7eb); border-radius: 8px; background: var(--fd-card, white);"
	>
		<NodeStatusOverlay
			executionInfo={{
				status: 'failed',
				executionCount: 2,
				isExecuting: false,
				lastError: 'Connection timeout',
				lastExecuted: new Date().toISOString(),
				lastExecutionDuration: 30000
			}}
			showDetails
		/>
		<div style="padding: 1rem; text-align: center; color: var(--fd-text, #374151);">Error</div>
	</div>
</Story>

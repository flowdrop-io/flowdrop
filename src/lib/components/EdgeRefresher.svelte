<!--
  EdgeRefresher Component
  Helper component that uses useUpdateNodeInternals to force edge recalculation
  Must be rendered inside SvelteFlowProvider context
-->

<script lang="ts">
	import { useUpdateNodeInternals } from '@xyflow/svelte';

	interface Props {
		/** Node ID to refresh - when this changes, edges are recalculated */
		nodeIdToRefresh: string | null;
		/** Callback when refresh is complete */
		onRefreshComplete?: () => void;
	}

	let { nodeIdToRefresh, onRefreshComplete }: Props = $props();

	/**
	 * Get the updateNodeInternals function from Svelte Flow context
	 * This recalculates handle positions and forces edge path updates
	 */
	const updateNodeInternals = useUpdateNodeInternals();

	/**
	 * Watch for nodeIdToRefresh changes and trigger edge recalculation
	 */
	$effect(() => {
		if (nodeIdToRefresh) {
			// Tell Svelte Flow to recalculate node internals (handle positions)
			updateNodeInternals(nodeIdToRefresh);

			// Notify parent that refresh is complete
			if (onRefreshComplete) {
				onRefreshComplete();
			}
		}
	});
</script>

<!-- This component renders nothing - it's just for the hook logic -->

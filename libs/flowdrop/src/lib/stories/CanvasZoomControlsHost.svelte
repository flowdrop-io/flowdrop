<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import CanvasZoomControls from '$lib/components/CanvasZoomControls.svelte';

  let props: { nodeCount: number; edgeCount: number; hasCycles?: boolean } = $props();
</script>

<SvelteFlowProvider>
  <CanvasZoomControls {...props} />
</SvelteFlowProvider>

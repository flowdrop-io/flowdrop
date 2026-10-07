<!--
  Playground Component

  The standalone Playground: the conversation surface (PlaygroundSurface) with
  the props the standalone entry points have always passed. Used by
  PlaygroundStudio (standalone), PlaygroundModal (modal), and the
  /workflow/[id]/playground/[sessionId] route.

  Deprecated in favour of the editor's Test mode and removed in 3.0 (see the
  plan's T13). Keep this file a thin wrapper: anything the docked Playground
  of Test mode needs belongs in PlaygroundSurface, so it survives this
  file's removal.
-->

<script lang="ts">
  import PlaygroundSurface from './PlaygroundSurface.svelte';
  import type { Workflow } from '../../types/index.js';
  import type { EndpointConfig } from '../../config/endpoints.js';
  import type { AuthProvider } from '../../types/auth.js';
  import type { PlaygroundMode, PlaygroundConfig } from '../../types/playground.js';
  import type { FlowDropInstance } from '../../stores/instanceContainer.svelte.js';

  interface Props {
    workflowId: string;
    workflow?: Workflow;
    mode?: PlaygroundMode;
    initialSessionId?: string;
    endpointConfig?: EndpointConfig;
    /** Auth provider applied to this instance's API requests. */
    authProvider?: AuthProvider;
    config?: PlaygroundConfig;
    onClose?: () => void;
    onTogglePanel?: () => void;
    isPipelinePanelOpen?: boolean;
    onSessionNavigate?: (sessionId: string) => void;
    instance?: FlowDropInstance;
  }

  let props: Props = $props();
</script>

<PlaygroundSurface {...props} />

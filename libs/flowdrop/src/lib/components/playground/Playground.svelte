<!--
  @component
  **Legacy.** The standalone Playground. It is deprecated in favour of the editor's Test mode (the Playground docked beside the canvas) and removed in 3.0. It warns once per page when mounted.
  It is a thin wrapper that passes the standalone props to `PlaygroundSurface`. `PlaygroundStudio`, `PlaygroundModal` and the /workflow/[id]/playground/[sessionId] route use it.

  Keep this file thin. Anything the docked Playground needs belongs in `PlaygroundSurface`, so it survives this file's removal.

  **Use it for** existing standalone pages until they move to Test mode.
  **Not for** new work; use `DockedPlayground` (Test mode) instead.
-->

<script lang="ts">
  import { warnStandalonePlaygroundDeprecated } from '../../utils/deprecation.js';
  import PlaygroundSurface from './PlaygroundSurface.svelte';
  import type { Workflow } from '../../types/index.js';
  import type { EndpointConfig } from '../../config/endpoints.js';
  import type { AuthProvider } from '../../types/auth.js';
  import type { PlaygroundMode, PlaygroundConfig } from '../../types/playground.js';
  import type { FlowDropInstance } from '../../stores/instanceContainer.svelte.js';

  warnStandalonePlaygroundDeprecated();

  interface Props {
    /** Id of the workflow to test. */
    workflowId: string;
    /** A pre-loaded workflow. Default: fetched by id. */
    workflow?: Workflow;
    /** Display mode. Default: standalone. */
    mode?: PlaygroundMode;
    /** Session to open on mount. Default: none. */
    initialSessionId?: string;
    /** API endpoints. Default: the page default. */
    endpointConfig?: EndpointConfig;
    /** Auth provider applied to this instance's API requests. */
    authProvider?: AuthProvider;
    /** Playground options. Default: none. */
    config?: PlaygroundConfig;
    /** Called when the user closes the Playground. */
    onClose?: () => void;
    /** Called when the user presses the Pipeline button. */
    onTogglePanel?: () => void;
    /** Whether the pipeline panel is open. Default: false. */
    isPipelinePanelOpen?: boolean;
    /** Called with the session id after a switch, so a host can update its URL. */
    onSessionNavigate?: (sessionId: string) => void;
    /** FlowDrop instance to use. Default: from context or the page default. */
    instance?: FlowDropInstance;
  }

  let props: Props = $props();
</script>

<PlaygroundSurface {...props} />

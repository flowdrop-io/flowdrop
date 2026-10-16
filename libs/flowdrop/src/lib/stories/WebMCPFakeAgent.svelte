<!--
  @component
  A harness for the WebMCP adapter: the editor beside a fake browser agent.

  It mounts the full editor, registers the editor's tools on a fake `modelContext`, and shows a side panel
  that plays the browser agent: pick a tool, type its JSON arguments, invoke it, read the result. The
  approval dialog opens exactly as it would for a real agent, so the gate and the results can be seen
  without a browser that has WebMCP.

  The editor is given an endpoint configuration without the Doctor, so it makes no request to a backend.

  **Use it for** trying the WebMCP tools and the approval gate.
  **Not for** the editor itself (it is the whole editor in a story) or for testing a real agent.
-->

<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import App from '../components/App.svelte';
  import Button from '../components/primitives/Button.svelte';
  import { defaultEndpointConfig, type EndpointConfig } from '../config/endpoints.js';
  import { createFlowDropInstance } from '../stores/instanceContainer.svelte.js';
  import { attachWebMCP } from '../webmcp/register.js';
  import { createFakeModelContext } from '../webmcp/fake.js';
  import type { WebMCPApproval, WebMCPHandle } from '../webmcp/types.js';
  import type { NodeMetadata, Workflow } from '../types/index.js';

  interface Props {
    /** The node types the editor and the tools know. */
    nodes: NodeMetadata[];
    /** The workflow open in the editor. */
    workflow: Workflow;
    /** `confirm` asks before every change; `auto` lets the agent change things at once. @default 'confirm' */
    approval?: WebMCPApproval;
  }

  let { nodes, workflow, approval = 'confirm' }: Props = $props();

  // The default endpoints include the Doctor, which would POST a diagnosis to the page's own server
  // (a 404 that never answers). Without it the editor stays quiet.
  const endpointConfig: EndpointConfig = {
    ...defaultEndpointConfig,
    endpoints: {
      ...defaultEndpointConfig.endpoints,
      workflows: {
        ...defaultEndpointConfig.endpoints.workflows,
        diagnose: undefined,
        remedy: undefined
      }
    }
  };

  const fd = createFlowDropInstance({ id: 'webmcp-story' });
  // Seed once; later prop changes are the story's business, not the editor's.
  fd.workflow.initialize(untrack(() => workflow));

  const runtime = createFakeModelContext();
  let handle = $state<WebMCPHandle | null>(null);
  let toolNames = $state<string[]>([]);
  let selected = $state('flowdrop_list_types');
  let argsText = $state('{}');
  let log = $state<Array<{ tool: string; args: string; result: string; error: boolean }>>([]);
  let running = $state(false);

  const SAMPLES: Record<string, string> = {
    flowdrop_list_types: '{}',
    flowdrop_list_nodes: '{}',
    flowdrop_info: '{ "nodeId": "chat_model.1" }',
    flowdrop_add_node: '{ "nodeTypeId": "chat_model" }',
    flowdrop_set_config: '{ "nodeId": "chat_model.1", "key": "model", "value": "gpt-4o-mini" }',
    flowdrop_connect:
      '{ "sourceNodeId": "text_input.1", "sourcePort": "value", "targetNodeId": "chat_model.1", "targetPort": "message" }',
    flowdrop_batch:
      '{ "commands": [\n  { "type": "add_node", "nodeTypeId": "chat_model" },\n  { "type": "add_node", "nodeTypeId": "chat_output" }\n] }',
    flowdrop_undo: '{}'
  };

  onMount(() => {
    handle = attachWebMCP(fd, { nodeTypes: () => nodes, approval, modelContext: runtime });
    const sync = () => (toolNames = [...runtime.tools.keys()]);
    sync();
    const off = runtime.onToolChange(sync);
    return () => {
      off();
      handle?.detach();
    };
  });

  function pick(name: string): void {
    selected = name;
    argsText = SAMPLES[name] ?? '{}';
  }

  async function invoke(): Promise<void> {
    let input: unknown;
    try {
      input = JSON.parse(argsText || '{}');
    } catch (err) {
      log = [{ tool: selected, args: argsText, result: String(err), error: true }, ...log];
      return;
    }
    running = true;
    try {
      const result = await runtime.executeTool(selected, input);
      const pretty = JSON.stringify(JSON.parse(result.content[0].text), null, 2);
      log = [{ tool: selected, args: argsText, result: pretty, error: !!result.isError }, ...log];
    } finally {
      running = false;
    }
  }
</script>

<div class="webmcp-story">
  <div class="webmcp-story__editor">
    <App instance={fd} {nodes} {workflow} {endpointConfig} height="100%" />
  </div>

  <aside class="webmcp-story__agent">
    <h3 class="webmcp-story__title">Fake browser agent</h3>
    <p class="webmcp-story__hint">
      {toolNames.length} tools registered on <code>document.modelContext</code> (fake). Reads run at
      once; changes ask first{approval === 'auto' ? ' — except here: approval is auto' : ''}.
    </p>

    <label class="webmcp-story__label">
      Tool
      <select
        class="webmcp-story__select"
        data-testid="webmcp-tool"
        value={selected}
        onchange={(e) => pick((e.currentTarget as HTMLSelectElement).value)}
      >
        {#each toolNames as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </label>

    <label class="webmcp-story__label">
      Arguments (JSON)
      <textarea class="webmcp-story__args" data-testid="webmcp-args" rows="5" bind:value={argsText}
      ></textarea>
    </label>

    <div class="webmcp-story__actions">
      <Button
        variant="primary"
        size="md"
        data-testid="webmcp-invoke"
        disabled={running || !handle}
        onclick={invoke}
      >
        {running ? 'Waiting…' : 'Invoke'}
      </Button>
    </div>

    <ol class="webmcp-story__log" data-testid="webmcp-log">
      {#each log as entry, i (log.length - i)}
        <li class="webmcp-story__entry" class:webmcp-story__entry--error={entry.error}>
          <div class="webmcp-story__call">{entry.tool} {entry.args}</div>
          <pre class="webmcp-story__result">{entry.result}</pre>
        </li>
      {/each}
    </ol>
  </aside>
</div>

<style>
  .webmcp-story {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 22rem;
    height: 100vh;
    font-family: var(--fd-font-sans);
  }
  .webmcp-story__editor {
    min-width: 0;
    height: 100%;
  }
  .webmcp-story__agent {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
    padding: var(--fd-space-lg);
    border-left: 1px solid var(--fd-border);
    background: var(--fd-card);
    overflow: auto;
    font-size: var(--fd-text-sm);
  }
  .webmcp-story__title {
    margin: 0;
    font-size: var(--fd-text-sm);
  }
  .webmcp-story__hint {
    margin: 0;
    color: var(--fd-muted-foreground);
  }
  .webmcp-story__label {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xs);
    font-weight: 600;
  }
  .webmcp-story__select,
  .webmcp-story__args {
    font: inherit;
    font-family: var(--fd-font-mono);
    font-weight: 400;
    padding: var(--fd-space-xs);
    border: 1px solid var(--fd-border-strong);
    border-radius: var(--fd-radius-md);
    background: var(--fd-background);
  }
  .webmcp-story__actions {
    align-self: flex-start;
  }
  .webmcp-story__log {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
  }
  .webmcp-story__entry {
    padding: var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: var(--fd-background);
  }
  .webmcp-story__entry--error {
    border-color: var(--fd-error);
  }
  .webmcp-story__call {
    font-family: var(--fd-font-mono);
    font-weight: 600;
    margin-bottom: var(--fd-space-2xs);
    overflow-wrap: anywhere;
  }
  .webmcp-story__result {
    margin: 0;
    font-size: var(--fd-text-xs);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>

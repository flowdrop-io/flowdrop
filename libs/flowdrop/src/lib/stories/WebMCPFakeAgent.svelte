<!--
  WebMCPFakeAgent

  Storybook harness for the WebMCP adapter. Mounts a full editor, attaches the
  editor tools to a fake `modelContext`, and shows a side panel that plays the
  browser agent: pick a tool, type its JSON arguments, invoke it, read the
  result. The approval dialog appears exactly as it would for a real agent, so
  the gate and the results are visible to a human without Chrome's origin trial.
-->

<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import App from '../components/App.svelte';
  import { createFlowDropInstance } from '../stores/instanceContainer.svelte.js';
  import { attachWebMCP } from '../webmcp/register.js';
  import { createFakeModelContext } from '../webmcp/fake.js';
  import type { WebMCPApproval, WebMCPHandle } from '../webmcp/types.js';
  import type { NodeMetadata, Workflow } from '../types/index.js';

  interface Props {
    nodes: NodeMetadata[];
    workflow: Workflow;
    approval?: WebMCPApproval;
  }

  let { nodes, workflow, approval = 'confirm' }: Props = $props();

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
    <App instance={fd} {nodes} {workflow} height="100%" />
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

    <button
      type="button"
      class="webmcp-story__invoke"
      data-testid="webmcp-invoke"
      disabled={running || !handle}
      onclick={invoke}
    >
      {running ? 'Waiting…' : 'Invoke'}
    </button>

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
    font-family: system-ui, sans-serif;
  }
  .webmcp-story__editor {
    min-width: 0;
    height: 100%;
  }
  .webmcp-story__agent {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border-left: 1px solid #e4e4e7;
    background: #fafafa;
    overflow: auto;
    font-size: 0.8125rem;
  }
  .webmcp-story__title {
    margin: 0;
    font-size: 0.9375rem;
  }
  .webmcp-story__hint {
    margin: 0;
    color: #71717a;
  }
  .webmcp-story__label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-weight: 600;
  }
  .webmcp-story__select,
  .webmcp-story__args {
    font: inherit;
    font-family: ui-monospace, monospace;
    font-weight: 400;
    padding: 0.375rem;
    border: 1px solid #d4d4d8;
    border-radius: 0.375rem;
    background: #fff;
  }
  .webmcp-story__invoke {
    align-self: flex-start;
    padding: 0.375rem 0.75rem;
    border: 1px solid #2563eb;
    border-radius: 0.375rem;
    background: #2563eb;
    color: #fff;
    font: inherit;
    cursor: pointer;
  }
  .webmcp-story__invoke:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .webmcp-story__log {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .webmcp-story__entry {
    padding: 0.5rem;
    border: 1px solid #e4e4e7;
    border-radius: 0.375rem;
    background: #fff;
  }
  .webmcp-story__entry--error {
    border-color: #fca5a5;
  }
  .webmcp-story__call {
    font-family: ui-monospace, monospace;
    font-weight: 600;
    margin-bottom: 0.25rem;
    overflow-wrap: anywhere;
  }
  .webmcp-story__result {
    margin: 0;
    font-size: 0.75rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>

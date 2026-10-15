<!--
  @component
  The node inspector as the editor mounts it: `NodeInspector` with the node's `ConfigForm` as its Config content.
  It reads the workflow from the instance, so put it inside an `InstanceDecorator` that was given a workflow.
  Edits are written back to the instance's workflow, as the editor does.
-->

<script lang="ts">
  import ConfigForm from '../components/ConfigForm.svelte';
  import NodeInspector from '../components/NodeInspector.svelte';
  import { getInstance } from '../stores/getInstance.svelte.js';
  import type { NodeExecutionInfo, WorkflowNode } from '../types/index.js';
  import type { NodeInspectorTab } from '../utils/inspectorSurface.js';

  interface Props {
    /** The node to inspect. */
    node: WorkflowNode;
    /** Edit or Test. Test adds the Last run tab. @default 'edit' */
    editorMode?: 'edit' | 'test';
    /** The tab open at first. @default 'config' */
    tab?: NodeInspectorTab;
    /** The node's execution info for the shown run. */
    info?: NodeExecutionInfo;
    /** A run is shown on the canvas. @default false */
    runShown?: boolean;
  }

  const {
    node,
    editorMode = 'edit',
    tab: initialTab = 'config',
    info,
    runShown = false
  }: Props = $props();

  const fd = getInstance();
  // svelte-ignore state_referenced_locally
  let tab = $state<NodeInspectorTab>(initialTab);
  const current = $derived(fd.workflow.nodes.find((n) => n.id === node.id) ?? node);
</script>

<NodeInspector {editorMode} {tab} onTabChange={(next) => (tab = next)} {info} {runShown}>
  {#snippet config()}
    <ConfigForm
      node={current}
      commitMode="live"
      workflowId={fd.workflow.current?.id}
      workflowNodes={fd.workflow.current?.nodes}
      workflowEdges={fd.workflow.current?.edges}
      onChange={(updatedConfig) => {
        fd.workflow.updateNodeConfig(node.id, { data: { ...current.data, config: updatedConfig } });
      }}
    />
  {/snippet}
</NodeInspector>

<!--
  @component
  A node an agent can call, drawn on the shared card.

  It has the same header as `WorkflowNode` (see `NodeCard`), with the tool's badge and
  version on the kind line and a wash in the tool colour. Its tool ports (those of
  `metadata.portDataType`, default `tool`) are one row.

  **Use it for** a node type that declares `type: "tool"`.
  **Not for** a node that only has ordinary data ports; use `WorkflowNode`.
-->

<script lang="ts">
  import { m } from '$lib/messages/index.js';
  import type { ConfigValues, NodeMetadata, NodePort } from '../../types/index.js';
  import NodeCard from './NodeCard.svelte';
  import { getEditorSettings } from '../../stores/settingsStore.svelte.js';
  import { computeNodeGeometry } from '../../utils/nodeGeometry.js';

  interface ToolNodeParameter {
    name: string;
    type?: string;
    description?: string;
  }

  interface Props {
    /** The node's id on the canvas. */
    id: string;
    /** The node: label, config (tool name, description, version, parameters) and node type. */
    data: {
      label: string;
      config: ConfigValues & {
        icon?: string;
        color?: string;
        toolName?: string;
        toolDescription?: string;
        toolVersion?: string;
        parameters?: ToolNodeParameter[];
      };
      metadata: NodeMetadata;
      onConfigOpen?: (node: {
        id: string;
        type: string;
        data: {
          label: string;
          config: Record<string, unknown>;
          metadata: NodeMetadata;
        };
      }) => void;
    };
    /** Whether the node is selected. A selected node draws its selection border and keeps the config gear visible. */
    selected?: boolean;
    /** Not passed by the editor: run state is drawn by `NodeStatusOverlay`. */
    isProcessing?: boolean;
    /** Not passed by the editor: run state is drawn by `NodeStatusOverlay`. */
    isError?: boolean;
  }

  let props: Props = $props();

  // Prioritize metadata over config for tool nodes (metadata is the node definition)
  let toolIcon = $derived(
    (props.data.metadata?.icon as string) || (props.data.config?.icon as string) || 'mdi:tools'
  );
  let toolColor = $derived(
    (props.data.metadata?.color as string) ||
      (props.data.config?.color as string) ||
      'var(--fd-warning)'
  );

  /**
   * Instance-specific title override from config.
   * Falls back to metadata name, toolName config, or label if not set.
   * This allows users to customize the tool title per-instance via config.
   */
  const displayTitle = $derived(
    (props.data.config?.instanceTitle as string) ||
      (props.data.metadata?.name as string) ||
      (props.data.config?.toolName as string) ||
      props.data.label ||
      'Tool'
  );

  /**
   * Instance-specific badge label override from config.
   * Falls back to metadata badge or default 'TOOL' if not set.
   * This allows users to customize the badge text per-instance via config.
   */
  const displayBadge = $derived(
    (props.data.config?.instanceBadge as string) || (props.data.metadata?.badge as string) || 'TOOL'
  );

  /**
   * Instance-specific description override from config.
   * Falls back to metadata description or toolDescription config if not set.
   * This allows users to customize the tool description per-instance via config.
   */
  const displayDescription = $derived(
    (props.data.config?.instanceDescription as string) ||
      (props.data.metadata?.description as string) ||
      (props.data.config?.toolDescription as string) ||
      'A configurable tool for agents'
  );

  let toolVersion = $derived(
    (props.data.metadata?.version as string) ||
      (props.data.config?.toolVersion as string) ||
      '1.0.0'
  );

  /**
   * Configurable port dataType to expose on this tool node.
   * Defaults to 'tool', but can be overridden via metadata.portDataType
   * to show a different port type (e.g., 'trigger') when the node is
   * repurposed with a custom badge.
   */
  const portDataType = $derived((props.data.metadata?.portDataType as string) || 'tool');

  /** The matching ports: the card draws them as the node's one row. */
  const toolInputs = $derived(
    (props.data.metadata?.inputs ?? [])
      .filter((port: NodePort) => port.dataType === portDataType)
      .slice(0, 1)
  );
  const toolOutputs = $derived(
    (props.data.metadata?.outputs ?? [])
      .filter((port: NodePort) => port.dataType === portDataType)
      .slice(0, 1)
  );

  /**
   * The tool's ports are never header pins, even when `portDataType` is
   * `trigger`: this node has no completion pins, it has one row.
   */
  const geometry = $derived(
    computeNodeGeometry({
      inputs: toolInputs,
      outputs: toolOutputs,
      showDescriptions: getEditorSettings().showNodeDescriptions,
      execPins: 'none'
    })
  );

  const kindLine = $derived(`${displayBadge} · v${toolVersion}`);

  /**
   * Handle configuration sidebar - using global ConfigSidebar
   */
  function openConfigSidebar(): void {
    props.data.onConfigOpen?.({ id: props.id, type: 'tool', data: props.data });
  }
</script>

<NodeCard
  id={props.id}
  selected={props.selected}
  variant="tool"
  {geometry}
  title={displayTitle}
  {kindLine}
  description={displayDescription}
  icon={toolIcon}
  color={toolColor}
  processing={props.isProcessing}
  error={props.isError}
  configTitle={m().nodes.configureTool}
  onconfig={openConfigSidebar}
/>

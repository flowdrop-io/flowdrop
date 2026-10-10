<!--
  Tool Node Component
  A specialized node for tools, on the card v2 geometry (see NodeCard): the same
  header, with the tool's badge and version on the "kind" line, and its tool
  ports (the ones of `metadata.portDataType`, default `tool`) as one row. The
  tool colour washes the header.
-->

<script lang="ts">
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
    id: string;
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
    selected?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
  }

  let props: Props = $props();

  // Prioritize metadata over config for tool nodes (metadata is the node definition)
  let toolIcon = $derived(
    (props.data.metadata?.icon as string) || (props.data.config?.icon as string) || 'mdi:tools'
  );
  let toolColor = $derived(
    (props.data.metadata?.color as string) || (props.data.config?.color as string) || '#f59e0b'
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
  ariaLabel={displayTitle}
  processing={props.isProcessing}
  error={props.isError}
  configTitle="Configure tool"
  onconfig={openConfigSidebar}
/>

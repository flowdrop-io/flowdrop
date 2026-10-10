<!--
  InterfaceTagLayer

  Draws a tag beside every port a `workflow.interface` entry binds, a
  read-only tag beside every trigger's `event` input (the derived
  `event:<node-id>` input, MAN-26), and the ghost tag a name is typed in (to
  expose a port, or to rename an entry).
  Render it inside <SvelteFlow>: it puts its tags in the viewport layer in
  front of the nodes, so they pan and zoom with the canvas.

  Hovering a tag opens a popover (NodeTip) that says what the name means and
  which port it fills or returns.

  View only. Every edit leaves through the callbacks, and the editor routes
  them through the workflow store (undoable, marks the workflow dirty).
-->

<script lang="ts" module>
  import type { InterfaceDirection } from '$lib/utils/interfaceTags.js';

  /** A name being typed beside a port. */
  export interface InterfaceTagEdit {
    /** `expose`: a new entry for the port. `rename`: the entry it already has. */
    mode: 'expose' | 'rename';
    direction: InterfaceDirection;
    nodeId: string;
    portId: string;
    /** The entry's current id (rename only). */
    entryId?: string;
    value: string;
  }
</script>

<script lang="ts">
  import { ViewportPortal } from '@xyflow/svelte';
  import { m } from '$lib/messages/index.js';
  import { getInstance } from '$lib/stores/getInstance.svelte.js';
  import { getDataTypeColorToken, getDataTypeDisplayText } from '$lib/utils/colors.js';
  import {
    exposableCandidate,
    interfaceTagModels,
    interfaceTagTypeText,
    reservedInputTagModels,
    validateInterfaceId,
    type InterfaceIdError,
    type InterfaceTagModel
  } from '$lib/utils/interfaceTags.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import type { Workflow } from '$lib/types/index.js';
  import InterfaceTag from './InterfaceTag.svelte';
  import InterfaceTagAnchor from './InterfaceTagAnchor.svelte';
  import InterfaceNameInput from './InterfaceNameInput.svelte';
  import NodeTip from './nodes/NodeTip.svelte';

  interface Props {
    workflow: Workflow;
    /** Whether the canvas can be edited (double-click renames). */
    editable: boolean;
    edit: InterfaceTagEdit | null;
    onedit: (value: string) => void;
    onsubmit: () => void;
    oncancel: () => void;
    onrename: (tag: InterfaceTagModel) => void;
    onmenu: (tag: InterfaceTagModel, event: MouseEvent) => void;
  }

  const { workflow, editable, edit, onedit, onsubmit, oncancel, onrename, onmenu }: Props =
    $props();

  const fd = getInstance();
  const checker = fd.portCompatibility;

  const typeName = (dataType: string): string => getDataTypeDisplayText(checker, dataType);

  const tags = $derived(interfaceTagModels(workflow));
  const reservedTags = $derived(reservedInputTagModels(workflow));

  /** The tag whose id is being typed, if any (a rename). */
  const renaming = $derived(
    edit?.mode === 'rename'
      ? tags.find(
          (tag) =>
            tag.direction === edit.direction &&
            tag.nodeId === edit.nodeId &&
            tag.portId === edit.portId
        )
      : undefined
  );

  /** The ghost tag of an expose: the port's own type, the typed name. */
  const exposing = $derived.by(() => {
    if (edit?.mode !== 'expose') return null;
    const candidate = exposableCandidate(workflow, edit.nodeId, edit.direction, edit.portId);
    if (!candidate) return null;
    return {
      handleId: buildHandleId(edit.nodeId, edit.direction, edit.portId),
      dataType: candidate.port.dataType
    };
  });

  const error = $derived.by((): string | null => {
    if (!edit) return null;
    const reason: InterfaceIdError | null = validateInterfaceId(
      edit.value,
      edit.direction,
      workflow.interface,
      edit.entryId
    );
    if (reason === 'empty') return m().workflowInterface.tagIdEmpty;
    if (reason === 'duplicate') {
      return m().workflowInterface.tagIdDuplicate({
        id: edit.value.trim(),
        direction: edit.direction
      });
    }
    return null;
  });

  interface TagTip {
    anchor: DOMRect;
    /** Outputs sit right of their node, so their popover grows leftwards. */
    align: 'start' | 'end';
    title: string;
    code: string;
    body?: string;
    note?: string;
  }

  // Read during init: m() needs the component context, which a hover handler lacks.
  const iface = $derived(m().workflowInterface);

  let tip = $state<TagTip | null>(null);
  let tipTimer: ReturnType<typeof setTimeout> | undefined;

  function hideTip(): void {
    clearTimeout(tipTimer);
    tip = null;
  }

  /** The popover's text for a tag: kind, what the name does, and how to edit it. */
  function tipFor(tag: InterfaceTagModel, typeText: string): Omit<TagTip, 'anchor' | 'align'> {
    const t = iface;
    const node = workflow.nodes.find((candidate) => candidate.id === tag.nodeId);
    const ports =
      tag.direction === 'input' ? node?.data.metadata.inputs : node?.data.metadata.outputs;
    const port = ports?.find((candidate) => candidate.id === tag.portId)?.name ?? tag.portId;
    const nodeName = node?.data.label || node?.data.metadata.name || tag.nodeId;
    const code = `${tag.entry.id} · ${typeText}`;
    if (tag.readonly) {
      return {
        title: t.tagTipReserved,
        code,
        body: t.tagTipReservedBody,
        note: t.tagTipReservedHint
      };
    }
    const explain =
      tag.direction === 'input'
        ? t.tagTipInputBody({ port, node: nodeName })
        : t.tagTipOutputBody({ port, node: nodeName });
    const notes = [
      tag.direction === 'input' && tag.entry.required ? t.tagTipRequired : null,
      tag.mismatch
        ? t.tagTipMismatch({
            declared: typeName(tag.mismatch.declared),
            port: typeName(tag.mismatch.port)
          })
        : null,
      editable ? t.tagTipEditHint : null
    ].filter(Boolean);
    return {
      title: `${tag.direction === 'input' ? t.tagTipInput : t.tagTipOutput}${
        tag.entry.name && tag.entry.name !== tag.entry.id ? `: ${tag.entry.name}` : ''
      }`,
      code,
      body: tag.entry.description ? `${tag.entry.description} ${explain}` : explain,
      note: notes.join(' · ') || undefined
    };
  }

  function showTip(event: Event, tag: InterfaceTagModel, typeText: string): void {
    clearTimeout(tipTimer);
    const anchor = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const content = tipFor(tag, typeText);
    tipTimer = setTimeout(
      () => (tip = { anchor, align: tag.direction === 'output' ? 'end' : 'start', ...content }),
      tip ? 0 : 250
    );
  }

  $effect(() => () => clearTimeout(tipTimer));

  function submit(): void {
    if (error) return;
    onsubmit();
  }
</script>

<ViewportPortal target="front">
  {#each tags as tag (tag.key)}
    {@const typeText = interfaceTagTypeText(tag, typeName)}
    <InterfaceTagAnchor
      nodeId={tag.nodeId}
      handleId={tag.handleId}
      direction={tag.direction}
      tone={tag.mismatch ? 'mismatch' : renaming === tag ? 'ghost' : 'default'}
    >
      {#if renaming === tag && edit}
        <InterfaceTag
          id={edit.value}
          color={getDataTypeColorToken(checker, tag.entry.dataType)}
          mismatch={!!tag.mismatch}
          ghost
        >
          <InterfaceNameInput
            value={edit.value}
            {error}
            onchange={onedit}
            onsubmit={submit}
            {oncancel}
          />
        </InterfaceTag>
      {:else}
        <InterfaceTag
          id={tag.entry.id}
          {typeText}
          color={getDataTypeColorToken(checker, tag.entry.dataType)}
          mismatch={!!tag.mismatch}
          class="nodrag nopan"
          role="img"
          aria-label={m().workflowInterface.tagAria({
            id: tag.entry.id,
            type: typeText,
            direction: tag.direction
          })}
          title=""
          data-testid="interface-tag"
          data-interface-id={tag.entry.id}
          data-interface-direction={tag.direction}
          onmouseenter={(event: MouseEvent) => showTip(event, tag, typeText)}
          onmouseleave={hideTip}
          ondblclick={() => {
            hideTip();
            if (editable) onrename(tag);
          }}
          oncontextmenu={(event: MouseEvent) => {
            hideTip();
            if (!editable) return;
            event.preventDefault();
            event.stopPropagation();
            onmenu(tag, event);
          }}
        />
      {/if}
    </InterfaceTagAnchor>
  {/each}

  {#each reservedTags as tag (tag.key)}
    {@const typeText = interfaceTagTypeText(tag, typeName)}
    <InterfaceTagAnchor nodeId={tag.nodeId} handleId={tag.handleId} direction={tag.direction}>
      <InterfaceTag
        id={tag.entry.id}
        {typeText}
        color={getDataTypeColorToken(checker, tag.entry.dataType)}
        readonly
        class="nodrag nopan"
        role="img"
        title=""
        onmouseenter={(event: MouseEvent) => showTip(event, tag, typeText)}
        onmouseleave={hideTip}
        aria-label={m().workflowInterface.reservedTagAria({ id: tag.entry.id, type: typeText })}
        data-testid="interface-tag-reserved"
        data-interface-id={tag.entry.id}
        data-interface-direction={tag.direction}
      />
    </InterfaceTagAnchor>
  {/each}

  {#if edit && exposing}
    <InterfaceTagAnchor
      nodeId={edit.nodeId}
      handleId={exposing.handleId}
      direction={edit.direction}
      tone="ghost"
    >
      <InterfaceTag
        id={edit.value}
        color={getDataTypeColorToken(checker, exposing.dataType)}
        ghost
        data-testid="interface-tag-ghost"
      >
        <InterfaceNameInput
          value={edit.value}
          {error}
          onchange={onedit}
          onsubmit={submit}
          {oncancel}
        />
      </InterfaceTag>
    </InterfaceTagAnchor>
  {/if}
</ViewportPortal>

{#if tip}
  <NodeTip
    anchor={tip.anchor}
    align={tip.align}
    variant="pop"
    title={tip.title}
    code={tip.code}
    body={tip.body}
    note={tip.note}
  />
{/if}

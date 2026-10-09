<!--
  InterfaceTagLayer

  Draws a tag beside every port a `workflow.interface` entry binds, and the
  ghost tag a name is typed in (to expose a port, or to rename an entry).
  Render it inside <SvelteFlow>: it puts its tags in the viewport layer in
  front of the nodes, so they pan and zoom with the canvas.

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
  import { ViewportPortal, useViewport } from '@xyflow/svelte';
  import { m } from '$lib/messages/index.js';
  import { getInstance } from '$lib/stores/getInstance.svelte.js';
  import { getDataTypeColorToken, getDataTypeDisplayText } from '$lib/utils/colors.js';
  import {
    INTERFACE_TAG_TEXT_MIN_ZOOM,
    exposableCandidate,
    interfaceTagModels,
    interfaceTagTypeText,
    validateInterfaceId,
    type InterfaceIdError,
    type InterfaceTagModel
  } from '$lib/utils/interfaceTags.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import type { Workflow } from '$lib/types/index.js';
  import InterfaceTag from './InterfaceTag.svelte';
  import InterfaceTagAnchor from './InterfaceTagAnchor.svelte';
  import InterfaceNameInput from './InterfaceNameInput.svelte';

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
  const viewport = useViewport();

  const compact = $derived(viewport.current.zoom < INTERFACE_TAG_TEXT_MIN_ZOOM);
  const typeName = (dataType: string): string => getDataTypeDisplayText(checker, dataType);

  const tags = $derived(interfaceTagModels(workflow));

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
          {compact}
          class="nodrag nopan"
          role="img"
          aria-label={m().workflowInterface.tagAria({
            id: tag.entry.id,
            type: typeText,
            direction: tag.direction
          })}
          data-testid="interface-tag"
          data-interface-id={tag.entry.id}
          data-interface-direction={tag.direction}
          ondblclick={() => editable && onrename(tag)}
          oncontextmenu={(event: MouseEvent) => {
            if (!editable) return;
            event.preventDefault();
            event.stopPropagation();
            onmenu(tag, event);
          }}
        />
      {/if}
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

<script lang="ts">
  import type { NodeConfig } from "../types/index.js";
  import Icon from "@iconify/svelte";
  import { marked } from "marked";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  const props = $props<{
    data: {
      label: string;
      config: NodeConfig;
      metadata: any;
      nodeId?: string;
    };
    selected?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
    isEditing?: boolean;
  }>();

  // Internal state for edit mode
  let isInternalEditing = $state(false);

  // Reactive values that update when props change
  let noteContent = $state((props.data.config?.content as string) || "Add your notes here...");
  let noteType = $state((props.data.config?.noteType as string) || "info");

  // Update reactive values when props change
  $effect(() => {
    const newContent = (props.data.config?.content as string) || "Add your notes here...";
    const newType = (props.data.config?.noteType as string) || "info";
    
    if (noteContent !== newContent) {
      noteContent = newContent;
    }
    if (noteType !== newType) {
      noteType = newType;
    }
  });

  // Note type configuration
  const noteTypes = {
    info: {
      name: "Info",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      iconColor: "text-blue-500",
      icon: "mdi:information"
    },
    warning: {
      name: "Warning",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-500",
      icon: "mdi:alert"
    },
    success: {
      name: "Success",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      iconColor: "text-green-500",
      icon: "mdi:check-circle"
    },
    error: {
      name: "Error",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      iconColor: "text-red-500",
      icon: "mdi:close-circle"
    },
    note: {
      name: "Note",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-gray-800",
      iconColor: "text-gray-500",
      icon: "mdi:note-text"
    }
  };

  // Reactive derived values
  let currentType = $derived(noteTypes[noteType as keyof typeof noteTypes] || noteTypes.info);
  let renderedContent = $derived(marked.parse(noteContent));

  // Handle content updates
  function handleContentChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    noteContent = target.value;
    if (props.data.config) {
      props.data.config.content = target.value;
      // Dispatch event to notify parent of config change
      dispatch("configChange", { config: props.data.config });
    }
  }

  // Handle note type changes
  function handleTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    noteType = target.value;
    if (props.data.config) {
      props.data.config.noteType = target.value;
      // Dispatch event to notify parent of config change
      dispatch("configChange", { config: props.data.config });
    }
  }

  // Toggle edit mode
  function toggleEditMode() {
    isInternalEditing = !isInternalEditing;
    // Dispatch event to notify parent of state change
    dispatch("editModeChange", { isEditing: isInternalEditing });
  }
</script>

<div
  class="flowdrop-notes-node {currentType.bgColor}"
  class:flowdrop-notes-node--selected={props.selected}
  class:flowdrop-notes-node--processing={props.isProcessing}
  class:flowdrop-notes-node--error={props.isError}
>
  {#if isInternalEditing || props.isEditing}
    <!-- Edit Mode -->
    <div class="flowdrop-notes-node__edit">
      <!-- Note Type Selector -->
      <div class="flowdrop-notes-node__type-selector">
        <label for="note-type" class="flowdrop-notes-node__label">Note Type:</label>
        <select
          id="note-type"
          class="flowdrop-notes-node__select"
          value={noteType}
          on:change={handleTypeChange}
        >
          {#each Object.entries(noteTypes) as [key, type]}
            <option value={key}>{type.name}</option>
          {/each}
        </select>
      </div>

      <!-- Markdown Textarea -->
      <div class="flowdrop-notes-node__textarea-container">
        <label for="note-content" class="flowdrop-notes-node__label">Content (Markdown):</label>
        <textarea
          id="note-content"
          class="flowdrop-notes-node__textarea"
          placeholder="Write your note in Markdown..."
          value={noteContent}
          on:input={handleContentChange}
        ></textarea>
      </div>

      <!-- Save/Cancel Buttons -->
      <div class="flowdrop-notes-node__edit-actions">
        <button
          class="flowdrop-notes-node__btn flowdrop-notes-node__btn--save"
          on:click={toggleEditMode}
        >
          <Icon icon="mdi:check" />
          Save
        </button>
        <button
          class="flowdrop-notes-node__btn flowdrop-notes-node__btn--cancel"
          on:click={toggleEditMode}
        >
          <Icon icon="mdi:close" />
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <!-- Display Mode -->
    <div
      class="flowdrop-notes-node__content {currentType.borderColor} {currentType.textColor}"
    >
      <!-- Header with icon, type, and edit button -->
      <div class="flowdrop-notes-node__header">
        <div class="flowdrop-notes-node__header-left">
          <Icon
            icon={currentType.icon}
            class="flowdrop-notes-node__icon {currentType.iconColor}"
          />
          <span class="flowdrop-notes-node__type">{currentType.name}</span>
        </div>
        <button
          class="flowdrop-notes-node__edit-btn"
          on:click={toggleEditMode}
          title="Edit note"
        >
          <Icon icon="mdi:pencil" />
        </button>
      </div>

      <!-- Rendered markdown content -->
      <div class="flowdrop-notes-node__body">
        <div class="flowdrop-notes-node__markdown">{@html renderedContent}</div>
      </div>

      <!-- Processing indicator -->
      {#if props.isProcessing}
        <div class="flowdrop-notes-node__processing">
          <div class="flowdrop-notes-node__spinner"></div>
          <span>Processing...</span>
        </div>
      {/if}

      <!-- Error indicator -->
      {#if props.isError}
        <div class="flowdrop-notes-node__error">
          <Icon icon="mdi:alert-circle" class="flowdrop-notes-node__error-icon" />
          <span>Error occurred</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .flowdrop-notes-node {
    min-width: var(--notes-node-min-width);
    max-width: var(--notes-node-max-width);
    width: var(--notes-node-width);
    border-radius: var(--notes-node-border-radius);
    border: 1px solid;
    background: var(--notes-node-background);
    backdrop-filter: var(--notes-node-backdrop-filter);
    box-shadow: var(--notes-node-box-shadow);
    transition: var(--notes-node-transition);
    overflow: hidden;
    z-index: 5;
  }

  /* Background color overrides for different note types */
  .flowdrop-notes-node.bg-blue-50 {
    background-color: var(--notes-node-info-bg);
    border-color: var(--notes-node-info-border);
  }

  .flowdrop-notes-node.bg-yellow-50 {
    background-color: var(--notes-node-warning-bg);
    border-color: var(--notes-node-warning-border);
  }

  .flowdrop-notes-node.bg-green-50 {
    background-color: var(--notes-node-success-bg);
    border-color: var(--notes-node-success-border);
  }

  .flowdrop-notes-node.bg-red-50 {
    background-color: var(--notes-node-error-bg);
    border-color: var(--notes-node-error-border);
  }

  .flowdrop-notes-node.bg-gray-50 {
    background-color: var(--notes-node-note-bg);
    border-color: var(--notes-node-note-border);
  }

  .flowdrop-notes-node:hover {
    box-shadow: var(--notes-node-hover-box-shadow);
    transform: translateY(-1px);
  }

  .flowdrop-notes-node--selected {
    box-shadow: var(--notes-node-selected-box-shadow);
  }

  .flowdrop-notes-node--processing {
    opacity: 0.7;
  }

  .flowdrop-notes-node--error {
    border-color: #ef4444 !important;
  }

  /* Edit Mode Styles */
  .flowdrop-notes-node__edit {
    padding: var(--notes-node-padding);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .flowdrop-notes-node__type-selector {
    margin-bottom: 1rem;
    flex-shrink: 0;
  }

  .flowdrop-notes-node__label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #374151;
  }

  .flowdrop-notes-node__select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background-color: white;
  }

  .flowdrop-notes-node__textarea-container {
    margin-bottom: 1rem;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .flowdrop-notes-node__textarea {
    width: 100%;
    min-height: 120px;
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    line-height: 1.5;
    resize: none; /* Prevent resizing to maintain consistent size */
    background-color: white;
  }

  .flowdrop-notes-node__textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .flowdrop-notes-node__edit-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .flowdrop-notes-node__btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    border: 1px solid;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  .flowdrop-notes-node__btn--save {
    background-color: #10b981;
    border-color: #10b981;
    color: white;
  }

  .flowdrop-notes-node__btn--save:hover {
    background-color: #059669;
    border-color: #059669;
  }

  .flowdrop-notes-node__btn--cancel {
    background-color: transparent;
    border-color: #d1d5db;
    color: #374151;
  }

  .flowdrop-notes-node__btn--cancel:hover {
    background-color: #f3f4f6;
    border-color: #9ca3af;
  }

  /* Display Mode Styles */
  .flowdrop-notes-node__content {
    padding: var(--notes-node-padding);
    border-radius: var(--notes-node-border-radius);
    border: 1px solid;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .flowdrop-notes-node__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-shrink: 0;
  }

  .flowdrop-notes-node__header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .flowdrop-notes-node__edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: transparent;
    color: currentColor;
    opacity: 0.7;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s ease-in-out;
  }

  .flowdrop-notes-node__edit-btn:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }

  .flowdrop-notes-node__icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  .flowdrop-notes-node__type {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .flowdrop-notes-node__body {
    margin-bottom: 0.5rem;
    flex: 1;
    overflow-y: auto;
  }

  .flowdrop-notes-node__markdown {
    line-height: 1.6;
  }

  .flowdrop-notes-node__markdown h1,
  .flowdrop-notes-node__markdown h2,
  .flowdrop-notes-node__markdown h3,
  .flowdrop-notes-node__markdown h4,
  .flowdrop-notes-node__markdown h5,
  .flowdrop-notes-node__markdown h6 {
    margin: 0.75rem 0 0.5rem 0;
    font-weight: 600;
  }

  .flowdrop-notes-node__markdown h1 { font-size: 1.5rem; }
  .flowdrop-notes-node__markdown h2 { font-size: 1.25rem; }
  .flowdrop-notes-node__markdown h3 { font-size: 1.125rem; }

  .flowdrop-notes-node__markdown p {
    margin: 0.5rem 0;
  }

  .flowdrop-notes-node__markdown ul,
  .flowdrop-notes-node__markdown ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .flowdrop-notes-node__markdown li {
    margin: 0.25rem 0;
  }

  .flowdrop-notes-node__markdown code {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
  }

  .flowdrop-notes-node__markdown pre {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }

  .flowdrop-notes-node__markdown blockquote {
    border-left: 3px solid currentColor;
    padding-left: 1rem;
    margin: 0.5rem 0;
    opacity: 0.8;
  }

  .flowdrop-notes-node__processing {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .flowdrop-notes-node__spinner {
    width: 0.75rem;
    height: 0.75rem;
    border: 1px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .flowdrop-notes-node__error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #ef4444;
  }

  .flowdrop-notes-node__error-icon {
    width: 0.75rem;
    height: 0.75rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .flowdrop-notes-node {
      min-width: 200px;
      max-width: 350px;
    }

    .flowdrop-notes-node__edit,
    .flowdrop-notes-node__content {
      padding: 0.75rem;
    }

    .flowdrop-notes-node__textarea {
      min-height: 100px;
    }
  }
</style> 
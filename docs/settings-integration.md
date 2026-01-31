# Settings Integration Guide

This document describes how to integrate user settings into FlowDrop components.

## Overview

The settings system provides a unified store (`settingsStore`) with five categories:

| Category | Store | Purpose |
|----------|-------|---------|
| Theme | `themeSettings` | Light/dark/auto mode |
| Editor | `editorSettings` | Canvas behavior (grid, minimap, zoom) |
| UI | `uiSettings` | Layout preferences (sidebar, panels) |
| Behavior | `behaviorSettings` | Auto-save, confirmations |
| API | `apiSettings` | Request timeout, retry logic |

## Current Status

- **Theme**: Fully integrated in `+layout.svelte`
- **Editor/UI/Behavior/API**: Infrastructure ready, component integration pending

---

## Integration Examples

### 1. Editor Settings → WorkflowEditor.svelte

```svelte
<script lang="ts">
  import { SvelteFlow, MiniMap, Background } from "@xyflow/svelte";
  import { editorSettings } from "$lib/stores/settingsStore.js";
  
  // Derive snap grid from settings
  const snapGrid = $derived(
    $editorSettings.snapToGrid 
      ? [$editorSettings.gridSize, $editorSettings.gridSize] as [number, number]
      : undefined
  );
</script>

<SvelteFlow
  {nodes}
  {edges}
  snapGrid={snapGrid}
  fitView={$editorSettings.fitViewOnLoad}
  defaultViewport={{ zoom: $editorSettings.defaultZoom, x: 0, y: 0 }}
>
  {#if $editorSettings.showMinimap}
    <MiniMap />
  {/if}
  
  {#if $editorSettings.showGrid}
    <Background variant="dots" gap={$editorSettings.gridSize} />
  {/if}
</SvelteFlow>
```

**Settings mapping:**

| Setting | SvelteFlow Prop/Component |
|---------|--------------------------|
| `showGrid` | Conditionally render `<Background>` |
| `snapToGrid` + `gridSize` | `snapGrid={[size, size]}` |
| `showMinimap` | Conditionally render `<MiniMap>` |
| `defaultZoom` | `defaultViewport.zoom` |
| `fitViewOnLoad` | `fitView` prop |

---

### 2. UI Settings → NodeSidebar.svelte

```svelte
<script lang="ts">
  import { uiSettings, updateSettings } from "$lib/stores/settingsStore.js";
  
  function toggleSidebar() {
    updateSettings({ ui: { sidebarCollapsed: !$uiSettings.sidebarCollapsed } });
  }
</script>

<aside 
  class="node-sidebar"
  class:node-sidebar--collapsed={$uiSettings.sidebarCollapsed}
  class:node-sidebar--compact={$uiSettings.compactMode}
  style:width="{$uiSettings.sidebarCollapsed ? 48 : $uiSettings.sidebarWidth}px"
>
  <button class="collapse-toggle" onclick={toggleSidebar}>
    <Icon icon={$uiSettings.sidebarCollapsed ? "mdi:chevron-right" : "mdi:chevron-left"} />
  </button>
  
  {#if !$uiSettings.sidebarCollapsed}
    <!-- Full sidebar content -->
  {/if}
</aside>

<style>
  .node-sidebar {
    transition: width 0.2s ease;
  }
  
  .node-sidebar--compact {
    --spacing: 0.5rem;  /* Reduced spacing */
  }
</style>
```

---

### 3. UI Settings → ConfigPanel.svelte

```svelte
<script lang="ts">
  import { uiSettings } from "$lib/stores/settingsStore.js";
</script>

<div 
  class="config-panel"
  class:config-panel--bottom={$uiSettings.configPanelPosition === "bottom"}
  class:config-panel--right={$uiSettings.configPanelPosition === "right"}
  class:config-panel--compact={$uiSettings.compactMode}
>
  <!-- Panel content -->
</div>

<style>
  .config-panel--right {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 320px;
  }
  
  .config-panel--bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 300px;
  }
</style>
```

---

### 4. Behavior Settings → Auto-save

In `workflowStore.ts` or a dedicated auto-save service:

```typescript
import { behaviorSettings } from "$lib/stores/settingsStore.js";
import { isDirtyStore, workflowStore } from "./workflowStore.js";
import { get } from "svelte/store";

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize auto-save based on settings
 */
export function initAutoSave(saveCallback: () => Promise<void>): () => void {
  // Clean up any existing timer
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }

  // Subscribe to setting changes
  const unsubscribe = behaviorSettings.subscribe(($behavior) => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }

    // Start new timer if auto-save is enabled
    if ($behavior.autoSave) {
      autoSaveTimer = setInterval(async () => {
        const isDirty = get(isDirtyStore);
        if (isDirty) {
          try {
            await saveCallback();
            console.log("Auto-saved workflow");
          } catch (error) {
            console.error("Auto-save failed:", error);
          }
        }
      }, $behavior.autoSaveInterval);
    }
  });

  // Return cleanup function
  return () => {
    unsubscribe();
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
    }
  };
}
```

---

### 5. Behavior Settings → Confirm Delete

```svelte
<script lang="ts">
  import { behaviorSettings } from "$lib/stores/settingsStore.js";
  import { deleteNodes } from "$lib/stores/workflowStore.js";

  function handleDeleteNode(nodeId: string) {
    if ($behaviorSettings.confirmDelete) {
      const confirmed = confirm("Are you sure you want to delete this node?");
      if (!confirmed) {
        return;
      }
    }
    deleteNodes([nodeId]);
  }
</script>
```

---

### 6. API Settings → Request Configuration

```typescript
import { apiSettings } from "$lib/stores/settingsStore.js";
import { get } from "svelte/store";

/**
 * Make an API request with settings-based configuration
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const $api = get(apiSettings);
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), $api.timeout);
  
  const maxAttempts = $api.retryEnabled ? $api.retryAttempts : 1;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort (timeout)
      if (controller.signal.aborted) {
        throw new Error(`Request timeout after ${$api.timeout}ms`);
      }
      
      // Don't retry on last attempt
      if (attempt >= maxAttempts) {
        break;
      }
      
      // Exponential backoff: 1s, 2s, 4s...
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError ?? new Error("Request failed");
}
```

---

## Testing Settings Integration

```typescript
import { updateSettings, getSettings, resetSettings } from "$lib/stores/settingsStore.js";

// Set specific settings for testing
updateSettings({
  editor: { showMinimap: false, snapToGrid: false },
  behavior: { confirmDelete: false }
});

// Verify current settings
const settings = getSettings();
console.log(settings.editor.showMinimap); // false

// Reset to defaults
resetSettings(["editor"]); // Reset only editor category
resetSettings(); // Reset all categories
```

---

## Best Practices

1. **Use derived stores** - Import `editorSettings` not `settingsStore` for better reactivity
2. **Don't mutate directly** - Always use `updateSettings()` to ensure persistence
3. **Handle defaults** - Settings may be partially defined; use defaults as fallback
4. **Clean up subscriptions** - Unsubscribe in `onDestroy` if manually subscribing
5. **Test with different values** - Verify components work with non-default settings

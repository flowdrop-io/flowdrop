---
title: Icons
description: How FlowDrop uses Iconify for icons across nodes, categories, and UI.
---

FlowDrop uses [Iconify](https://iconify.design/) for all icons throughout the editor — node icons, category icons, status indicators, and toolbar actions.

## How it works

Icons are rendered via [`@iconify/svelte`](https://iconify.design/docs/icon-components/svelte/), which is listed as an **optional peer dependency**. When installed, the Iconify component fetches icons on demand from the Iconify API, giving you access to **200,000+ icons** from 150+ open-source sets with zero bundling overhead.

Install it alongside FlowDrop:

```bash
npm install @iconify/svelte
```

## Icon format

All icon fields in FlowDrop use the Iconify string format:

```
set:icon-name
```

For example:

```js
'mdi:brain'           // Material Design Icons
'heroicons:sparkles'  // Heroicons
'lucide:bot'          // Lucide
'ph:brain'            // Phosphor Icons
'tabler:api'          // Tabler Icons
```

You can browse and search all available icon sets at **[icon-sets.iconify.design](https://icon-sets.iconify.design/)**.

## Where icons are used

Icons appear in several places within FlowDrop:

| Context | Field | Example |
|---------|-------|---------|
| Node definition | `icon` | `'mdi:text'` |
| Category definition | `icon` | `'mdi:import'` |
| Status indicators | (internal) | `'mdi:check-circle'` |
| Toolbar & UI actions | (internal) | `'mdi:content-save'` |

### Node icons

Set the `icon` field on a node definition:

```js
const myNode = {
  id: 'text_input',
  name: 'Text Input',
  icon: 'mdi:text',       // Any Iconify icon
  // ...
};
```

FlowDrop resolves icons with a fallback chain:
1. The node's own `icon` field
2. The category's icon
3. Default fallback: `mdi:cube`

### Category icons

Set the `icon` field on a category definition:

```js
const myCategory = {
  id: 'inputs',
  name: 'Inputs',
  icon: 'mdi:import',
  color: '#22c55e'
};
```

## Built-in default icons

FlowDrop includes a set of built-in icon constants used across the editor UI. These are not required for your own nodes — they document what the editor uses internally.

### UI action icons

| Key | Icon | Usage |
|-----|------|-------|
| `ADD` | `mdi:plus` | Add buttons |
| `REMOVE` | `mdi:minus` | Remove buttons |
| `EDIT` | `mdi:pencil` | Edit actions |
| `SAVE` | `mdi:content-save` | Save workflow |
| `EXPORT` | `mdi:download` | Export actions |
| `IMPORT` | `mdi:upload` | Import actions |
| `SEARCH` | `mdi:magnify` | Search fields |
| `CLOSE` | `mdi:close` | Close buttons |
| `SETTINGS` | `mdi:cog` | Settings panel |

### Status icons

| Status | Icon |
|--------|------|
| Idle | `mdi:circle-outline` |
| Pending | `mdi:clock-outline` |
| Running | `mdi:loading` |
| Completed | `mdi:check-circle` |
| Failed | `mdi:alert-circle` |
| Cancelled | `mdi:cancel` |
| Skipped | `mdi:skip-next` |

### Built-in category icons

When you define categories, you can use any icon you like. For reference, these are the icons FlowDrop uses for common category IDs:

| Category ID | Icon |
|-------------|------|
| `triggers` | `mdi:lightning-bolt` |
| `inputs` | `mdi:arrow-down-circle` |
| `outputs` | `mdi:arrow-up-circle` |
| `prompts` | `mdi:message-text` |
| `models` | `mdi:robot` |
| `processing` | `mdi:cog` |
| `logic` | `mdi:source-branch` |
| `data` | `mdi:database` |
| `tools` | `mdi:wrench` |
| `ai` | `mdi:shimmer` |
| `agents` | `mdi:account-cog` |
| `memories` | `mdi:brain` |
| `interrupts` | `mdi:hand-back-left` |

## Icon validation

FlowDrop validates icon strings against the format `set:icon-name` (lowercase letters and hyphens). Invalid icons fall back to `mdi:cube`.

```js
'mdi:brain'       // ✓ valid
'heroicons:bolt'  // ✓ valid
'Brain'           // ✗ invalid — falls back to mdi:cube
```

## Popular icon sets

Here are some commonly used icon sets that work well with FlowDrop:

| Set | Prefix | Icons | Browse |
|-----|--------|-------|--------|
| Material Design Icons | `mdi:` | 7,000+ | [Browse](https://icon-sets.iconify.design/mdi/) |
| Heroicons | `heroicons:` | 300+ | [Browse](https://icon-sets.iconify.design/heroicons/) |
| Lucide | `lucide:` | 1,500+ | [Browse](https://icon-sets.iconify.design/lucide/) |
| Phosphor | `ph:` | 7,000+ | [Browse](https://icon-sets.iconify.design/ph/) |
| Tabler Icons | `tabler:` | 5,000+ | [Browse](https://icon-sets.iconify.design/tabler/) |
| Carbon | `carbon:` | 2,000+ | [Browse](https://icon-sets.iconify.design/carbon/) |

The full catalog is at [icon-sets.iconify.design](https://icon-sets.iconify.design/).

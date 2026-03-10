---
title: "Changelog & Migration"
description: "What's new in 1.0.0 and how to upgrade from 0.0.x."
---

import { Aside, Steps } from '@astrojs/starlight/components';

This guide covers all breaking changes when upgrading from `@flowdrop/flowdrop` 0.0.x to 1.0.0.

<Aside type="tip">
1.0.0 is the first stable release. The API is now considered production-ready and will follow semantic versioning for future changes.
</Aside>

## What's New in 1.0.0

1.0.0 is the first stable release. Key additions since 0.0.x:

- **Stable public API** — `mountFlowDropApp()`, `mountWorkflowEditor()`, `mountPlayground()` with semantic versioning guarantees
- **Agent Spec support** — Import/export [Agent Spec](https://github.com/oracle/agent-spec) format
- **Human-in-the-Loop interrupts** — Five interrupt types: confirmation, choice, text input, form, review
- **Interactive Playground** — Built-in workflow testing UI with session management
- **Plugin system** — `registerFlowDropPlugin()` and `createPlugin()` for multi-node registration
- **Programmatic API** — `WorkflowAdapter` for creating and manipulating workflows in code
- **History transactions** — Group changes into one undo step with `historyActions.startTransaction()`
- **Template variables** — `format: "template"` fields with port-aware autocomplete
- **Dynamic port config** — Runtime port compatibility via `/port-config` API endpoint

## Breaking Changes in 0.0.64

### `variableSchema` prop removed

The deprecated `variableSchema` prop on `FormTemplateEditor` has been removed.

**Before:**
```svelte
<FormTemplateEditor variableSchema={schema} />
```

**After:**
```svelte
<FormTemplateEditor variables={{ schema }} />
```

### `options` field removed from schemas

The deprecated `options` property on field schemas has been removed. Use JSON Schema standard `oneOf` instead.

**Before:**
```json
{
  "status": {
    "type": "string",
    "options": [
      { "value": "pending", "label": "Pending" },
      { "value": "active", "label": "Active" }
    ]
  }
}
```

**After:**
```json
{
  "status": {
    "type": "string",
    "oneOf": [
      { "const": "pending", "title": "Pending" },
      { "const": "active", "title": "Active" }
    ]
  }
}
```

### CodeMirror moved to optional peer dependencies

`@codemirror/*` packages are no longer bundled. If you use `form/code` or `form/markdown` modules, install them manually:

```bash
npm install codemirror @codemirror/state @codemirror/view @codemirror/commands \
  @codemirror/language @codemirror/theme-one-dark @codemirror/autocomplete \
  @codemirror/lang-json @codemirror/lang-markdown @codemirror/lint
```

### `@xyflow/svelte` moved to peer dependency

Previously bundled as a direct dependency, `@xyflow/svelte` is now a peer dependency. Install it directly:

```bash
npm install @xyflow/svelte
```

## Breaking Changes in 0.0.62

### Svelte 5 runes store migration

All stores migrated from Svelte 4 `writable` to Svelte 5 runes (`$state`/`$derived`).

**Before (Svelte 4):**
```typescript
import { get } from 'svelte/store';
const value = get(someStore);
// or
$: reactiveValue = $someStore;
```

**After (Svelte 5):**
```typescript
// Use $derived in components
const value = $derived(getStoreValue());
```

### Window globals removed

`window.flowdrop` and similar globals have been removed. Use the explicit API:

**Before:**
```javascript
window.flowdrop.save();
```

**After:**
```javascript
const app = await mountFlowDropApp(container, options);
app.save();
```

### `@sveltejs/kit` removed from peer dependencies

If you were relying on SvelteKit as a transitive dependency from FlowDrop, add it to your own `package.json`.

### CSS custom properties renamed

Old numbered spacing aliases have been replaced with named tokens:

| Old | New |
|-----|-----|
| `--fd-space-1` | `--fd-space-3xs` |
| `--fd-space-2` | `--fd-space-xs` |
| `--fd-space-3` | `--fd-space-sm` |
| `--fd-space-4` | `--fd-space-md` |
| (etc.) | (etc.) |

### Node component naming normalized

Component imports have been normalized. Check your imports if you reference node components directly (e.g., `GatewayNode`, `ToolNode`).

### TypeScript strict mode enabled

All source files now compile under `strict: true`. This may surface type errors in consumer code that was relying on implicit `any` types.

## Upgrade Steps

<Steps>
1. Update the package:
   ```bash
   npm install @flowdrop/flowdrop@^1.0.0 @xyflow/svelte@^1.2
   ```

2. Replace `variableSchema` with `variables.schema` on any `FormTemplateEditor` usage.

3. Replace `options` with `oneOf` in field schemas (change `value`/`label` to `const`/`title`).

4. If using `form/code` or `form/markdown`, install CodeMirror peer dependencies.

5. Replace any `window.flowdrop` usage with the `mountFlowDropApp()` return value.

6. Update CSS custom property names from numbered to named tokens.

7. Run your TypeScript build to catch any strict-mode type errors.
</Steps>

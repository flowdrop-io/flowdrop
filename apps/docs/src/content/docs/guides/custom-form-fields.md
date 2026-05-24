---
title: Custom Form Fields
description: Extend FlowDrop's form system with custom field components.
---

FlowDrop generates configuration forms automatically from JSON Schema. The field registry system lets you add custom field components — for example a color picker, date picker, or rich text editor.

## Quick Start

**1. Write a Svelte field component:**

```svelte
<!-- ColorPickerField.svelte -->
<script lang="ts">
  interface Props {
    id: string;
    value: unknown;
    onChange: (value: unknown) => void;
  }

  let { id, value, onChange }: Props = $props();
</script>

<input
  {id}
  type="color"
  value={String(value ?? '#000000')}
  oninput={(e) => onChange(e.currentTarget.value)}
/>
```

**2. Register it:**

```typescript
import { registerFieldComponent } from '@flowdrop/flowdrop/form';
import ColorPickerField from './ColorPickerField.svelte';

registerFieldComponent(
  'color-picker',
  ColorPickerField,
  (schema) => schema.format === 'color',
  100
);
```

**3. Use it in a config schema:**

```json
{
  "accentColor": {
    "type": "string",
    "format": "color",
    "title": "Accent Color",
    "default": "#3b82f6"
  }
}
```

## How It Works

When `FormFieldLight` renders a field, it:

1. Calls `resolveFieldComponent(schema)` to check the registry
2. If a registered matcher returns `true`, renders the registered component
3. Otherwise falls back to built-in fields (text, number, toggle, select, etc.)

Registrations are **priority-ordered** — higher priority matchers are checked first.

## Field Component Props

Your component receives these props:

```typescript
interface Props {
  id: string;
  value: unknown;
  placeholder?: string;
  required?: boolean;
  ariaDescribedBy?: string;
  onChange: (value: unknown) => void;
}
```

Only the props listed above are guaranteed. Read any additional schema properties (like `schema.minDate`) directly from the schema via the form context — see [Reading sibling field values](#reading-sibling-field-values) below.

## Matcher Functions

A matcher decides whether your component handles a given schema:

```typescript
// Match by format
(schema) => schema.format === "color"

// Match by type + format
(schema) => schema.type === "string" && schema.format === "rich-text"

// Match by custom property
(schema) => schema.widget === "my-widget"
```

## Priority-Based Resolution

When multiple registrations match, the highest priority wins:

```typescript
// Priority 50 — general fallback
registerFieldComponent('text-basic', BasicTextField, (schema) => schema.type === 'string', 50);

// Priority 100 — more specific, checked first
registerFieldComponent(
  'rich-text',
  RichTextField,
  (schema) => schema.type === 'string' && schema.format === 'rich-text',
  100
);
```

You can use this to **override built-in fields** by registering your own component with a higher priority.

## Lazy Registration

For heavy dependencies, use dynamic imports:

```typescript
let registered = false;

export function registerMyHeavyField(priority = 100): void {
  if (registered) return;

  import('./MyHeavyField.svelte').then((module) => {
    registerFieldComponent(
      'my-heavy-field',
      module.default,
      (schema) => schema.format === 'heavy',
      priority
    );
    registered = true;
  });
}
```

## Built-in Field Types

These fields are always available without registration:

| Schema                                        | Renders as                  |
| --------------------------------------------- | --------------------------- |
| `type: "string"`                              | Text input                  |
| `type: "string", format: "multiline"`         | Textarea                    |
| `type: "number"` or `type: "integer"`         | Number input                |
| `type: "number", format: "range"`             | Range slider                |
| `type: "boolean"`                             | Toggle switch               |
| `type: "string", enum: [...]`                 | Select dropdown             |
| `type: "string", enum: [...], multiple: true` | Checkbox group              |
| `type: "string", oneOf: [{const, title}]`     | Select with labeled options |
| `type: "array", items: {...}`                 | Dynamic list                |
| `format: "hidden"`                            | Hidden (not rendered)       |

These require explicit registration (heavy dependencies):

| Schema                               | Import path                        | Registration function           |
| ------------------------------------ | ---------------------------------- | ------------------------------- |
| `format: "json"` or `format: "code"` | `@flowdrop/flowdrop/form/code`     | `registerCodeEditorField()`     |
| `format: "template"`                 | `@flowdrop/flowdrop/form/code`     | `registerTemplateEditorField()` |
| `format: "markdown"`                 | `@flowdrop/flowdrop/form/markdown` | `registerMarkdownEditorField()` |

## Field Management

```typescript
import {
  unregisterFieldComponent,
  getRegisteredFieldTypes,
  isFieldTypeRegistered,
  clearFieldRegistry,
  getFieldRegistrySize
} from '@flowdrop/flowdrop/form';

unregisterFieldComponent('color-picker');
getRegisteredFieldTypes(); // ["color-picker", ...]
isFieldTypeRegistered('color-picker'); // true or false
getFieldRegistrySize(); // number of registrations
clearFieldRegistry(); // clear all (useful in tests)
```

## Reading Sibling Field Values

Custom components registered for `format: "autocomplete"` fields receive the full `schema` object as a prop and can read the current values of other fields in the same form using the `FORM_VALUES_KEY` context.

This is the building block for dependent autocomplete fields — for example a `project` field whose suggestions depend on the currently selected `account`.

**1. Define the schema** — use any custom property to declare the dependency:

```json
{
  "account": { "type": "string", "title": "Account" },
  "project": {
    "type": "string",
    "format": "autocomplete",
    "title": "Project",
    "autocomplete": { "url": "/api/projects", "labelField": "name", "valueField": "id" },
    "dependencies": { "account": "account" }
  }
}
```

**2. Write the component** — wrap `FormAutocomplete` and patch the URL:

```svelte
<!-- DependentAutocomplete.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import { FormAutocomplete } from '@flowdrop/flowdrop/form/autocomplete';
  import { FORM_VALUES_KEY, type FormValuesGetter, type FieldSchema } from '@flowdrop/flowdrop/form';
  import type { AutocompleteConfig } from '@flowdrop/flowdrop';

  interface Props {
    id: string;
    value: unknown;
    schema: FieldSchema;
    autocomplete: AutocompleteConfig;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    ariaDescribedBy?: string;
    onChange: (value: unknown) => void;
  }

  let { schema, autocomplete, ...rest }: Props = $props();

  const getFormValues = getContext<FormValuesGetter | undefined>(FORM_VALUES_KEY);

  const patchedAutocomplete = $derived.by(() => {
    const values = getFormValues?.() ?? {};
    const deps = (schema as any).dependencies as Record<string, string> | undefined;
    if (!deps) return autocomplete;

    const extra = Object.entries(deps)
      .filter(([, field]) => values[field] != null && values[field] !== '')
      .map(([param, field]) => `${encodeURIComponent(param)}=${encodeURIComponent(String(values[field]))}`)
      .join('&');

    const sep = autocomplete.url.includes('?') ? '&' : '?';
    return { ...autocomplete, url: extra ? `${autocomplete.url}${sep}${extra}` : autocomplete.url };
  });
</script>

<FormAutocomplete autocomplete={patchedAutocomplete} {...rest} />
```

**3. Register it** — match on the custom `dependencies` property:

```typescript
import { fieldComponentRegistry } from '@flowdrop/flowdrop/form';
import DependentAutocomplete from './DependentAutocomplete.svelte';

fieldComponentRegistry.register({
  name: 'dependent-autocomplete',
  component: DependentAutocomplete,
  matcher: (schema) => schema.format === 'autocomplete' && 'dependencies' in schema,
  priority: 150
});
```

The registered component is only activated when a schema has both `format: "autocomplete"` and a `dependencies` property. All other autocomplete fields continue to use FlowDrop's built-in `FormAutocomplete`.

## Corrections

- **2026-05-24** — Fixed `FormAutocomplete` import example to use the named import (`import { FormAutocomplete } from '@flowdrop/flowdrop/form/autocomplete'`). The default-import form shown previously never worked — the module only exposes a named export.

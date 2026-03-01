# Custom Form Fields

FlowDrop generates configuration forms automatically from JSON Schema definitions. The field registry system lets you add custom form field components — for example a color picker, date picker, or rich text editor — that render when a field's schema matches your criteria.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Writing a Custom Field Component](#writing-a-custom-field-component)
- [Registering Custom Fields](#registering-custom-fields)
  - [registerFieldComponent — Function API](#registerfieldcomponent--function-api)
  - [fieldComponentRegistry — Class API](#fieldcomponentregistry--class-api)
- [Matcher Functions](#matcher-functions)
- [Priority-Based Resolution](#priority-based-resolution)
- [Using Custom Fields in Config Schema](#using-custom-fields-in-config-schema)
- [Lazy Registration](#lazy-registration)
- [Built-in Field Types](#built-in-field-types)
- [Built-in Matchers](#built-in-matchers)
- [Field Management](#field-management)
- [API Reference](#api-reference)

---

## Overview

The field registry sits between the config schema and the rendered form. When `FormFieldLight` renders a field, it:

1. Calls `resolveFieldComponent(schema)` to check the registry
2. If a registered matcher returns `true`, renders the registered component
3. Otherwise falls back to built-in fields (text, number, toggle, select, etc.)

Registrations are **priority-ordered** — higher priority matchers are checked first, allowing you to override built-in behavior.

---

## Quick Start

**1. Write a Svelte field component:**

```svelte
<!-- ColorPickerField.svelte -->
<script lang="ts">
  interface Props {
    id: string;
    value: unknown;
    placeholder?: string;
    required?: boolean;
    ariaDescribedBy?: string;
    onChange: (value: unknown) => void;
  }

  let { id, value, onChange }: Props = $props();
</script>

<input
  {id}
  type="color"
  value={String(value ?? "#000000")}
  oninput={(e) => onChange(e.currentTarget.value)}
/>
```

**2. Register it:**

```typescript
import { registerFieldComponent } from "@d34dman/flowdrop/form";
import ColorPickerField from "./ColorPickerField.svelte";

registerFieldComponent(
  "color-picker",
  ColorPickerField,
  (schema) => schema.format === "color",
  100
);
```

**3. Use it in a node's config schema:**

```json
{
  "type": "object",
  "properties": {
    "accentColor": {
      "type": "string",
      "format": "color",
      "title": "Accent Color",
      "default": "#3b82f6"
    }
  }
}
```

The form will now render your `ColorPickerField` component for any field with `format: "color"`.

---

## Writing a Custom Field Component

Your component receives props passed by `FormFieldLight`. At minimum, accept:

```typescript
interface Props {
  /** Field identifier (used for id/name attributes) */
  id: string;
  /** Current field value */
  value: unknown;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** ARIA description ID for accessibility */
  ariaDescribedBy?: string;
  /** Call this when the value changes */
  onChange: (value: unknown) => void;
}
```

`FormFieldLight` also forwards these schema-derived props when present:

| Prop | Source | Description |
| --- | --- | --- |
| `height` | `schema.height` | Editor height (CSS value) |
| `darkTheme` | `schema.darkTheme` or resolved theme | Whether dark mode is active |
| `autoFormat` | `schema.autoFormat` | Auto-format on blur |
| `showToolbar` | `schema.showToolbar` | Show editor toolbar |
| `showStatusBar` | `schema.showStatusBar` | Show status bar |
| `spellChecker` | `schema.spellChecker` | Enable spell checking |
| `variables` | `schema.variables` | Template variable config |
| `placeholderExample` | `schema.placeholderExample` | Placeholder hint |

You can also access **any custom property** you add to the schema, since `FieldSchema` allows additional properties via `[key: string]: unknown`.

### Example: Date picker with custom schema properties

```svelte
<!-- DatePickerField.svelte -->
<script lang="ts">
  interface Props {
    id: string;
    value: unknown;
    required?: boolean;
    ariaDescribedBy?: string;
    minDate?: string;
    maxDate?: string;
    onChange: (value: unknown) => void;
  }

  let { id, value, required = false, minDate, maxDate, onChange }: Props = $props();
</script>

<input
  {id}
  type="date"
  value={String(value ?? "")}
  {required}
  min={minDate}
  max={maxDate}
  oninput={(e) => onChange(e.currentTarget.value)}
/>
```

```typescript
registerFieldComponent(
  "date-picker",
  DatePickerField,
  (schema) => schema.format === "date",
  100
);
```

Schema usage with custom props:

```json
{
  "startDate": {
    "type": "string",
    "format": "date",
    "title": "Start Date",
    "minDate": "2024-01-01",
    "maxDate": "2025-12-31"
  }
}
```

The `minDate` and `maxDate` properties flow through to your component as props.

---

## Registering Custom Fields

### `registerFieldComponent` — Function API

The simplest way to register a custom field:

```typescript
import { registerFieldComponent } from "@d34dman/flowdrop/form";

registerFieldComponent(
  "my-field",        // unique identifier
  MyComponent,       // Svelte component
  matcherFn,         // (schema) => boolean
  100                // priority (default: 0)
);
```

**Signature:**

```typescript
function registerFieldComponent(
  type: string,
  component: FieldComponent,
  matcher: FieldMatcher,
  priority?: number       // default: 0, higher = checked first
): void
```

### `fieldComponentRegistry` — Class API

For more control, use the singleton registry directly:

```typescript
import { fieldComponentRegistry } from "@d34dman/flowdrop/form";

fieldComponentRegistry.register("my-field", {
  component: MyComponent,
  matcher: (schema) => schema.format === "my-format",
  priority: 100
});

// Look up which component handles a schema
const resolved = fieldComponentRegistry.resolveFieldComponent(schema);
if (resolved) {
  // resolved.component is the Svelte component
}
```

---

## Matcher Functions

A matcher is a function that receives a `FieldSchema` and returns `true` if your component should render that field:

```typescript
type FieldMatcher = (schema: FieldSchema) => boolean;
```

You can match on any combination of schema properties:

```typescript
// Match by format
(schema) => schema.format === "color"

// Match by type + format
(schema) => schema.type === "string" && schema.format === "rich-text"

// Match by custom property
(schema) => schema.widget === "my-widget"

// Match by multiple conditions
(schema) => schema.type === "object" && schema.format === "key-value"
```

---

## Priority-Based Resolution

When multiple registrations match the same schema, the one with the **highest priority** wins. The registry checks matchers in descending priority order and returns the first match.

```typescript
// Priority 50 — general fallback
registerFieldComponent("text-basic", BasicTextField,
  (schema) => schema.type === "string", 50);

// Priority 100 — more specific, checked first
registerFieldComponent("rich-text", RichTextField,
  (schema) => schema.type === "string" && schema.format === "rich-text", 100);
```

For a field with `{ type: "string", format: "rich-text" }`, the rich-text component wins because it has higher priority — even though both matchers match.

You can use this to **override built-in fields** by registering your own component with a higher priority.

---

## Using Custom Fields in Config Schema

Custom fields work anywhere a `configSchema` is used — in node configuration panels, in `SchemaForm` standalone usage, or in the config modal.

### In node metadata

```typescript
const nodeMetadata = {
  id: "myapp:styled-box",
  name: "Styled Box",
  // ...
  configSchema: {
    type: "object",
    properties: {
      backgroundColor: {
        type: "string",
        format: "color",
        title: "Background Color",
        default: "#ffffff"
      },
      borderColor: {
        type: "string",
        format: "color",
        title: "Border Color",
        default: "#e5e7eb"
      }
    }
  }
};
```

### In standalone SchemaForm

```svelte
<script>
  import { SchemaForm } from "@d34dman/flowdrop/form";

  const schema = {
    type: "object",
    properties: {
      color: { type: "string", format: "color", title: "Pick a Color" }
    }
  };
</script>

<SchemaForm {schema} values={{ color: "#3b82f6" }} onChange={console.log} />
```

---

## Lazy Registration

For heavy dependencies, use dynamic imports to keep your initial bundle small. This is the same pattern FlowDrop uses internally for CodeMirror-based editors:

```typescript
let registered = false;

export function registerMyHeavyField(priority = 100): void {
  if (registered) return;

  import("./MyHeavyField.svelte").then((module) => {
    registerFieldComponent(
      "my-heavy-field",
      module.default,
      (schema) => schema.format === "heavy",
      priority
    );
    registered = true;
  });
}
```

Call this once at app startup. The dynamic import ensures the component is only bundled when actually registered.

For synchronous registration when you've already imported the component:

```typescript
import MyField from "./MyField.svelte";

registerFieldComponent("my-field", MyField, matcher, 100);
```

---

## Built-in Field Types

These fields are always available without registration:

| Schema | Renders as |
| --- | --- |
| `type: "string"` | Text input |
| `type: "string", format: "multiline"` | Textarea |
| `type: "number"` or `type: "integer"` | Number input |
| `type: "number", format: "range"` | Range slider |
| `type: "boolean"` | Toggle switch |
| `type: "string", enum: [...]` | Select dropdown |
| `type: "string", enum: [...], multiple: true` | Checkbox group |
| `type: "string", oneOf: [{const, title}]` | Select with labeled options |
| `type: "array", items: {...}` | Dynamic list |
| `format: "hidden"` | Hidden (not rendered) |

These require explicit registration (heavy dependencies):

| Schema | Import path | Registration function |
| --- | --- | --- |
| `format: "json"` or `format: "code"` | `@d34dman/flowdrop/form/code` | `registerCodeEditorField()` |
| `format: "template"` | `@d34dman/flowdrop/form/code` | `registerTemplateEditorField()` |
| `format: "markdown"` | `@d34dman/flowdrop/form/markdown` | `registerMarkdownEditorField()` |

If a heavy editor format is used but not registered, `FormFieldLight` shows a helpful fallback message with the required import.

---

## Built-in Matchers

The form module exports reusable matchers you can use as building blocks or reference patterns:

```typescript
import {
  hiddenFieldMatcher,       // schema.format === "hidden"
  textareaMatcher,           // type: "string" + format: "multiline"
  rangeMatcher,              // type: "number"/"integer" + format: "range"
  textFieldMatcher,          // type: "string" (no format)
  numberFieldMatcher,        // type: "number"/"integer" (not range)
  toggleMatcher,             // type: "boolean"
  enumSelectMatcher,         // has enum, not multiple
  checkboxGroupMatcher,      // has enum + multiple: true
  selectOptionsMatcher,      // has oneOf or options
  arrayMatcher,              // type: "array" + has items
  autocompleteMatcher        // format: "autocomplete" + has autocomplete.url
} from "@d34dman/flowdrop/form";
```

---

## Field Management

```typescript
import {
  unregisterFieldComponent,
  getRegisteredFieldTypes,
  isFieldTypeRegistered,
  clearFieldRegistry,
  getFieldRegistrySize
} from "@d34dman/flowdrop/form";

// Remove a field registration
unregisterFieldComponent("color-picker");  // returns true if it existed

// List all registered field type IDs
getRegisteredFieldTypes();  // ["color-picker", "date-picker", ...]

// Check if a specific type is registered
isFieldTypeRegistered("color-picker");  // true or false

// Get total number of registrations
getFieldRegistrySize();  // 2

// Clear all registrations (useful in tests)
clearFieldRegistry();
```

---

## API Reference

### `FieldComponentProps`

Base props interface that all registered field components should accept:

```typescript
interface FieldComponentProps {
  id: string;
  value: unknown;
  placeholder?: string;
  required?: boolean;
  ariaDescribedBy?: string;
  onChange: (value: unknown) => void;
  [key: string]: unknown;         // additional schema properties
}
```

### `FieldMatcher`

```typescript
type FieldMatcher = (schema: FieldSchema) => boolean;
```

### `FieldComponentRegistration`

```typescript
interface FieldComponentRegistration {
  component: FieldComponent;      // Svelte component
  matcher: FieldMatcher;          // Schema matching predicate
  priority: number;               // Higher = checked first
}
```

### `FieldSchema`

The schema object your matcher receives. Key properties:

```typescript
interface FieldSchema {
  type: FieldType | string;
  title?: string;
  description?: string;
  default?: unknown;
  format?: string;                // Main extension point for custom fields
  enum?: unknown[];
  oneOf?: OneOfItem[];
  multiple?: boolean;
  placeholder?: string;
  minimum?: number;
  maximum?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: FieldSchema;
  minItems?: number;
  maxItems?: number;
  readOnly?: boolean;
  autocomplete?: AutocompleteConfig;
  variables?: TemplateVariablesConfig;
  [key: string]: unknown;         // custom properties pass through to component
}
```

### Import paths

| Path | What it provides |
| --- | --- |
| `@d34dman/flowdrop/form` | `registerFieldComponent`, `fieldComponentRegistry`, matchers, `SchemaForm`, all light field components, types |
| `@d34dman/flowdrop/form/code` | `registerCodeEditorField`, `registerTemplateEditorField`, `FormCodeEditor`, `FormTemplateEditor` |
| `@d34dman/flowdrop/form/markdown` | `registerMarkdownEditorField`, `FormMarkdownEditor` |
| `@d34dman/flowdrop/form/full` | Full form module with all editors pre-bundled |

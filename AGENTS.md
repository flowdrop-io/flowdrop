# AGENTS.md - AI Coding Agent Guidelines for FlowDrop

This document provides guidance for AI agents working with the FlowDrop codebase. FlowDrop is a visual workflow editor library built with Svelte 5 and @xyflow/svelte.

## Project Overview

**FlowDrop** is a pure visual workflow editor - not a SaaS platform. Users implement their own backend, control their orchestration, and run workflows on their infrastructure.

```bash
npm install @d34dman/flowdrop
```

### Key Philosophy

- **Frontend Only**: FlowDrop is a UI component library - no hidden backend
- **Backend Agnostic**: Connects to any REST API (Drupal, Laravel, Express, FastAPI, etc.)
- **User Owns Everything**: Data, servers, orchestration, security policies

---

## Technology Stack

| Technology     | Purpose                      |
| -------------- | ---------------------------- |
| Svelte 5       | UI framework with Runes mode |
| SvelteKit      | Application framework        |
| @xyflow/svelte | Flow/graph visualization     |
| TypeScript     | Type safety                  |
| Vite           | Build tool                   |
| Vitest         | Unit/integration testing     |
| Playwright     | E2E testing                  |
| CodeMirror 6   | Code/JSON/Markdown editing   |
| Iconify/Svelte | Icon library                 |

---

## Directory Structure

```
src/
├── lib/                    # Main library code (published to npm)
│   ├── adapters/           # Data transformation (WorkflowAdapter)
│   ├── api/                # API client implementations
│   ├── components/         # Svelte components
│   │   ├── form/           # Form field components (16 files)
│   │   ├── interrupt/      # HITL interrupt prompt components
│   │   ├── nodes/          # Node type components (8 files)
│   │   ├── layouts/        # Layout components
│   │   └── playground/     # Interactive playground components
│   ├── config/             # Configuration (endpoints, port config)
│   ├── core/               # Core exports (zero heavy dependencies)
│   ├── display/            # Display-only components
│   ├── editor/             # Editor module exports
│   ├── form/               # Form module exports
│   ├── helpers/            # Helper utilities
│   ├── mocks/              # App mock providers
│   ├── playground/         # Playground module
│   ├── registry/           # Node component registry
│   ├── services/           # Business logic services
│   ├── stores/             # Svelte stores
│   ├── styles/             # CSS styles
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── mocks/                  # MSW mock data for development
├── routes/                 # SvelteKit routes
└── styles/                 # Global styles

tests/
├── unit/                   # Unit tests
├── integration/            # Integration tests
├── component/              # Component tests
├── e2e/                    # Playwright E2E tests
├── fixtures/               # Test fixtures and mock data
└── utils/                  # Test utilities

docs/                       # Internal documentation
dist/                       # Built package output
build/                      # Built application output
```

---

## Development Commands

```bash
# Development
npm install              # Install dependencies
npm run dev              # Start dev server (port 5173)
npm run build            # Build library + package

# Testing
npm test                 # Run unit/integration tests (Vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright UI mode
npm run test:all         # Run all tests

# Code Quality
npm run lint             # ESLint + Prettier check
npm run format           # Format with Prettier
npm run check            # Svelte type checking

# Storybook
npm run storybook        # Start Storybook (port 6006)
npm run build-storybook  # Build Storybook
```

---

## Code Conventions

### TypeScript Guidelines

1. **Strict Types**: Avoid `any` type - define proper interfaces
2. **No Non-null Assertions**: Do not use `!` operator
3. **No Unknown Casts**: Avoid `as unknown as T` patterns
4. **Double Quotes**: Use `"` for strings, not single quotes
5. **String Templates**: Use template literals or `.join()` instead of concatenation

```typescript
// ✅ Good
const message = `Hello, ${name}!`;
const path = ['api', 'flowdrop', endpoint].join('/');

// ❌ Bad
const message = 'Hello, ' + name + '!';
```

### Svelte 5 Patterns

FlowDrop uses **Svelte 5 Runes mode**. Key patterns:

```svelte
<script lang="ts">
	// Reactive state with $state
	let count = $state(0);
	let items = $state<string[]>([]);

	// Derived values with $derived
	let doubled = $derived(count * 2);
	let total = $derived(items.length);

	// Side effects with $effect
	$effect(() => {
		console.log(`Count changed to ${count}`);
	});

	// Props with $props
	let { label, onclick } = $props<{
		label: string;
		onclick?: () => void;
	}>();
</script>
```

### Component Props Pattern

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Required prop with description */
		title: string;
		/** Optional prop with default */
		variant?: 'primary' | 'secondary';
		/** Event handler */
		onchange?: (value: string) => void;
		/** Slot content */
		children?: Snippet;
	}

	let { title, variant = 'primary', onchange, children }: Props = $props();
</script>
```

### File Naming

- Components: `PascalCase.svelte` (e.g., `WorkflowEditor.svelte`)
- TypeScript: `camelCase.ts` (e.g., `nodeStatus.ts`)
- Tests: `*.test.ts` or `*.spec.ts`
- Types: Defined in `src/lib/types/index.ts`

---

## Core Concepts

### Node Types

FlowDrop has 7 built-in visual node types:

| Type       | Purpose                            | File                  |
| ---------- | ---------------------------------- | --------------------- |
| `default`  | Full-featured nodes with I/O ports | `WorkflowNode.svelte` |
| `simple`   | Compact layout                     | `SimpleNode.svelte`   |
| `square`   | Icon-only minimal design           | `SquareNode.svelte`   |
| `tool`     | AI agent tool nodes                | `ToolNode.svelte`     |
| `gateway`  | Conditional branching logic        | `GatewayNode.svelte`  |
| `terminal` | Start/end workflow points          | `TerminalNode.svelte` |
| `note`     | Markdown documentation blocks      | `NoteNode.svelte`     |

### Key Interfaces

```typescript
// Core workflow types (src/lib/types/index.ts)
interface WorkflowNode extends Node {
	id: string;
	type: string;
	position: XYPosition;
	data: {
		label: string;
		config: ConfigValues; // User-configured values
		metadata: NodeMetadata; // Node type definition
		extensions?: NodeExtensions;
	};
}

interface WorkflowEdge extends Edge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
}

interface Workflow {
	id: string;
	name: string;
	description?: string;
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	metadata?: WorkflowMetadata;
}

interface NodeMetadata {
	id: string;
	name: string;
	type?: NodeType;
	description: string;
	category: NodeCategory;
	version: string;
	inputs: NodePort[];
	outputs: NodePort[];
	configSchema?: ConfigSchema;
}
```

### Special Config Properties

These properties in `node.data.config` trigger special behaviors:

| Property              | Purpose                           |
| --------------------- | --------------------------------- |
| `instanceTitle`       | Per-instance title override       |
| `instanceDescription` | Per-instance description override |
| `nodeType`            | Changes visual rendering type     |
| `dynamicInputs`       | User-defined input handles        |
| `dynamicOutputs`      | User-defined output handles       |
| `branches`            | Gateway conditional output paths  |

See `docs/config-schema-special-properties.md` for full documentation.

---

## Key Files to Understand

### Entry Points

| File                      | Purpose                       |
| ------------------------- | ----------------------------- |
| `src/lib/index.ts`        | Main package exports          |
| `src/lib/core/index.ts`   | Core module (zero heavy deps) |
| `src/lib/editor/index.ts` | Editor module exports         |
| `src/lib/svelte-app.ts`   | Non-Svelte mounting API       |

### Core Components

| File                                       | Purpose                        |
| ------------------------------------------ | ------------------------------ |
| `src/lib/components/WorkflowEditor.svelte` | Main workflow editor component |
| `src/lib/components/UniversalNode.svelte`  | Node component router          |
| `src/lib/components/NodeSidebar.svelte`    | Node palette sidebar           |
| `src/lib/components/ConfigPanel.svelte`    | Node configuration panel       |
| `src/lib/components/SchemaForm.svelte`     | Dynamic form from JSON Schema  |

### Services & Utilities

| File                                   | Purpose                       |
| -------------------------------------- | ----------------------------- |
| `src/lib/services/nodeService.ts`      | Node operations               |
| `src/lib/services/workflowService.ts`  | Workflow CRUD operations      |
| `src/lib/services/executionService.ts` | Pipeline execution            |
| `src/lib/services/interruptService.ts` | HITL interrupt API operations |
| `src/lib/stores/workflowStore.ts`      | Workflow state management     |
| `src/lib/stores/interruptStore.ts`     | Active interrupts state       |
| `src/lib/adapters/WorkflowAdapter.ts`  | API response transformation   |

### Configuration

| File                                  | Purpose                    |
| ------------------------------------- | -------------------------- |
| `src/lib/config/endpoints.ts`         | API endpoint configuration |
| `src/lib/config/defaultPortConfig.ts` | Port data types & colors   |
| `src/lib/config/runtimeConfig.ts`     | Runtime configuration      |

---

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ComponentOrFunction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('methodName', () => {
		it('should do expected behavior', () => {
			// Arrange
			const input = createTestInput();

			// Act
			const result = functionUnderTest(input);

			// Assert
			expect(result).toBe(expectedValue);
		});
	});
});
```

### Test Utilities

- Test fixtures: `tests/fixtures/`
- Svelte helpers: `tests/utils/svelte-helpers.ts`
- Common helpers: `tests/utils/test-helpers.ts`

### Mock Data

Mock data for development and tests is in `src/mocks/data/`:

- `nodes.ts` - Node type definitions
- Mock handlers use MSW (Mock Service Worker)

---

## Common Tasks

### Adding a New Node Type

1. Create component in `src/lib/components/nodes/`
2. Register in `src/lib/registry/builtinNodes.ts`
3. Add type to `BuiltinNodeType` in `src/lib/types/index.ts`
4. Update `UniversalNode.svelte` if needed

### Adding a Form Field Type

1. Create component in `src/lib/components/form/`
2. Register in `src/lib/form/fieldRegistry.ts`
3. Add props interface in `src/lib/components/form/types.ts`

### Adding a New Service

1. Create service in `src/lib/services/`
2. Export from appropriate module (`core`, `editor`, etc.)
3. Add types to `src/lib/types/`

### Adding API Endpoints

1. Update `EndpointConfig` in `src/lib/config/endpoints.ts`
2. Add methods to appropriate client in `src/lib/api/`
3. Update OpenAPI spec in `api/` directory (auto-deployed to GitHub Pages)

---

## Package Exports

FlowDrop uses module exports for tree-shaking:

```typescript
// Main entry - includes all components
import { WorkflowEditor, NodeSidebar } from '@d34dman/flowdrop';

// Core - types and utilities only (zero heavy deps)
import type { Workflow, WorkflowNode } from '@d34dman/flowdrop/core';

// Editor - editor-specific exports
import { mountFlowDropApp } from '@d34dman/flowdrop/editor';

// Form - form components
import { SchemaForm, registerField } from '@d34dman/flowdrop/form';

// Display - read-only display components
import { MarkdownDisplay } from '@d34dman/flowdrop/display';

// Styles
import '@d34dman/flowdrop/styles/base.css';
```

---

## API Integration

### EndpointConfig

```typescript
const config = createEndpointConfig({
	baseUrl: 'https://api.example.com/flowdrop',
	auth: { type: 'bearer', token: 'your-token' }
});
```

### AuthProvider Pattern

```typescript
// Static authentication
const authProvider = new StaticAuthProvider({
	type: 'bearer',
	token: 'your-token'
});

// Dynamic authentication with refresh
const authProvider = new CallbackAuthProvider({
	getToken: () => authService.getAccessToken(),
	onUnauthorized: () => authService.refreshToken()
});
```

See [API Documentation](https://flowdrop-io.github.io/flowdrop/) for full REST API specification.

---

## CSS Custom Properties

FlowDrop theming uses design tokens (see `src/lib/styles/tokens.css`). Semantic tokens use the `--fd-*` prefix (e.g. `--fd-primary`, `--fd-card`, `--fd-radius-lg`).

### Toast theme

svelte-5-french-toast is themed via design tokens:

- **Styles**: `src/lib/styles/toast.css` targets `.flowdrop-toaster` and `.flowdrop-toast-bar` using `--fd-card`, `--fd-border`, `--fd-radius-lg`, `--fd-shadow-md`, etc.
- **Options**: `flowdropToastOptions` and `FLOWDROP_TOASTER_CLASS` from `toastService.ts`; use with `<Toaster containerClassName={FLOWDROP_TOASTER_CLASS} toastOptions={flowdropToastOptions} />`.
- **Icons**: Success/error/loading icon colors use `--fd-success`, `--fd-error`, `--fd-primary` (and foreground/muted) via `toastOptions.iconTheme`.

---

## Important Notes for AI Agents

1. **Read Before Edit**: Always read files before proposing changes
2. **Follow Existing Patterns**: Match the style of surrounding code
3. **Type Everything**: Use proper TypeScript types, avoid `any`
4. **Test Changes**: Run `npm test` after making changes
5. **Check Linting**: Run `npm run lint` before committing
6. **Svelte 5 Runes**: Use `$state`, `$derived`, `$effect`, `$props`
7. **JSDoc Comments**: Include JSDoc headers for functions and components
8. **Error Handling**: Implement proper error checking and validation
9. **No Placeholders**: Generate complete code, not placeholder comments
10. **Module Boundaries**: Respect the module structure (`core` has no heavy deps)

### When Modifying Types

- Main types are in `src/lib/types/index.ts`
- Auth types in `src/lib/types/auth.ts`
- Event types in `src/lib/types/events.ts`
- Config types in `src/lib/types/config.ts`
- Playground types in `src/lib/types/playground.ts`
- Interrupt types in `src/lib/types/interrupt.ts`
- Form types in `src/lib/components/form/types.ts`

### When Working with Stores

- Workflow store: `src/lib/stores/workflowStore.ts`
- Playground store: `src/lib/stores/playgroundStore.ts`
- Interrupt store: `src/lib/stores/interruptStore.ts`
- Use Svelte 5's `$state` rune pattern for reactivity

---

## Related Documentation

| Document                                   | Content                         |
| ------------------------------------------ | ------------------------------- |
| `README.md`                                | Project overview and quickstart |
| [API Documentation][api-docs]              | REST API specification          |
| `QUICK_START.md`                           | Getting started guide           |
| `DOCKER.md`                                | Docker deployment               |
| `CHANGELOG.md`                             | Version history                 |
| `docs/config-schema-special-properties.md` | Config schema magic properties  |
| `docs/component-hierarchy.md`              | Component structure             |
| `docs/configEdit-feature.md`               | Dynamic config editing          |
| `docs/interrupt-feature.md`                | Human-in-the-Loop interrupts    |

[api-docs]: https://flowdrop-io.github.io/flowdrop/

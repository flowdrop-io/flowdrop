# Human-in-the-Loop (HITL) Interrupts

This document describes FlowDrop's Human-in-the-Loop interrupt system, which enables workflows to pause execution and request user input before continuing.

## Overview

Interrupts allow AI workflows to request human approval, input, or decisions at critical points. This is essential for:

- **Approval workflows**: Requiring human sign-off before sensitive actions
- **Data collection**: Gathering additional information from users
- **Decision points**: Allowing humans to choose execution paths
- **Quality control**: Reviewing AI outputs before proceeding

## Architecture

### Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Workflow   │────▶│   Backend    │────▶│   Frontend   │
│   Execution  │     │  (Interrupt) │     │   (Prompt)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │   Pending    │◀────│    User      │
                     │   State      │     │   Response   │
                     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Resume     │
                     │  Execution   │
                     └──────────────┘
```

### Components

| Component            | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `InterruptService`   | API client for interrupt operations       |
| `interruptStore`     | Svelte store for active interrupts        |
| `InterruptBubble`    | Container component for rendering prompts |
| `ConfirmationPrompt` | Yes/No approval UI                        |
| `ChoicePrompt`       | Single/multiple selection UI              |
| `TextInputPrompt`    | Text input UI                             |
| `FormPrompt`         | JSON Schema-based form UI                 |

## Interrupt Types

### Confirmation

Simple yes/no prompt for binary decisions.

```typescript
interface ConfirmationInterruptConfig {
	message: string;
	confirm_label?: string; // Default: "Yes"
	cancel_label?: string; // Default: "No"
}
```

**Response type**: `boolean`

**Use cases**:

- Approving actions
- Confirming deletions
- Proceeding with sensitive operations

### Choice

Single or multiple selection from predefined options.

```typescript
interface ChoiceOption {
	value: string;
	label: string;
	description?: string;
}

interface ChoiceInterruptConfig {
	message: string;
	options: ChoiceOption[];
	multiple?: boolean; // Default: false
	min_selections?: number;
	max_selections?: number;
}
```

**Response type**: `string` (single) or `string[]` (multiple)

**Use cases**:

- Selecting from alternatives
- Choosing execution paths
- Picking from recommendations

### Text

Free-form text input.

```typescript
interface TextInterruptConfig {
	message: string;
	placeholder?: string;
	multiline?: boolean; // Default: false
	min_length?: number;
	max_length?: number;
	default_value?: string;
}
```

**Response type**: `string`

**Use cases**:

- Providing descriptions
- Entering custom values
- Adding context or notes

### Form

Complex data entry using JSON Schema.

```typescript
interface FormInterruptConfig {
	message: string;
	schema: ConfigSchema; // JSON Schema
	default_values?: Record<string, unknown>;
}
```

**Response type**: `object` (matching schema structure)

**Use cases**:

- Complex data collection
- Structured input with validation
- Multi-field forms

## Frontend Integration

### Basic Usage

The `ChatPanel` component automatically detects and renders interrupts embedded in messages:

```svelte
<script lang="ts">
	import { InterruptBubble } from '@d34dman/flowdrop/playground';
	import { isInterruptMessageMetadata, metadataToInterrupt } from '@d34dman/flowdrop/playground';
</script>

{#each messages as message}
	<MessageBubble {message} />

	{#if isInterruptMessageMetadata(message.metadata)}
		{@const interrupt = metadataToInterrupt(message.metadata, message.id, message.content)}
		<InterruptBubble
			{interrupt}
			onResolve={(value) => handleResolve(interrupt.id, value)}
			onCancel={() => handleCancel(interrupt.id)}
		/>
	{/if}
{/each}
```

### Manual Integration

For custom implementations:

```typescript
import { interruptService, interruptActions, activeInterrupts } from '@d34dman/flowdrop/playground';

// Subscribe to active interrupts
activeInterrupts.subscribe((interrupts) => {
	console.log('Active interrupts:', interrupts);
});

// Resolve an interrupt
async function resolveInterrupt(interruptId: string, value: unknown) {
	try {
		const resolved = await interruptService.resolveInterrupt(interruptId, value);
		interruptActions.updateInterrupt(interruptId, {
			status: 'resolved',
			response: resolved.response
		});
	} catch (error) {
		console.error('Failed to resolve:', error);
	}
}

// Cancel an interrupt
async function cancelInterrupt(interruptId: string) {
	try {
		await interruptService.cancelInterrupt(interruptId);
		interruptActions.updateInterrupt(interruptId, { status: 'cancelled' });
	} catch (error) {
		console.error('Failed to cancel:', error);
	}
}
```

### Using Individual Prompt Components

You can use prompt components directly:

```svelte
<script lang="ts">
	import { ConfirmationPrompt } from '@d34dman/flowdrop/playground';

	let config = {
		message: 'Do you approve this action?',
		confirm_label: 'Approve',
		cancel_label: 'Reject'
	};
</script>

<ConfirmationPrompt
	{config}
	status="pending"
	allowCancel={true}
	onConfirm={() => handleConfirm()}
	onCancel={() => handleCancel()}
/>
```

## Backend Integration

### Message Metadata Format

When a workflow requires user input, the backend sends a message with interrupt metadata:

```json
{
	"id": "msg-123",
	"role": "assistant",
	"content": "I need your approval to proceed.",
	"status": "completed",
	"metadata": {
		"type": "interrupt_request",
		"interrupt_id": "int-456",
		"interrupt_type": "confirmation",
		"node_id": "approval-node",
		"execution_id": "exec-789",
		"message": "Do you approve this action?",
		"confirm_label": "Approve",
		"cancel_label": "Reject",
		"allowCancel": true
	}
}
```

### API Endpoints

| Endpoint                               | Method | Purpose                  |
| -------------------------------------- | ------ | ------------------------ |
| `/interrupts/{id}`                     | GET    | Get interrupt details    |
| `/interrupts/{id}`                     | POST   | Resolve interrupt        |
| `/interrupts/{id}/cancel`              | POST   | Cancel interrupt         |
| `/playground/sessions/{id}/interrupts` | GET    | List session interrupts  |
| `/pipelines/{id}/interrupts`           | GET    | List pipeline interrupts |

### Endpoint Configuration

The endpoints are configured in `EndpointConfig`:

```typescript
const config = createEndpointConfig({
	baseUrl: '/api/flowdrop',
	endpoints: {
		// ... other endpoints
		interrupts: {
			listSessionInterrupts: '/playground/sessions/{sessionId}/interrupts',
			get: '/interrupts/{interruptId}',
			resolve: '/interrupts/{interruptId}',
			cancel: '/interrupts/{interruptId}/cancel',
			listPipelineInterrupts: '/pipelines/{pipelineId}/interrupts'
		}
	}
});
```

## State Management

### Interrupt Store

The `interruptStore` manages active interrupts:

```typescript
import { activeInterrupts, interruptActions } from '@d34dman/flowdrop/playground';

// Available actions
interruptActions.addInterrupt(interrupt);
interruptActions.updateInterrupt(id, { status: 'resolved' });
interruptActions.removeInterrupt(id);
interruptActions.clearInterrupts();
interruptActions.getInterruptById(id);
```

### Resolved State Display

When an interrupt is resolved, the UI remains visible but disabled, showing the user's selection:

```svelte
{#if interrupt.status === 'pending'}
	<!-- Active form -->
{:else}
	<!-- Disabled form showing response -->
	<div class="resolved-overlay">
		Resolved: {formatResponse(interrupt.response)}
	</div>
{/if}
```

## Polling

### Message-Based Detection (Default)

Interrupts are primarily detected through playground message metadata during regular message polling. No additional configuration is needed.

### Dedicated Polling (Optional)

For status updates on pending interrupts:

```typescript
import { interruptService } from '@d34dman/flowdrop/playground';

// Start polling for a specific interrupt
interruptService.startPolling(
	interruptId,
	(interrupt) => {
		// Handle updated interrupt
		if (interrupt.status !== 'pending') {
			console.log('Interrupt resolved externally');
		}
	},
	1500 // Poll interval in ms
);

// Stop polling
interruptService.stopPolling();

// Check if polling is active
if (interruptService.isPolling(interruptId)) {
	// ...
}
```

## Multiple Interrupts

FlowDrop supports multiple concurrent interrupts. Each interrupt is rendered inline in the chat flow, maintaining conversation context:

```
User: Process these documents
Assistant: Starting document processing...
[Interrupt 1: Confirm deletion of duplicates?]
[Interrupt 2: Select output format]
Assistant: Processing complete.
```

## Best Practices

### 1. Clear Messages

Write clear, actionable interrupt messages:

```typescript
// ✅ Good
'Do you approve sending this email to 150 recipients?';

// ❌ Bad
'Proceed?';
```

### 2. Meaningful Labels

Use descriptive button/option labels:

```typescript
// ✅ Good
confirm_label: 'Yes, send email';
cancel_label: 'No, cancel';

// ❌ Bad
confirm_label: 'Yes';
cancel_label: 'No';
```

### 3. Default Values

Provide sensible defaults for form fields:

```typescript
{
	type: "form",
	config: {
		schema: { /* ... */ },
		default_values: {
			priority: "medium",
			notify: true
		}
	}
}
```

### 4. Cancel Behavior

Only set `allowCancel: false` when the interrupt is truly mandatory:

```typescript
// Mandatory approval - cannot be skipped
{
	type: "confirmation",
	config: { message: "Legal compliance approval required" },
	allowCancel: false
}
```

### 5. Error Handling

Always handle interrupt resolution failures:

```typescript
try {
	await interruptService.resolveInterrupt(id, value);
} catch (error) {
	// Show error to user
	// Optionally retry or allow re-submission
}
```

## TypeScript Types

All interrupt types are exported from the playground module:

```typescript
import type {
	Interrupt,
	InterruptType,
	InterruptConfig,
	ConfirmationInterruptConfig,
	ChoiceOption,
	ChoiceInterruptConfig,
	TextInterruptConfig,
	FormInterruptConfig,
	InterruptMessageMetadata,
	InterruptApiResponse,
	InterruptListApiResponse,
	InterruptResolveRequest
} from '@d34dman/flowdrop/playground';

// Type guards
import { isInterruptMessageMetadata, metadataToInterrupt } from '@d34dman/flowdrop/playground';
```

## Files Reference

| File                                                     | Purpose             |
| -------------------------------------------------------- | ------------------- |
| `src/lib/types/interrupt.ts`                             | Type definitions    |
| `src/lib/services/interruptService.ts`                   | API client          |
| `src/lib/stores/interruptStore.ts`                       | State management    |
| `src/lib/components/interrupt/InterruptBubble.svelte`    | Main container      |
| `src/lib/components/interrupt/ConfirmationPrompt.svelte` | Confirmation UI     |
| `src/lib/components/interrupt/ChoicePrompt.svelte`       | Choice selection UI |
| `src/lib/components/interrupt/TextInputPrompt.svelte`    | Text input UI       |
| `src/lib/components/interrupt/FormPrompt.svelte`         | Form UI             |
| `src/lib/components/interrupt/index.ts`                  | Barrel exports      |
| `src/lib/config/endpoints.ts`                            | API endpoint config |

## See Also

- [API Documentation](https://flowdrop-io.github.io/flowdrop/) - REST API documentation (GitHub Pages)
- [api/openapi.yaml](../api/openapi.yaml) - OpenAPI specification
- [configEdit-feature.md](./configEdit-feature.md) - Dynamic configuration editing

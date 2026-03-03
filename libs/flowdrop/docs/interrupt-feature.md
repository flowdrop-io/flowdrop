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

| Component            | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `InterruptService`   | API client for interrupt operations             |
| `interruptStore`     | Svelte 5 rune-based store for active interrupts |
| `InterruptBubble`    | Container component for rendering prompts       |
| `ConfirmationPrompt` | Yes/No approval UI                              |
| `ChoicePrompt`       | Single/multiple selection UI                    |
| `TextInputPrompt`    | Text input UI                                   |
| `FormPrompt`         | JSON Schema-based form UI                       |
| `ReviewPrompt`       | Field-level change review with accept/reject UI |

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

### Review

Review proposed field changes with per-field accept/reject decisions. Displays a visual diff of original vs proposed values with bulk actions.

```typescript
interface ReviewChange {
	/** Field identifier (machine key) */
	field: string;
	/** Human-readable field label */
	label: string;
	/** Original value before the proposed change */
	original: unknown;
	/** Proposed new value */
	proposed: unknown;
}

interface ReviewConfig {
	message: string;
	changes: ReviewChange[];
	acceptAllLabel?: string; // Default: "Accept All"
	rejectAllLabel?: string; // Default: "Reject All"
	submitLabel?: string; // Default: "Submit Review"
}
```

**Response type**: `ReviewResolution`

```typescript
interface ReviewFieldDecision {
	/** Whether the proposed change was accepted */
	accepted: boolean;
	/** The effective value (proposed if accepted, original if rejected) */
	value: unknown;
}

interface ReviewResolution {
	/** Map of field identifier to the user's decision */
	decisions: Record<string, ReviewFieldDecision>;
	/** Summary counts */
	summary: {
		accepted: number;
		rejected: number;
		total: number;
	};
}
```

**Use cases**:

- Reviewing AI-generated content changes before applying
- Approving or rejecting individual field updates
- Auditing proposed modifications with visual diffs

**Features**:

- Per-field accept/reject toggle buttons
- Bulk "Accept All" / "Reject All" actions
- Visual word-level, array, and JSON diffs
- HTML content rendering with raw/rendered toggle
- Summary of accepted/rejected counts on resolution

**Backend metadata example**:

```json
{
	"type": "interrupt_request",
	"interrupt_id": "int-789",
	"interrupt_type": "review",
	"node_id": "content-review",
	"execution_id": "exec-123",
	"changes": [
		{
			"field": "title",
			"label": "Page Title",
			"original": "About Us",
			"proposed": "About Our Company"
		},
		{
			"field": "body",
			"label": "Body Content",
			"original": "<p>Welcome to our site.</p>",
			"proposed": "<p>Welcome to our company website.</p>"
		}
	],
	"accept_all_label": "Accept All Changes",
	"submit_label": "Confirm Review"
}
```

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

For custom implementations using the Svelte 5 rune-based store API:

```typescript
import {
	interruptService,
	interruptActions,
	getPendingInterrupts,
	getInterrupt,
	isInterruptPending
} from '@d34dman/flowdrop/playground';

// Read pending interrupts reactively (inside a component with $derived)
const pending = $derived(getPendingInterrupts());

// Or read a specific interrupt
const interrupt = $derived(getInterrupt('int-123'));

// Resolve an interrupt (state machine handles transitions)
async function resolveInterrupt(interruptId: string, value: unknown) {
	const result = interruptActions.startSubmit(interruptId, value);
	if (!result.valid) return;

	try {
		await interruptService.resolveInterrupt(interruptId, value);
		interruptActions.submitSuccess(interruptId);
	} catch (error) {
		interruptActions.submitFailure(interruptId, String(error));
	}
}

// Cancel an interrupt
async function cancelInterrupt(interruptId: string) {
	const result = interruptActions.startCancel(interruptId);
	if (!result.valid) return;

	try {
		await interruptService.cancelInterrupt(interruptId);
		interruptActions.submitSuccess(interruptId);
	} catch (error) {
		interruptActions.submitFailure(interruptId, String(error));
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

The `interruptStore` uses Svelte 5 runes (`$state` / `$derived`) with a state machine for tracking interaction state. Each interrupt has a `machineState` field that ensures valid transitions (idle -> submitting -> resolved/error).

#### Getter Functions

```typescript
import {
	getInterruptsMap,
	getPendingInterrupts,
	getPendingInterruptCount,
	getResolvedInterrupts,
	getIsAnySubmitting,
	getInterrupt,
	isInterruptPending,
	isInterruptSubmitting,
	getInterruptError,
	getInterruptByMessageId,
	interruptHasError
} from '@d34dman/flowdrop/playground';

// Use inside components with $derived for reactivity
const pending = $derived(getPendingInterrupts());
const count = $derived(getPendingInterruptCount());
const submitting = $derived(getIsAnySubmitting());
```

#### Actions

```typescript
import { interruptActions } from '@d34dman/flowdrop/playground';

// Add/remove interrupts
interruptActions.addInterrupt(interrupt);
interruptActions.addInterrupts(interruptList);
interruptActions.removeInterrupt(id);
interruptActions.clearSessionInterrupts(sessionId);
interruptActions.clearInterrupts();

// State machine transitions
interruptActions.startSubmit(id, value); // idle -> submitting
interruptActions.startCancel(id);        // idle -> cancelling
interruptActions.submitSuccess(id);      // submitting/cancelling -> resolved/cancelled
interruptActions.submitFailure(id, err); // submitting/cancelling -> error
interruptActions.retry(id);              // error -> idle

// Convenience (submit + success in one call)
interruptActions.resolveInterrupt(id, value);
interruptActions.cancelInterrupt(id);
```

### Resolved State Display

When an interrupt is resolved, the UI remains visible but disabled, showing the user's selection:

```svelte
<script lang="ts">
	import { getInterrupt } from '@d34dman/flowdrop/playground';

	let { interruptId }: { interruptId: string } = $props();
	const interrupt = $derived(getInterrupt(interruptId));
</script>

{#if interrupt?.machineState.status === 'idle'}
	<!-- Active form -->
{:else if interrupt?.machineState.status === 'resolved'}
	<!-- Disabled form showing response -->
	<div class="resolved-overlay">
		Resolved: {JSON.stringify(interrupt.responseValue)}
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
	// Core types
	Interrupt,
	InterruptType,
	InterruptStatus,
	InterruptConfig,
	InterruptWithState,
	InterruptMessageMetadata,
	InterruptApiResponse,
	InterruptListResponse,
	InterruptResolution,

	// Config types (per interrupt type)
	ConfirmationConfig,
	ChoiceConfig,
	InterruptChoice,
	TextConfig,
	FormConfig,
	ReviewConfig,
	ReviewChange,
	ReviewFieldDecision,
	ReviewResolution,

	// State machine types
	InterruptState,
	InterruptAction,
	TransitionResult
} from '@d34dman/flowdrop/playground';

// Type guards and converters
import {
	isInterruptMetadata,
	extractInterruptMetadata,
	metadataToInterrupt
} from '@d34dman/flowdrop/playground';

// State machine utilities
import {
	initialState,
	transition,
	isTerminalState,
	isSubmitting,
	hasError,
	canSubmit,
	getErrorMessage,
	getResolvedValue,
	toLegacyStatus
} from '@d34dman/flowdrop/playground';
```

## Files Reference

| File                                                     | Purpose                      |
| -------------------------------------------------------- | ---------------------------- |
| `src/lib/types/interrupt.ts`                             | Type definitions             |
| `src/lib/types/interruptState.ts`                        | State machine types & logic  |
| `src/lib/services/interruptService.ts`                   | API client                   |
| `src/lib/stores/interruptStore.svelte.ts`                | Rune-based state management  |
| `src/lib/components/interrupt/InterruptBubble.svelte`    | Main container               |
| `src/lib/components/interrupt/ConfirmationPrompt.svelte` | Confirmation UI              |
| `src/lib/components/interrupt/ChoicePrompt.svelte`       | Choice selection UI          |
| `src/lib/components/interrupt/TextInputPrompt.svelte`    | Text input UI                |
| `src/lib/components/interrupt/FormPrompt.svelte`         | Form UI                      |
| `src/lib/components/interrupt/ReviewPrompt.svelte`       | Field change review UI       |
| `src/lib/components/interrupt/index.ts`                  | Barrel exports               |
| `src/lib/config/endpoints.ts`                            | API endpoint config          |

## See Also

- [API Documentation](https://flowdrop-io.github.io/flowdrop/) - REST API documentation (GitHub Pages)
- [api/openapi.yaml](../api/openapi.yaml) - OpenAPI specification
- [configEdit-feature.md](./configEdit-feature.md) - Dynamic configuration editing

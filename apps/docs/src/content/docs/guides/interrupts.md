---
title: Human-in-the-Loop
description: Pause workflows for human approval, input, or review.
---

FlowDrop's interrupt system enables workflows to pause execution and request user input before continuing. This is essential for approval workflows, data collection, decision points, and quality control.

## Interrupt Types

### Confirmation

Simple yes/no prompt for binary decisions:

```json
{
  "interrupt_type": "confirmation",
  "message": "Do you approve sending this email to 150 recipients?",
  "confirm_label": "Yes, send email",
  "cancel_label": "No, cancel"
}
```

**Response**: `boolean`

### Choice

Single or multiple selection from predefined options:

```json
{
  "interrupt_type": "choice",
  "message": "Select the output format:",
  "options": [
    { "value": "json", "label": "JSON", "description": "Structured data" },
    { "value": "csv", "label": "CSV", "description": "Spreadsheet format" }
  ],
  "multiple": false
}
```

**Response**: `string` (single) or `string[]` (multiple)

### Text Input

Free-form text entry:

```json
{
  "interrupt_type": "text_input",
  "message": "Provide additional context:",
  "placeholder": "Enter your notes...",
  "multiline": true,
  "max_length": 1000
}
```

**Response**: `string`

### Form

Complex data entry using JSON Schema:

```json
{
  "interrupt_type": "form",
  "message": "Complete the configuration:",
  "schema": {
    "type": "object",
    "properties": {
      "priority": { "type": "string", "enum": ["low", "medium", "high"] },
      "notify": { "type": "boolean", "title": "Send notification" }
    }
  },
  "default_values": { "priority": "medium", "notify": true }
}
```

**Response**: `object` (matching schema structure)

### Review

Review proposed field changes with per-field accept/reject decisions and visual diffs:

```json
{
  "interrupt_type": "review",
  "message": "Review these proposed changes:",
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
  ]
}
```

**Response**: `ReviewResolution` with per-field decisions and summary counts.

## Architecture

```
Workflow Execution -> Backend (creates interrupt) -> Frontend (renders prompt)
                                                          |
                                                     User Response
                                                          |
                                                   Backend (resumes) -> Workflow continues
```

## Frontend Integration

The `ChatPanel` automatically detects and renders interrupts in messages. For manual integration:

```typescript
import {
  interruptService,
  interruptActions,
  getPendingInterrupts,
  getInterrupt
} from '@flowdrop/flowdrop/playground';

// Read pending interrupts reactively
const pending = $derived(getPendingInterrupts());

// Resolve an interrupt
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
```

## Using Prompt Components Directly

```svelte
<script lang="ts">
  import { ConfirmationPrompt } from '@flowdrop/flowdrop/playground';
</script>

<ConfirmationPrompt
  config={{
    message: 'Do you approve this action?',
    confirm_label: 'Approve',
    cancel_label: 'Reject'
  }}
  status="pending"
  allowCancel={true}
  onConfirm={() => handleConfirm()}
  onCancel={() => handleCancel()}
/>
```

## Backend Integration

### Message Metadata Format

When a workflow requires input, the backend sends a message with interrupt metadata:

```json
{
  "id": "msg-123",
  "role": "assistant",
  "content": "I need your approval to proceed.",
  "metadata": {
    "type": "interrupt_request",
    "interrupt_id": "int-456",
    "interrupt_type": "confirmation",
    "message": "Do you approve this action?",
    "confirm_label": "Approve",
    "cancel_label": "Reject"
  }
}
```

### API Endpoints

| Endpoint                               | Method | Purpose                 |
| -------------------------------------- | ------ | ----------------------- |
| `/interrupts/{id}`                     | GET    | Get interrupt details   |
| `/interrupts/{id}`                     | POST   | Resolve interrupt       |
| `/interrupts/{id}/cancel`              | POST   | Cancel interrupt        |
| `/playground/sessions/{id}/interrupts` | GET    | List session interrupts |

## State Management

The interrupt store uses a state machine with these transitions:

- **idle** — Awaiting user input
- **submitting** — User response being sent
- **resolved** — Successfully processed
- **error** — Submission failed (can retry)

Resolved interrupts remain visible but disabled, showing the user's selection.

## Best Practices

1. **Clear messages** — Write actionable prompts ("Do you approve sending this email to 150 recipients?" not "Proceed?")
2. **Meaningful labels** — Use descriptive button labels ("Yes, send email" not "Yes")
3. **Default values** — Provide sensible defaults for form fields
4. **Cancel behavior** — Only set `allowCancel: false` for mandatory interrupts
5. **Error handling** — Always handle resolution failures gracefully

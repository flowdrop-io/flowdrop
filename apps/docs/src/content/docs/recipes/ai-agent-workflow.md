---
title: "Build an AI Agent Workflow"
description: Create a complete AI agent workflow with branching, tools, and human-in-the-loop.
sidebar:
  badge:
    text: 'Intermediate'
    variant: note
---

This recipe walks you through building a real-world AI agent workflow with four node types, conditional routing, and a human-in-the-loop review step.

## What We're Building

An AI content assistant that:
1. Takes user input
2. Sends it to an LLM
3. Routes based on intent (question → answer directly, task → use tools)
4. Gets human review before outputting the final result

```
                         ┌─ Question ─▸ [Text Output]
[User Input] → [LLM] → [Router] ─┤
                         └─ Task ────▸ [Tool Call] → [Review] → [Text Output]
```

## Step 1: Define Node Types

On your backend, define these node types:

```typescript
const nodes = [
  {
    id: 'user_input',
    name: 'User Input',
    type: 'simple',
    category: 'inputs',
    icon: 'mdi:account-outline',
    inputs: [],
    outputs: [
      { id: 'message', name: 'Message', type: 'output', dataType: 'string' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        placeholder: {
          type: 'string',
          title: 'Placeholder',
          default: 'Ask me anything...'
        }
      }
    }
  },
  {
    id: 'llm_call',
    name: 'LLM Call',
    type: 'workflowNode',
    category: 'models',
    icon: 'mdi:robot-outline',
    inputs: [
      { id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string' }
    ],
    outputs: [
      { id: 'response', name: 'Response', type: 'output', dataType: 'string' },
      { id: 'metadata', name: 'Metadata', type: 'output', dataType: 'json' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          title: 'Model',
          oneOf: [
            { const: 'gpt-4', title: 'GPT-4' },
            { const: 'claude-3-sonnet', title: 'Claude 3 Sonnet' },
            { const: 'claude-3-haiku', title: 'Claude 3 Haiku' }
          ],
          default: 'claude-3-sonnet'
        },
        system_prompt: {
          type: 'string',
          title: 'System Prompt',
          format: 'template',
          default: 'You are a helpful assistant. Classify the user message as either a "question" or a "task".',
          variables: { ports: ['prompt'] }
        },
        temperature: {
          type: 'number',
          title: 'Temperature',
          minimum: 0,
          maximum: 2,
          default: 0.3
        }
      }
    }
  },
  {
    id: 'intent_router',
    name: 'Intent Router',
    type: 'gateway',
    category: 'logic',
    icon: 'mdi:directions-fork',
    inputs: [
      { id: 'input', name: 'Input', type: 'input', dataType: 'string' },
      { id: 'metadata', name: 'Metadata', type: 'input', dataType: 'json' }
    ],
    outputs: [
      { id: 'default', name: 'Default', type: 'output', dataType: 'string' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        condition_field: {
          type: 'string',
          title: 'Condition Field',
          default: 'intent'
        }
      }
    }
  },
  {
    id: 'text_output',
    name: 'Text Output',
    type: 'simple',
    category: 'outputs',
    icon: 'mdi:text',
    inputs: [
      { id: 'input', name: 'Text', type: 'input', dataType: 'string' }
    ],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          title: 'Format',
          enum: ['plain', 'markdown', 'json'],
          default: 'markdown'
        }
      }
    }
  }
];
```

## Step 2: Configure the Gateway

The `intent_router` node uses the **gateway** type. After adding it to the canvas, add branches in its configuration:

- **Branch "Question"**: Routes when intent is "question" → connect to a direct `text_output`
- **Branch "Task"**: Routes when intent is "task" → connect to a tool processing chain

Each branch creates a new output port on the gateway node.

## Step 3: Add Template Variables

The `llm_call` node's `system_prompt` field uses `format: "template"` with `variables: { ports: ['prompt'] }`. This means:

1. Connect `user_input.message` → `llm_call.prompt`
2. In the LLM's system prompt, type `{{` to see `prompt` as an autocomplete suggestion
3. Write: `Classify this message: {{ prompt }}`

The template editor highlights `{{ prompt }}` and shows hints below the editor.

## Step 4: Wire It Together

In FlowDrop's visual editor:

1. Drag all four node types onto the canvas
2. Connect: `user_input.message` → `llm_call.prompt`
3. Connect: `llm_call.response` → `intent_router.input`
4. Connect: `llm_call.metadata` → `intent_router.metadata`
5. Add gateway branches and connect each branch output to the appropriate downstream node

## Step 5: Add Human-in-the-Loop

For the "Task" branch, you want human review before the final output. This uses FlowDrop's [interrupt system](/guides/interrupts/):

On your backend, when the workflow reaches the review step, create an interrupt:

```typescript
// Backend: create a review interrupt
const interrupt = {
  id: crypto.randomUUID(),
  type: 'review',
  status: 'pending',
  config: {
    title: 'Review AI Output',
    description: 'Please review the AI-generated content before it is sent.',
    content: aiGeneratedContent,
    actions: ['approve', 'reject', 'edit']
  }
};
```

FlowDrop's playground UI renders this as a review prompt with approve/reject/edit buttons.

## Step 6: Test in the Playground

1. Open the workflow playground (toolbar button or mount `mountPlayground()`)
2. Type a message like "What is the capital of France?"
3. Watch it route through the "Question" branch
4. Type "Write me a blog post about AI" and watch it route through "Task" → human review

## Complete Workflow JSON

The final workflow JSON looks like this:

```json
{
  "id": "ai-agent-workflow",
  "name": "AI Content Assistant",
  "nodes": [
    {
      "id": "node-1",
      "type": "simple",
      "position": { "x": 100, "y": 300 },
      "data": {
        "label": "User Input",
        "metadata": { "id": "user_input" },
        "config": { "placeholder": "Ask me anything..." }
      }
    },
    {
      "id": "node-2",
      "type": "workflowNode",
      "position": { "x": 400, "y": 300 },
      "data": {
        "label": "LLM Call",
        "metadata": { "id": "llm_call" },
        "config": {
          "model": "claude-3-sonnet",
          "system_prompt": "Classify: {{ prompt }}",
          "temperature": 0.3
        }
      }
    },
    {
      "id": "node-3",
      "type": "gateway",
      "position": { "x": 700, "y": 300 },
      "data": {
        "label": "Intent Router",
        "metadata": { "id": "intent_router" },
        "branches": [
          { "id": "question", "label": "Question" },
          { "id": "task", "label": "Task" }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "node-1",
      "sourceHandle": "node-1-output-message",
      "target": "node-2",
      "targetHandle": "node-2-input-prompt"
    },
    {
      "id": "e2",
      "source": "node-2",
      "sourceHandle": "node-2-output-response",
      "target": "node-3",
      "targetHandle": "node-3-input-input"
    }
  ]
}
```

## Next Steps

- [Human-in-the-Loop](/guides/interrupts/) — full interrupt system reference
- [Template Variables](/guides/advanced/template-variables/) — advanced template patterns
- [Configuration Schema](/guides/config-schema/) — complex form fields

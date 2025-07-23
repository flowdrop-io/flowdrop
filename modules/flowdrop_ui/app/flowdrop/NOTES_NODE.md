# Notes Node

The Notes node allows you to add documentation and comments to your workflows with **Markdown support**, similar to Langflow's notes functionality.

## Features

- **📝 Markdown Support**: Write rich documentation with headers, lists, code blocks, and more
- **🎨 Multiple Types**: Choose from 5 different visual styles (info, warning, success, error, note)
- **✏️ Edit Mode**: Double-click to edit with live Markdown preview
- **👁️ Display Mode**: Clean, styled display of your documentation
- **🚫 No Processing**: Notes don't process data - they're purely for documentation

## Modes

### Display Mode (Default)
Notes are shown in **Display Mode** by default with:
- **Styled Content**: Rendered Markdown with appropriate colors
- **Type Indicator**: Shows the note type with icon and label
- **Edit Button**: Click the pencil icon to enter edit mode
- **Clean Layout**: Professional appearance that fits the workflow

### Edit Mode
When you click the edit button, Notes enter **Edit Mode** with:
- **Note Type Selector**: Choose from Info, Warning, Success, Error, or Note
- **Markdown Textarea**: Write your documentation with full Markdown support
- **Save/Cancel Buttons**: Save changes or cancel editing

## Configuration

### Properties

- **Content** (`content`): The main text content with Markdown support
- **Note Type** (`noteType`): Visual style and color of the note
  - `info` - Blue theme with information icon
  - `warning` - Yellow theme with alert icon
  - `success` - Green theme with check icon
  - `error` - Red theme with error icon
  - `note` - Gray theme with note icon

## Markdown Support

The Notes node supports full Markdown formatting:

```markdown
# Main Header
## Sub Header

**Bold text** and *italic text*

- Bullet points
- More items

1. Numbered lists
2. Second item

`inline code` and code blocks:

```python
def hello_world():
    print("Hello, World!")
```

> Blockquotes for important notes

[Links](https://example.com) and ![Images](image.png)
```

## Usage Examples

### Basic Documentation
```json
{
  "content": "# Workflow Purpose\n\nThis workflow processes customer feedback and generates responses.",
  "noteType": "info"
}
```

### Warning Note
```json
{
  "content": "⚠️ **Important**: Make sure to validate input data before processing to avoid errors.",
  "noteType": "warning"
}
```

### Success Note
```json
{
  "content": "✅ **Workflow Complete**\n\nAll steps processed successfully!",
  "noteType": "success"
}
```

### Code Documentation
```json
{
  "content": "## API Configuration\n\n```json\n{\n  \"endpoint\": \"/api/process\",\n  \"method\": \"POST\"\n}\n```",
  "noteType": "note"
}
```

## Integration

The Notes node is integrated into the workflow editor and can be:

1. **Dragged from the sidebar** - Available in the "Tools" category
2. **Rendered as NotesNode component** - Uses dedicated component for better UX
3. **Clicked edit button** - Enter Edit Mode with Markdown editor
4. **Configured via the config panel** - Edit content and note type
5. **Positioned anywhere** - Place notes near relevant workflow sections
6. **Styled consistently** - Uses the same design system as other nodes

## Architecture

The node selection is handled at the **WorkflowEditor** level:
- **Notes nodes** (`type: "note"`) → Render `NotesNode.svelte` component
- **All other nodes** (`type: "workflowNode"`) → Render `WorkflowNode.svelte` component

This provides better separation of concerns and allows each component to be optimized for its specific use case.

## Backend Integration

The Notes node is fully integrated with the Drupal backend:

### **Drupal Plugin System:**
- **Plugin ID**: `notes`
- **Plugin Class**: `Drupal\flowdrop\Plugins\FlowdropNodeProcessor\Notes`
- **Node Type Entity**: `flowdrop_node_type.flowdrop_node_type.notes.yml`
- **API Endpoint**: `/api/flowdrop/nodes` returns Notes with `"type": "note"`
- **Type Attribute**: `#[FlowdropNodeProcessor(id: 'notes', label: 'Notes', type: 'note')]`

### **Type System:**
The FlowdropNodeProcessor attribute now includes a `type` parameter that determines how nodes are rendered in the frontend:

```php
#[FlowdropNodeProcessor(
  id: 'notes',
  label: new TranslatableMarkup('Notes'),
  type: 'note',  // Determines frontend rendering
)]
```

**Available Types:**
- `"note"` → Renders as `NotesNode.svelte` component
- `"default"` → Renders as `WorkflowNode.svelte` component

### **Multiline Text Support:**
The schema now supports a special `"multiline"` format for string fields that need to capture longer text:

```php
'content' => [
  'type' => 'string',
  'title' => 'Note Content',
  'description' => 'Documentation or comment text (supports Markdown)',
  'format' => 'multiline',  // Renders as textarea instead of input
  'default' => "# Workflow Notes\n\nAdd your documentation here...",
],
```

**Fields with Multiline Support:**
- **Notes**: `content` field
- **Text Input**: `defaultValue` field
- **Prompt Template**: `template` field
- **Chat Model**: `systemPrompt` field
- **Simple Agent**: `systemPrompt` field

### **Configuration Schema:**
```yaml
# Drupal node type configuration
id: notes
label: 'Notes'
description: 'Add documentation and comments to your workflow with Markdown support'
category: tools
icon: 'mdi:note-text'
color: '#fbbf24'
version: '1.0.0'
enabled: true
config:
  content: "# Workflow Notes\n\nAdd your documentation here..."
  noteType: 'info'
tags:
  - tools
  - notes
  - documentation
  - comments
  - markdown
executor_plugin: 'notes'
```

## Data Persistence

Notes node configuration is automatically saved with the workflow:

### **Configuration Structure:**
```typescript
{
  type: "note",
  data: {
    label: "Workflow Notes",
    config: {
      content: "# Markdown content here...",
      noteType: "info" // "info", "warning", "success", "error", "note"
    },
    metadata: { /* node metadata */ }
  }
}
```

### **Automatic Saving:**
- ✅ **Content changes** → Automatically saved to workflow
- ✅ **Note type changes** → Automatically saved to workflow
- ✅ **Edit mode state** → Preserved during session
- ✅ **Workflow export** → Includes all note configurations
- ✅ **Workflow import** → Restores note configurations

### **Event Dispatching:**
The NotesNode component dispatches events to notify the parent of changes:
- `configChange` → When content or note type changes
- `editModeChange` → When edit mode is toggled

## Benefits

- **📚 Rich Documentation**: Use Markdown for better formatting
- **👥 Team Collaboration**: Help team members understand workflow logic
- **🔧 Maintenance**: Make workflows easier to maintain and debug
- **🎯 Onboarding**: Help new users understand complex workflows
- **💡 Self-Documenting**: Keep workflows understandable

## Technical Details

- **Category**: Tools
- **Inputs**: None (documentation only)
- **Outputs**: None (documentation only)
- **Icon**: `mdi:note-text`
- **Color**: `#fbbf24` (amber)
- **Component**: `NotesNode.svelte`
- **Markdown Parser**: `marked` library
- **Modes**: Edit (with preview) and Display 
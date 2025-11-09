# FlowDrop Svelte Component Hierarchy

This document provides an ASCII diagram of the FlowDrop application's Svelte component structure.

## Component Tree

```
FlowDrop Application
│
├── Routes (src/routes/)
│   │
│   ├── +layout.svelte (Root Layout)
│   │   ├── Navbar.svelte
│   │   │   └── Logo.svelte
│   │   └── Toaster (from svelte-5-french-toast)
│   │
│   ├── +page.svelte (Main Workflow List)
│   │
│   ├── workflow/
│   │   ├── create/
│   │   │   └── +page.svelte (Create Workflow)
│   │   │
│   │   ├── [id]/
│   │   │   ├── edit/
│   │   │   │   └── +page.svelte (Edit Workflow)
│   │   │   │       └── App.svelte (Main Workflow App)
│   │   │   │
│   │   │   └── pipelines/
│   │   │       ├── +page.svelte (Pipeline List)
│   │   │       └── [pipelineId]/
│   │   │           └── +page.svelte (Pipeline Detail)
│   │   │               └── PipelineStatus.svelte
│   │   │
│   │   └── template/
│   │       └── +page.svelte (Template Selection)
│   │
│   └── api-test/
│       └── +page.svelte (API Testing)
│
└── Components (src/lib/components/)
    │
    ├── App.svelte (Main Application Container)
    │   ├── Navbar.svelte
    │   │   └── Logo.svelte
    │   │
    │   ├── NodeSidebar.svelte (Left Sidebar)
    │   │   ├── LoadingSpinner.svelte
    │   │   └── Node Type Cards (Draggable)
    │   │
    │   ├── WorkflowEditor.svelte (Main Canvas)
    │   │   ├── SvelteFlow (from @xyflow/svelte)
    │   │   │   ├── Controls
    │   │   │   ├── Background
    │   │   │   ├── MiniMap
    │   │   │   └── Node Components
    │   │   │       └── UniversalNode.svelte (Dynamic Node Wrapper)
    │   │   │           ├── NodeStatusOverlay.svelte
    │   │   │           │   ├── StatusIcon.svelte
    │   │   │           │   └── StatusLabel.svelte
    │   │   │           │
    │   │   │           └── Node Type Components (Rendered Conditionally)
    │   │   │               ├── WorkflowNode.svelte (Default)
    │   │   │               ├── NotesNode.svelte
    │   │   │               ├── SimpleNode.svelte
    │   │   │               ├── SquareNode.svelte
    │   │   │               ├── ToolNode.svelte
    │   │   │               └── GatewayNode.svelte
    │   │   │
    │   │   ├── ConnectionLine.svelte (Custom Connection Line)
    │   │   └── CanvasBanner.svelte (Empty State)
    │   │
    │   └── ConfigSidebar.svelte (Right Sidebar - Configuration)
    │       ├── ConfigForm.svelte (Configuration Form)
    │       └── ConfigModal.svelte (Modal for Advanced Config)
    │
    └── PipelineStatus.svelte (Pipeline Execution View)
        ├── WorkflowEditor.svelte (Read-only mode)
        └── LogsSidebar.svelte (Execution Logs)
            └── MarkdownDisplay.svelte (Log Formatting)

```

## Component Descriptions

### Route Components

**+layout.svelte**

- Root layout component for all pages
- Provides global navigation and structure
- Manages API configuration and global state

**+page.svelte (Root)**

- Main workflow list view
- Displays workflows in list/grid format
- Provides search and filter functionality

**workflow/[id]/edit/+page.svelte**

- Workflow editing interface
- Loads workflow data from API
- Wraps App.svelte with workflow context

**workflow/[id]/pipelines/+page.svelte**

- Lists all pipeline executions for a workflow
- Shows execution history and status

**workflow/[id]/pipelines/[pipelineId]/+page.svelte**

- Individual pipeline execution details
- Real-time status monitoring
- Uses PipelineStatus component

### Core Components

**App.svelte**

- Main application container
- Orchestrates NodeSidebar, WorkflowEditor, and ConfigSidebar
- Manages workflow state and node operations
- Handles save/export functionality

**WorkflowEditor.svelte**

- Core canvas component using SvelteFlow
- Manages node and edge rendering
- Handles drag-and-drop operations
- Provides zoom, pan, and minimap controls

**UniversalNode.svelte**

- Dynamic node wrapper that renders different node types
- Automatically injects NodeStatusOverlay
- Determines node type from metadata and config
- Supports all node variants (workflowNode, note, simple, square, tool, gateway)

### Sidebar Components

**NodeSidebar.svelte (Left)**

- Displays available node types
- Organized by category with accordion groups
- Provides search functionality
- Handles drag-and-drop initialization

**ConfigSidebar.svelte (Right)**

- Node configuration interface
- Dynamic form generation from JSON Schema
- Displays node details and port information
- Slide-in animation from right side

**LogsSidebar.svelte**

- Displays execution logs for pipelines
- Uses MarkdownDisplay for formatted output
- Real-time log streaming support

### Node Components

**WorkflowNode.svelte**

- Default node type for workflow operations
- Shows input/output ports
- Displays node icon and label

**NotesNode.svelte**

- Markdown-enabled note component
- No execution capability
- Used for documentation

**SimpleNode.svelte**

- Minimal node design
- Quick operations

**SquareNode.svelte**

- Square-shaped variant
- Alternative visual style

**ToolNode.svelte**

- Tool integration nodes
- External service connections

**GatewayNode.svelte**

- Decision/branching logic
- Multiple output paths

### Status Components

**NodeStatusOverlay.svelte**

- Displays execution status on nodes
- Position and size configurable per node type
- Shows running/completed/error states

**StatusIcon.svelte**

- Icon representation of status
- Color-coded indicators

**StatusLabel.svelte**

- Text status display
- Execution count and state

**PipelineStatus.svelte**

- Complete pipeline execution view
- Read-only workflow display
- Integrated logs sidebar
- Real-time status updates

### UI Components

**Navbar.svelte**

- Application navigation bar
- Breadcrumb support
- Action buttons (Save, Export, Settings)
- Status indicator

**Logo.svelte**

- FlowDrop logo component
- Reusable branding element

**CanvasBanner.svelte**

- Empty state message
- Displayed when canvas is empty

**ConnectionLine.svelte**

- Custom connection line styling
- Used during connection creation

**LoadingSpinner.svelte**

- Loading indicator
- Configurable size and text

**MarkdownDisplay.svelte**

- Renders Markdown content
- Used in logs and notes

**ConfigForm.svelte**

- Dynamic form generation
- JSON Schema-based fields

**ConfigModal.svelte**

- Modal dialog for configuration
- Advanced settings interface

## Component Communication

### State Management

- **workflowStore**: Global Svelte store for workflow state
- **workflowActions**: Actions for updating workflow (nodes, edges, config)
- **workflowName**: Derived store for workflow name

### Event Flow

1. **Node Drag**: NodeSidebar → WorkflowEditor → SvelteFlow
2. **Node Config**: Node Click → App.svelte → ConfigSidebar
3. **Node Update**: ConfigSidebar → workflowActions → workflowStore → WorkflowEditor
4. **Save/Export**: Navbar/App → workflowStore → API

### Props Flow

- **Top-Down**: App → WorkflowEditor → UniversalNode → Node Components
- **Callbacks**: Node Components → UniversalNode → WorkflowEditor → App
- **Configuration**: App → ConfigSidebar (node details, schema, values)

## Architecture Patterns

### Component Design

- **BEM CSS Methodology**: Consistent naming (e.g., `flowdrop-sidebar__header`)
- **Svelte 5 Runes**: Using `$state`, `$derived`, `$props`, `$effect`
- **Type Safety**: Full TypeScript support with strict types

### Rendering Strategy

- **Universal Node Pattern**: Single component (UniversalNode) dynamically renders node types
- **Conditional Rendering**: Components rendered based on state/props
- **Reactive Updates**: Svelte reactivity for state changes

### Data Flow

- **Unidirectional**: Props down, events up
- **Global Store**: Workflow state accessible across components
- **API Integration**: Centralized in services layer

## File Structure

```
src/
├── routes/                    # SvelteKit pages
│   ├── +layout.svelte        # Root layout
│   ├── +page.svelte          # Main page
│   └── workflow/             # Workflow routes
│
├── lib/
│   ├── components/           # All Svelte components
│   │   ├── App.svelte       # Main app
│   │   ├── WorkflowEditor.svelte
│   │   ├── UniversalNode.svelte
│   │   ├── NodeSidebar.svelte
│   │   ├── ConfigSidebar.svelte
│   │   ├── Navbar.svelte
│   │   └── ... (other components)
│   │
│   ├── stores/               # Svelte stores
│   │   └── workflowStore.js
│   │
│   ├── services/             # API and business logic
│   │   ├── api.js
│   │   ├── globalSave.js
│   │   └── toastService.js
│   │
│   ├── types/                # TypeScript types
│   │   └── index.d.ts
│   │
│   ├── utils/                # Utility functions
│   │   ├── nodeTypes.js
│   │   ├── nodeStatus.js
│   │   └── nodeWrapper.js
│   │
│   └── helpers/              # Helper functions
│       └── workflowEditorHelper.js
│
└── stories/                  # Storybook stories
    ├── Button.svelte
    ├── Header.svelte
    └── Page.svelte
```

## Key Features

### Node System

- **Universal Node Wrapper**: All node types use UniversalNode for consistent behavior
- **Dynamic Type Switching**: Nodes can change type via configuration
- **Status Overlay**: Automatic execution status display
- **Drag-and-Drop**: Intuitive node placement from sidebar

### Configuration System

- **JSON Schema-based**: Dynamic form generation
- **Type Support**: String, number, boolean, enum, array, object
- **Validation**: Built-in schema validation
- **Hidden Fields**: Preserved during updates

### Pipeline Execution

- **Real-time Status**: Live execution monitoring
- **Node-level Tracking**: Individual node status display
- **Log Integration**: Execution logs with Markdown support
- **Read-only Mode**: Locked workflow during execution

### State Management

- **Global Store**: Centralized workflow state
- **Reactive Updates**: Automatic UI updates on state changes
- **Persistence**: Save to API and local storage
- **Version Control**: Metadata for tracking changes

## Integration Points

### SvelteFlow (Canvas Library)

- **Node Types**: Custom node components registered
- **Edge Handling**: Custom connection line styling
- **Controls**: Zoom, pan, minimap, background
- **Events**: onconnect, onnodeschange, onedgeschange

### API Integration

- **Endpoints**: Workflows, nodes, pipelines, jobs
- **Authentication**: Configurable auth types
- **Error Handling**: Toast notifications
- **Loading States**: Spinner and skeleton screens

### Toast System (svelte-5-french-toast)

- **Notifications**: Success, error, loading states
- **API Feedback**: Operation results
- **Confirmation**: User confirmations

## Development Guidelines

### Adding New Components

1. Create component in `src/lib/components/`
2. Define TypeScript interfaces
3. Use BEM naming for CSS classes
4. Follow Svelte 5 runes syntax
5. Add to component hierarchy documentation

### Adding New Node Types

1. Create node component (e.g., `MyNode.svelte`)
2. Register in UniversalNode.svelte
3. Add to nodeTypes mapping
4. Update nodeTypes utility
5. Define metadata schema

### Modifying State

1. Use workflowActions for updates
2. Never mutate workflowStore directly
3. Use $effect for reactive side effects
4. Keep derived state in $derived

---

**Last Updated**: November 2025
**Version**: 1.0.0

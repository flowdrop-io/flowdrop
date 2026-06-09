/**
 * Built-in Node Components Registration
 * Registers all default FlowDrop node components with the registry.
 *
 * This module is automatically loaded when the library initializes,
 * ensuring all built-in node types are available without user action.
 */

import {
  type NodeComponentRegistration,
  type NodeComponentProps
} from './nodeComponentRegistry.js';
import type { Component } from 'svelte';
import { FLOWDROP_SOURCE } from './builtinNodeTypes.js';
import WorkflowNode from '../components/nodes/WorkflowNode.svelte';
import SimpleNode from '../components/nodes/SimpleNode.svelte';
import SquareNode from '../components/nodes/SquareNode.svelte';
import AtomNode from '../components/nodes/AtomNode.svelte';
import ToolNode from '../components/nodes/ToolNode.svelte';
import GatewayNode from '../components/nodes/GatewayNode.svelte';
import NotesNode from '../components/nodes/NotesNode.svelte';
import TerminalNode from '../components/nodes/TerminalNode.svelte';
import IdeaNode from '../components/nodes/IdeaNode.svelte';

// Pure type metadata + resolution helpers are re-exported for backward
// compatibility — they now live in a component-free module so that
// type-only consumers (e.g. utils/nodeTypes.ts, reachable from `core`) do
// not statically pull in the node components below.
export {
  FLOWDROP_SOURCE,
  BUILTIN_TYPE_ALIASES,
  BUILTIN_NODE_TYPES,
  resolveBuiltinAlias,
  isBuiltinType,
  getBuiltinTypes
} from './builtinNodeTypes.js';
export type { BuiltinNodeType } from './builtinNodeTypes.js';

/**
 * Built-in FlowDrop node component registrations.
 * These are the default node types that ship with FlowDrop.
 */
export const BUILTIN_NODE_COMPONENTS: NodeComponentRegistration[] = [
  {
    type: 'workflowNode',
    displayName: 'Default (Standard Workflow Node)',
    description: 'Full-featured workflow node with inputs/outputs display',
    component: WorkflowNode,
    icon: 'mdi:vector-square',
    category: 'visual',
    source: FLOWDROP_SOURCE,
    statusPosition: 'top-right',
    statusSize: 'md'
  },
  {
    type: 'simple',
    displayName: 'Simple (Compact Layout)',
    description: 'Compact node with header, icon, and description',
    component: SimpleNode,
    icon: 'mdi:card-outline',
    category: 'visual',
    source: FLOWDROP_SOURCE,
    statusPosition: 'top-right',
    statusSize: 'md'
  },
  {
    type: 'square',
    displayName: 'Square (Minimal Icon)',
    description: 'Minimal square node showing only an icon',
    component: SquareNode,
    icon: 'mdi:square',
    category: 'visual',
    source: FLOWDROP_SOURCE,
    statusPosition: 'top-right',
    statusSize: 'sm'
  },
  {
    type: 'atom',
    displayName: 'Atom (Minimal Value/Transform)',
    description: 'Low-chrome label-only node for constants and inline transforms',
    component: AtomNode,
    icon: 'mdi:circle-small',
    category: 'visual',
    source: FLOWDROP_SOURCE,
    statusPosition: 'top-right',
    statusSize: 'sm'
  },
  {
    type: 'tool',
    displayName: 'Tool (Agent Tool)',
    description: 'Specialized node for agent tools with tool metadata',
    component: ToolNode as Component<NodeComponentProps>,
    icon: 'mdi:tools',
    category: 'functional',
    source: FLOWDROP_SOURCE,
    statusPosition: 'top-left',
    statusSize: 'sm'
  },
  {
    type: 'gateway',
    displayName: 'Gateway (Branching)',
    description: 'Branching control flow node with multiple output branches',
    component: GatewayNode,
    icon: 'mdi:source-branch',
    category: 'functional',
    source: FLOWDROP_SOURCE,
    statusPosition: 'top-right',
    statusSize: 'md'
  },
  {
    type: 'note',
    displayName: 'Note (Sticky Note)',
    description: 'Documentation note with markdown support',
    component: NotesNode,
    icon: 'mdi:note-text',
    category: 'layout',
    source: FLOWDROP_SOURCE,
    statusPosition: 'bottom-right',
    statusSize: 'sm'
  },
  {
    type: 'terminal',
    displayName: 'Terminal (Start/End/Exit)',
    description: 'Circular terminal node for workflow start, end, or exit points',
    component: TerminalNode,
    icon: 'mdi:circle-double',
    category: 'functional',
    source: FLOWDROP_SOURCE,
    statusPosition: 'top-right',
    statusSize: 'sm'
  },
  {
    type: 'idea',
    displayName: 'Idea (Conceptual Flow)',
    description: 'Conceptual idea node for BPMN-like flow diagrams',
    component: IdeaNode,
    icon: 'mdi:lightbulb-outline',
    category: 'layout',
    source: FLOWDROP_SOURCE,
    statusPosition: 'top-right',
    statusSize: 'sm'
  }
];

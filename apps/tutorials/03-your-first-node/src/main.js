// Tutorial step 3 — Your first node
// https://flowdrop.io docs: /tutorial/03-your-first-node
//
// FlowDrop needs two things to populate the sidebar:
//   1. Nodes      — the building blocks users drag onto the canvas.
//   2. Categories — groups that organize nodes in the sidebar.
//
// With the single node below defined, the sidebar shows a "Text Input" node
// under the "Inputs" category. Drag it onto the canvas, then click it to see
// the configuration form generated from `configSchema`.

import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import { createEndpointConfig } from '@flowdrop/flowdrop/core';
import '@flowdrop/flowdrop/styles';

// A node is a plain object describing its identity, appearance, and ports.
const textInput = {
  id: 'text_input',
  name: 'Text Input',
  type: 'simple', // Visual style: simple, tool, gateway, terminal, idea, default
  description: 'Simple text input for user data',
  category: 'inputs', // Must match a category id below
  icon: 'mdi:text', // Any Iconify icon (set:name format)
  color: '#22c55e',
  version: '1.0.0',
  inputs: [], // No input ports
  outputs: [
    {
      id: 'text',
      name: 'text',
      type: 'output',
      dataType: 'string',
      description: 'The input text value'
    }
  ],
  // JSON Schema → FlowDrop auto-generates the config form. Here, a single
  // "Placeholder" text field with a default value.
  configSchema: {
    type: 'object',
    properties: {
      placeholder: {
        type: 'string',
        title: 'Placeholder',
        default: 'Enter text...'
      }
    }
  }
};

// A category groups related nodes in the sidebar. Its `id` must match the
// `category` field on the nodes that belong to it.
const inputsCategory = {
  id: 'inputs',
  name: 'Inputs',
  icon: 'mdi:import',
  color: '#22c55e'
};

const app = await mountFlowDropApp(document.getElementById('editor'), {
  nodes: [textInput],
  categories: [inputsCategory],
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  height: '100vh',
  showNavbar: true
});

window.app = app;

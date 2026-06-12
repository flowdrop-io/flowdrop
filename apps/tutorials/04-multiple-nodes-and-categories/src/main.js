// Tutorial step 4 — Multiple nodes & categories
// https://flowdrop.io docs: /tutorial/04-multiple-nodes-and-categories
//
// Adding more nodes follows the same pattern as step 3 — just longer arrays.
// The full definitions live in ./nodes.js (the docs inline them, abbreviated).
//
// Node `type` controls the visual style on the canvas:
//   simple   — compact rounded rectangle
//   tool     — rectangle with a tool badge and extra ports
//   gateway  — diamond (conditional branching)
//   terminal — rounded end-cap (workflow start/end)
//   idea     — sticky-note style (docs/comments)
//   default  — standard rectangle

import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import { createEndpointConfig } from '@flowdrop/flowdrop/core';
import '@flowdrop/flowdrop/styles';
import { nodes, categories } from './nodes.js';

const app = await mountFlowDropApp(document.getElementById('editor'), {
  nodes,
  categories,
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  height: '100vh',
  showNavbar: true
});

window.app = app;

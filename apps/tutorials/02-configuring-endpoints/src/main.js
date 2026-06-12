// Tutorial step 2 — Configuring endpoints
// https://flowdrop.io docs: /tutorial/02-configuring-endpoints
//
// The canvas looks the same as step 1 — but now it knows where your backend API
// lives. FlowDrop is a frontend editor that talks to a backend for loading
// nodes, saving workflows, executing pipelines, etc.
//
// You don't need a running backend to follow along: with `endpointConfig` set,
// the editor initializes correctly and only calls your API when an action
// (save, load, execute) is actually triggered.

import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import { createEndpointConfig } from '@flowdrop/flowdrop/core';
import '@flowdrop/flowdrop/styles';

// `createEndpointConfig` generates a full endpoint map from a single base URL:
//   GET  /api/flowdrop/nodes
//   GET  /api/flowdrop/categories
//   PUT  /api/flowdrop/workflows/{id}
//   POST /api/flowdrop/workflows/{id}/execute   ...etc.
const endpointConfig = createEndpointConfig('/api/flowdrop');

// You can override individual settings with a second argument, e.g.:
//
//   createEndpointConfig('/api/v2/flowdrop', {
//     timeout: 60000,
//     retry: { enabled: true, maxAttempts: 5, delay: 2000, backoff: 'exponential' }
//   });

const app = await mountFlowDropApp(document.getElementById('editor'), {
  endpointConfig,
  height: '100vh'
});

window.app = app;

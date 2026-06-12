// Tutorial step 5 — Saving workflows
// https://flowdrop.io docs: /tutorial/05-saving-workflows
//
// A pre-built workflow is loaded so clicking "Save" in the toolbar runs the
// save flow. FlowDrop sends the workflow JSON (nodes + edges) to your API's
// PUT /api/flowdrop/workflows/{id} endpoint. The `eventHandlers` below let you
// hook into the workflow lifecycle without writing any backend.

import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import { createEndpointConfig } from '@flowdrop/flowdrop/core';
import '@flowdrop/flowdrop/styles';
import { nodes, categories } from './nodes.js';
import { prebuiltWorkflow } from './workflow.js';

const app = await mountFlowDropApp(document.getElementById('editor'), {
  nodes,
  categories,
  workflow: prebuiltWorkflow,
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  height: '100vh',
  showNavbar: true,

  eventHandlers: {
    // Called before save — return false to cancel.
    onBeforeSave: async (workflow) => {
      console.log('Saving workflow:', workflow.name);
      const isValid = workflow.nodes.length > 0;
      return isValid;
    },

    // Called after a successful save.
    onAfterSave: async (workflow) => {
      console.log('Workflow saved!', workflow.id);
    },

    // Called when a save fails (e.g. no backend is running — expected here).
    onSaveError: async (error, workflow) => {
      console.error('Save failed:', error.message);
    },

    // Called on any workflow change. `changeType` is one of:
    //   node_add, node_remove, node_move, node_config,
    //   edge_add, edge_remove, metadata, name, description
    onWorkflowChange: (workflow, changeType) => {
      console.log(`Change: ${changeType}`);
    },

    // Called when the dirty (unsaved-changes) state flips.
    onDirtyStateChange: (isDirty) => {
      document.title = isDirty
        ? '* Saving workflows — FlowDrop tutorial'
        : 'Saving workflows — FlowDrop tutorial';
    }
  }
});

window.app = app;

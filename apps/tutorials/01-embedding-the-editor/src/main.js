// Tutorial step 1 — Embedding the editor
// https://flowdrop.io docs: /tutorial/01-embedding-the-editor
//
// The most minimal FlowDrop setup: an empty canvas, no nodes in the sidebar,
// no workflow loaded. Even empty, you can zoom (scroll wheel) and pan
// (click and drag the background).

import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import '@flowdrop/flowdrop/styles';

const app = await mountFlowDropApp(document.getElementById('editor'), {
  height: '100vh'
});

// `mountFlowDropApp` returns a controller you can use later:
//
//   app.isDirty();      // → true if there are unsaved changes
//   app.getWorkflow();  // → the current workflow data
//   app.destroy();      // → tear the editor down when you're done
//
// Exposed on window here only so you can poke at it from the devtools console.
window.app = app;

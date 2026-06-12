import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// @flowdrop/flowdrop ships its components as `.svelte` source, so even when you
// use the vanilla `mountFlowDropApp` API you need the Svelte plugin to compile
// them. Nothing in your own app has to be written in Svelte.
export default defineConfig({
  plugins: [svelte()],
  // The docs use top-level `await mountFlowDropApp(...)`, which needs a target
  // that supports top-level await.
  build: { target: 'es2022' },
  server: {
    // Forward FlowDrop API calls to the reference Express server
    // (apps/example-server-express, `pnpm dev` → http://localhost:7104).
    // This keeps the relative `/api/flowdrop` base URL working in dev, the
    // same way it would in a same-origin production deploy.
    proxy: { '/api': 'http://localhost:7104' }
  }
});

// Use adapter-node for production builds (Docker, Node.js)
// Use adapter-auto for development (will auto-detect)
import adapterNode from "@sveltejs/adapter-node";
import adapterAuto from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Use adapter-node in production/Docker builds, auto for development
const isProduction =
  process.env.NODE_ENV === "production" || process.env.DOCKER_BUILD === "true";
const adapter = isProduction ? adapterNode : adapterAuto;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  // Enable Svelte 5 runes mode
  compilerOptions: {
    runes: true,
  },

  // Allow addon-svelte-csf's LegacyTemplate.svelte to use `export let`
  vitePlugin: {
    dynamicCompileOptions({ filename }) {
      if (filename.includes("LegacyTemplate.svelte")) {
        return { runes: false };
      }
    },
  },

  kit: {
    // Use adapter-node for production/Docker, adapter-auto for development
    adapter: adapter(),

    // Ensure API routes are server-side only
    csrf: {
      // Configure trusted origins based on your deployment
      // In production, set this via environment variable
      trustedOrigins: process.env.TRUSTED_ORIGINS
        ? process.env.TRUSTED_ORIGINS.split(",")
        : [],
    },
  },
};

export default config;

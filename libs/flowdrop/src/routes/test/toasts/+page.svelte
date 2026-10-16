<!--
  Toast Test Page

  Fixture for the toast stack: buttons for each kind, in one editor scope (skin from
  `?theme=`, light/dark from `?scheme=` or the page's colour scheme). `?fire=error,success`
  shows those toasts on load, for screenshots.

  The page brings its own Toaster inside the scope; the layout skips its own on this
  route (it sits outside the scope, so it would show every toast twice, unthemed).
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Toaster } from 'svelte-5-french-toast';
  import { initializeSettings } from '$lib/stores/settingsStore.svelte.js';
  import { themeScope } from '$lib/utils/themeScope.svelte.js';
  import { resolveTheme } from '$lib/themes/index.js';
  import { buildScopedSkinCss } from '$lib/themes/scopedSkinCss.js';
  import {
    FLOWDROP_TOASTER_CLASS,
    flowdropToastOptions,
    showError,
    showInfo,
    showSuccess,
    showWarning
  } from '$lib/services/toastService.js';

  const SCOPE = 'toast-fixture';

  const themeName = $derived(
    ($page.url.searchParams.get('theme') ?? undefined) as 'default' | 'graphite' | undefined
  );

  let actionRuns = $state(0);
  let successCount = 0;

  const fire: Record<string, () => void> = {
    error: () =>
      showError({
        title: "Couldn't save",
        body: 'The workflow has 2 problems.',
        details: [
          'Messenger: input "Message" is not connected',
          'Prompt Template: variable "name" has no source'
        ],
        action: { label: 'Show problems', onClick: () => (actionRuns += 1) }
      }),
    'error-short': () => showError('Network request failed'),
    warning: () =>
      showWarning({ title: 'Two config keys were ignored', body: 'They are not in the schema.' }),
    success: () => showSuccess(`Saved${successCount++ ? ` (${successCount})` : ''}`),
    info: () => showInfo('Workflow execution started')
  };

  onMount(() => {
    const scheme = $page.url.searchParams.get('scheme');
    if (scheme === 'dark' || scheme === 'light') {
      void initializeSettings({ defaults: { theme: { preference: scheme } } });
    }
    const resolved = resolveTheme(themeName);
    const css = buildScopedSkinCss(SCOPE, resolved.skin, resolved.config?.display);
    let style: HTMLStyleElement | undefined;
    if (css) {
      style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }
    for (const name of ($page.url.searchParams.get('fire') ?? '').split(',')) {
      fire[name]?.();
    }
    return () => style?.remove();
  });
</script>

<div
  class="flowdrop-root"
  use:themeScope
  data-fd-scope={SCOPE}
  data-testid="toast-fixture"
  style="padding: 2rem; background: var(--fd-background); min-height: 100vh;"
>
  <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
    {#each Object.keys(fire) as name (name)}
      <button type="button" data-testid="fire-{name}" onclick={() => fire[name]()}>{name}</button>
    {/each}
  </div>
  <p data-testid="action-runs">{actionRuns}</p>

  <Toaster
    position="top-center"
    containerClassName={FLOWDROP_TOASTER_CLASS}
    toastOptions={flowdropToastOptions}
  />
</div>

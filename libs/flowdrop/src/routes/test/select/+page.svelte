<!--
  Select Test Page

  Fixture for the Select primitive: every rendering state in one editor scope
  (skin from `?theme=`, light/dark from the page's colour scheme). Plain-looking
  on purpose; the visual states live in Storybook, this page is for the
  browser-level checks (keyboard flow, axe, screenshots).

  Used by: tests/e2e/select.spec.ts
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initializeSettings } from '$lib/stores/settingsStore.svelte.js';
  import { themeScope } from '$lib/utils/themeScope.svelte.js';
  import Select from '$lib/components/primitives/Select.svelte';
  import { resolveTheme } from '$lib/themes/index.js';
  import { buildScopedSkinCss } from '$lib/themes/scopedSkinCss.js';
  import type { SelectOption } from '$lib/utils/selectOptions.js';

  const SCOPE = 'select-fixture';

  const themeName = $derived(
    ($page.url.searchParams.get('theme') ?? undefined) as 'default' | 'graphite' | undefined
  );

  onMount(() => {
    // `?scheme=dark|light` pins the page's colour scheme (otherwise the settings store decides).
    const scheme = $page.url.searchParams.get('scheme');
    if (scheme === 'dark' || scheme === 'light') {
      void initializeSettings({ defaults: { theme: { preference: scheme } } });
    }
    const resolved = resolveTheme(themeName);
    const css = buildScopedSkinCss(SCOPE, resolved.skin, resolved.config?.display);
    if (!css) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  });

  const formats: SelectOption[] = [
    { value: 'plain', label: 'Plain text' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'html', label: 'HTML' },
    { value: 'json', label: 'JSON' }
  ];

  const ports: SelectOption[] = [
    {
      value: 'a',
      label: 'chat_message',
      description: 'The chat message content',
      group: 'Chat Output'
    },
    {
      value: 'b',
      label: 'chat_reply',
      description: 'The reply shown to the user',
      group: 'Chat Output'
    },
    {
      value: 'c',
      label: 'chat_message',
      description: 'The chat message content',
      group: 'Final Chat Output'
    },
    { value: 'd', label: 'text', description: 'Result of the run', group: 'Run workflow' },
    {
      value: 'e',
      label: 'metadata',
      description: 'Run metadata',
      group: 'Run workflow',
      disabled: true
    }
  ];

  const many: SelectOption[] = Array.from({ length: 42 }, (_, i) => ({
    value: `m${i}`,
    label: `Model ${i + 1}`
  }));

  let format = $state('markdown');
  let port = $state('c');
  let model = $state('m3');
</script>

<div
  class="flowdrop-root"
  use:themeScope
  data-fd-scope={SCOPE}
  data-testid="select-fixture"
  style="padding: 2rem; background: var(--fd-background); min-height: 100vh;"
>
  <div style="display: grid; grid-template-columns: repeat(3, 340px); gap: 2rem 2.5rem;">
    <section>
      <label for="s-native">Message format (native)</label>
      <Select id="s-native" options={formats} value={format} onValueChange={(v) => (format = v)} />
      <p data-testid="native-value">{format}</p>
    </section>
    <section>
      <label for="s-grouped">Chat reply port (grouped, described)</label>
      <Select id="s-grouped" options={ports} value={port} onValueChange={(v) => (port = v)} />
      <p data-testid="grouped-value">{port}</p>
    </section>
    <section>
      <label for="s-long">Model (42 options)</label>
      <Select id="s-long" options={many} value={model} onValueChange={(v) => (model = v)} />
      <p data-testid="long-value">{model}</p>
    </section>
    <section>
      <label for="s-forced">Forced searchable</label>
      <Select id="s-forced" options={formats} value="json" searchable />
    </section>
    <section>
      <label for="s-disabled">Disabled native</label>
      <Select id="s-disabled" options={formats} value="html" disabled />
    </section>
    <section>
      <label for="s-disabled-search">Disabled searchable</label>
      <Select id="s-disabled-search" options={ports} value="c" disabled />
    </section>
  </div>
</div>

<script lang="ts">
  import '@flowdrop/flowdrop/styles';
  import { Navbar } from '@flowdrop/flowdrop/editor';
  import type { NavbarAction } from '@flowdrop/flowdrop/core';
  import { page } from '$app/state';

  let { children } = $props();

  const navLinks = [
    { label: 'Home', href: '/', icon: 'mdi:home-outline' },
    { label: 'Default', href: '/themes/default' },
    { label: 'Minimal', href: '/themes/minimal' },
    { label: 'Drafter', href: '/themes/drafter' }
  ];

  const isActive = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

  // Map our routes onto FlowDrop's own Navbar (LogoWordmark + responsive action
  // row that collapses to a dropdown on narrow viewports). The active route
  // renders as the filled `primary` variant; the rest as quiet `secondary`.
  // GitHub is grouped so it drops into the overflow flyout rather than the row.
  const actions = $derived<NavbarAction[]>([
    ...navLinks.map((l) => ({
      label: l.label,
      href: l.href,
      icon: l.icon,
      variant: isActive(l.href) ? ('primary' as const) : ('secondary' as const)
    })),
    {
      label: 'GitHub',
      href: 'https://github.com/flowdrop-io/flowdrop',
      icon: 'mdi:github',
      external: true,
      variant: 'secondary' as const,
      group: 'Links'
    }
  ]);
</script>

<div class="shell">
  <!--
    Expose the settings gear so visitors can switch the theme (light/dark/auto)
    themselves. Settings are page-global (the store is shared across mounted
    instances and theme is applied to the document), so this single gear drives
    every demo. Limited to the Theme tab — the other categories (API, behavior)
    don't apply to this static, backendless demo.
  -->
  <Navbar
    primaryActions={actions}
    showStatus={false}
    showSettings={true}
    settingsCategories={['theme']}
    showSettingsSyncButton={false}
  />
  <main>
    {@render children()}
  </main>
</div>

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
  }

  .shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      'Segoe UI',
      Roboto,
      Helvetica,
      Arial,
      sans-serif;
    color: #0f172a;
    background: #ffffff;
  }

  main {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>

/**
 * Navbar branding: the default wordmark is named by the appName message; a
 * `branding.logo` string renders an <img> (alt = logoAlt, else appName), a
 * component renders in place, and `href` wraps either in a link.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Navbar from '$lib/components/Navbar.svelte';
import LogoWordmark from '$lib/components/LogoWordmark.svelte';
import type { NavbarBranding } from '$lib/types/navbar.js';

let app: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function render(branding?: NavbarBranding) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(Navbar, { target, props: { branding, showSettings: false, showStatus: false } });
  flushSync();
  return target.querySelector('.flowdrop-navbar__start') as HTMLElement;
}

describe('Navbar branding', () => {
  it('renders the default wordmark named by appName, unlinked', () => {
    const start = render();
    const logo = start.querySelector('[role="img"]');
    expect(logo?.getAttribute('aria-label')).toBe('FlowDrop');
    expect(logo?.getAttribute('title')).toBe('FlowDrop');
    expect(start.querySelector('svg')).not.toBeNull();
    expect(start.querySelector('a')).toBeNull();
  });

  it('renders an image logo with logoAlt as alt text', () => {
    const start = render({ logo: '/acme.svg', logoAlt: 'Acme' });
    const img = start.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/acme.svg');
    expect(img?.getAttribute('alt')).toBe('Acme');
    expect(start.querySelector('svg')).toBeNull();
  });

  it('falls back to appName for the alt text', () => {
    const start = render({ logo: '/acme.svg' });
    expect(start.querySelector('img')?.getAttribute('alt')).toBe('FlowDrop');
  });

  it('renders a component logo in place, labelled', () => {
    const start = render({ logo: LogoWordmark, logoAlt: 'Acme' });
    const wrapper = start.querySelector('[role="img"]');
    expect(wrapper?.getAttribute('aria-label')).toBe('Acme');
    expect(wrapper?.querySelector('svg')).not.toBeNull();
    expect(start.querySelector('img')).toBeNull();
  });

  it('wraps the logo in a link when href is set', () => {
    const start = render({ logo: '/acme.svg', href: 'https://example.com' });
    const link = start.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.querySelector('img')).not.toBeNull();
  });
});

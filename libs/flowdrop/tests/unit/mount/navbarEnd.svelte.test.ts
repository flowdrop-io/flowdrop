/**
 * `mountFlowDropApp` turns the `navbarEnd` element callback into a snippet for
 * the editor. App itself is replaced by a stub that records its props and renders
 * the snippet into a container, so what is under test is the mount function's
 * conversion (the e2e test covers the real navbar).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Snippet } from 'svelte';
import type { Workflow } from '../../../src/lib/types/index.js';
import { logger } from '../../../src/lib/utils/logger.js';
import { DEFAULT_PORT_CONFIG } from '../../../src/lib/config/defaultPortConfig.js';

const received: Record<string, unknown>[] = [];

vi.mock('../../../src/lib/components/App.svelte', () => ({
  default: (_anchor: unknown, props: Record<string, unknown>) => {
    received.push(props);
  }
}));

const { mountFlowDropApp } = await import('../../../src/lib/svelte-app.js');

/** Render a snippet into a target inside an effect root; returns a stop function. */
function renderSnippet(snippet: Snippet, target: HTMLElement): () => void {
  const anchor = document.createComment('');
  target.appendChild(anchor);
  return $effect.root(() => {
    snippet(anchor as unknown as Comment);
  });
}

const workflow: Workflow = {
  id: 'wf-navbar-end',
  name: 'Navbar end',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
};

window.matchMedia = ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {}
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

afterEach(() => {
  received.length = 0;
  document.body.innerHTML = '';
});

async function mountApp(
  navbarEnd?: (target: HTMLElement) => void | (() => void),
  showNavbar = true
) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return mountFlowDropApp(el, {
    workflow,
    portConfig: DEFAULT_PORT_CONFIG,
    categories: [],
    features: { showToasts: false, autoSaveDraft: false },
    showNavbar,
    navbarEnd
  });
}

describe('mountFlowDropApp({ navbarEnd })', () => {
  it('passes no snippet when the option is absent', async () => {
    const app = await mountApp();
    expect(received[0].navbarEnd).toBeUndefined();
    app.destroy();
  });

  it('builds a snippet that calls the callback with a host element and runs its cleanup', async () => {
    const cleanup = vi.fn();
    const callback = vi.fn((target: HTMLElement) => {
      target.append('Ada');
      return cleanup;
    });
    const app = await mountApp(callback);
    expect(typeof received[0].navbarEnd).toBe('function');

    const target = document.createElement('div');
    document.body.appendChild(target);
    const stop = renderSnippet(received[0].navbarEnd as Snippet, target);

    const el = target.querySelector('.flowdrop-navbar__host-end');
    expect(el).not.toBeNull();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toBe(el);
    expect(el!.textContent).toBe('Ada');
    expect(cleanup).not.toHaveBeenCalled();

    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
    app.destroy();
  });

  it('accepts a callback that returns nothing', async () => {
    const app = await mountApp((target) => {
      target.append('x');
    });
    const target = document.createElement('div');
    document.body.appendChild(target);
    const stop = renderSnippet(received[0].navbarEnd as Snippet, target);
    expect(() => stop()).not.toThrow();
    app.destroy();
  });

  it('logs and carries on when the callback throws', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const app = await mountApp(() => {
      throw new Error('boom');
    });
    const target = document.createElement('div');
    document.body.appendChild(target);
    let stop = () => {};
    expect(() => {
      stop = renderSnippet(received[0].navbarEnd as Snippet, target);
    }).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain('[FlowDrop]');
    expect(() => stop()).not.toThrow();
    error.mockRestore();
    app.destroy();
  });

  it('warns when showNavbar is not true, and stays quiet when it is', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const hidden = await mountApp(() => {}, false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('navbar is hidden');
    hidden.destroy();

    warn.mockClear();
    const shown = await mountApp(() => {});
    expect(warn).not.toHaveBeenCalled();
    shown.destroy();
    warn.mockRestore();
  });
});

/**
 * The standalone Playground is deprecated in favour of the editor's Test mode:
 * it warns on the console once per page (not once per instance), and the
 * docked Playground, which is built on PlaygroundSurface, never warns.
 * Mounted for real (client build, happy-dom), every request answered 404.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import Playground from '$lib/components/playground/Playground.svelte';
import PlaygroundSurface from '$lib/components/playground/PlaygroundSurface.svelte';
import DockedPlayground from '$lib/components/playground/DockedPlayground.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { defaultEndpointConfig } from '$lib/config/endpoints.js';
import {
  STANDALONE_PLAYGROUND_DEPRECATION,
  resetStandalonePlaygroundDeprecation,
  warnStandalonePlaygroundDeprecated
} from '$lib/utils/deprecation.js';
import type { Workflow } from '$lib/types/index.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const originalFetch = global.fetch;
let apps: ReturnType<typeof mount>[] = [];
let warn: ReturnType<typeof vi.spyOn>;

const workflow: Workflow = {
  id: 'wf',
  name: 'wf',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' }
};

beforeEach(() => {
  resetStandalonePlaygroundDeprecation();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = vi.fn(
    async () =>
      new Response('{"success":false}', {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
  ) as typeof fetch;
});

afterEach(() => {
  for (const app of apps) unmount(app);
  apps = [];
  document.body.innerHTML = '';
  global.fetch = originalFetch;
  warn.mockRestore();
});

const deprecationWarnings = () =>
  warn.mock.calls.filter((call) => call[0] === STANDALONE_PLAYGROUND_DEPRECATION);

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();
  }
  flushSync();
}

function mountInto(component: typeof Playground | typeof PlaygroundSurface, extra = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  apps.push(
    mount(component as typeof Playground, {
      target,
      props: {
        instance: createFlowDropInstance(),
        workflowId: 'wf',
        workflow,
        endpointConfig: defaultEndpointConfig,
        ...extra
      }
    })
  );
}

describe('standalone Playground deprecation', () => {
  it('warns once per page, not once per instance', async () => {
    mountInto(Playground);
    mountInto(Playground);
    await settle();

    expect(deprecationWarnings()).toHaveLength(1);
    expect(String(deprecationWarnings()[0][0])).toContain('Test mode');
    expect(String(deprecationWarnings()[0][0])).toContain('3.0');
  });

  it('warns once however often the helper is called', () => {
    warnStandalonePlaygroundDeprecated();
    warnStandalonePlaygroundDeprecated();
    warnStandalonePlaygroundDeprecated();
    expect(deprecationWarnings()).toHaveLength(1);
  });

  it('does not warn for the surface the docked Playground is built on', async () => {
    mountInto(PlaygroundSurface, { mode: 'embedded' });
    await settle();
    expect(deprecationWarnings()).toHaveLength(0);
  });

  it('does not warn for the docked Playground', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    apps.push(
      mount(DockedPlayground, {
        target,
        props: { workflow }
      } as never)
    );
    await settle();
    expect(deprecationWarnings()).toHaveLength(0);
  });
});

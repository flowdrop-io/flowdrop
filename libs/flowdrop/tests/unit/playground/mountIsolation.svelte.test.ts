/**
 * Two playgrounds mounted without an `instanceId` must not share the default
 * instance: the first owns it (legacy behavior), the second gets an isolated
 * instance with its own polling service, and destroying one never stops or
 * resets the other. Also pins the per-instance PlaygroundService wiring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaygroundService, playgroundService } from '$lib/services/playgroundService.js';
import {
  createFlowDropInstance,
  getDefaultInstance
} from '$lib/stores/instanceContainer.svelte.js';
import { mountPlayground } from '$lib/playground/mount.js';

// The components are not under test; a Svelte 5 component is just a function.
vi.mock('$lib/components/playground/Playground.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/playground/PlaygroundModal.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/playground/PlaygroundStudio.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/playground/PlaygroundApp.svelte', () => ({ default: () => {} }));

const endpointConfig = { baseUrl: 'http://localhost/api', endpoints: {} } as never;

beforeEach(() => {
  window.matchMedia = ((q: string) =>
    ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {}
    }) as MediaQueryList) as typeof window.matchMedia;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ data: [], sessionStatus: 'running' }) }))
  );
});

afterEach(() => {
  playgroundService.stopPolling();
  vi.unstubAllGlobals();
});

function startFakePolling(svc: PlaygroundService, sessionId: string): void {
  svc.startPolling(
    { baseUrl: 'http://localhost/api', endpoints: {} } as never,
    sessionId,
    () => {}
  );
}

describe('FlowDropInstance.playgroundService', () => {
  it('the default instance uses the legacy singleton', () => {
    expect(getDefaultInstance().playgroundService).toBe(playgroundService);
  });

  it('other instances own a separate service', () => {
    const a = createFlowDropInstance({ id: 'svc-a' });
    const b = createFlowDropInstance({ id: 'svc-b' });
    expect(a.playgroundService).not.toBe(playgroundService);
    expect(a.playgroundService).not.toBe(b.playgroundService);
    a.destroy();
    b.destroy();
  });

  it('two non-default instances poll independently', () => {
    const a = createFlowDropInstance({ id: 'poll-a' });
    const b = createFlowDropInstance({ id: 'poll-b' });
    startFakePolling(a.playgroundService, 's-a');
    startFakePolling(b.playgroundService, 's-b');
    expect(a.playgroundService.getPollingSessionId()).toBe('s-a');
    expect(b.playgroundService.getPollingSessionId()).toBe('s-b');

    a.playgroundService.stopPolling();
    expect(a.playgroundService.isPolling()).toBe(false);
    expect(b.playgroundService.isPolling()).toBe(true);
    b.destroy();
    a.destroy();
  });

  it('destroying a non-default instance stops its own polling only', () => {
    const a = createFlowDropInstance({ id: 'destroy-a' });
    startFakePolling(a.playgroundService, 's-a');
    startFakePolling(playgroundService, 's-default');
    a.destroy();
    expect(a.playgroundService.isPolling()).toBe(false);
    expect(playgroundService.isPolling()).toBe(true);
  });

  it('legacy playgroundService.stopPolling() still stops the default instance', () => {
    const d = getDefaultInstance();
    startFakePolling(d.playgroundService, 's-d');
    playgroundService.stopPolling();
    expect(d.playgroundService.isPolling()).toBe(false);
  });
});

describe('mountPlayground without an instanceId', () => {
  async function mountOne() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return mountPlayground(container, { workflowId: 'wf', endpointConfig });
  }

  it('first mount gets the default, the second an isolated instance', async () => {
    const first = await mountOne();
    const second = await mountOne();

    // First owns the default: its stopPolling reaches the legacy singleton.
    startFakePolling(playgroundService, 's-first');
    second.stopPolling();
    expect(playgroundService.isPolling()).toBe(true);
    first.stopPolling();
    expect(playgroundService.isPolling()).toBe(false);

    first.destroy();
    second.destroy();
  });

  it('destroying the second does not reset or stop the first', async () => {
    const first = await mountOne();
    const second = await mountOne();
    const session = {
      id: 's1',
      workflowId: 'wf',
      name: 'S',
      status: 'idle',
      createdAt: '',
      updatedAt: ''
    } as never;
    getDefaultInstance().playground.setCurrentSession(session);
    startFakePolling(playgroundService, 's1');

    second.destroy();

    expect(getDefaultInstance().playground.currentSession?.id).toBe('s1');
    expect(playgroundService.isPolling()).toBe(true);
    expect(first.getCurrentSession()?.id).toBe('s1');

    first.destroy();
    // The owner of the default still does the legacy reset.
    expect(getDefaultInstance().playground.currentSession).toBeNull();
    expect(playgroundService.isPolling()).toBe(false);
  });

  it('releases the default claim on destroy and ignores a second destroy', async () => {
    const first = await mountOne();
    first.destroy();
    const again = await mountOne(); // default is free again
    first.destroy(); // must not release again's claim
    const third = await mountOne(); // default still claimed by `again`
    startFakePolling(playgroundService, 's-again');
    third.stopPolling();
    expect(playgroundService.isPolling()).toBe(true);
    third.destroy();
    again.destroy();
  });

  it('an explicit instanceId always gets its own instance', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mounted = await mountPlayground(container, {
      workflowId: 'wf',
      endpointConfig,
      instanceId: 'explicit'
    });
    startFakePolling(playgroundService, 's-default');
    mounted.stopPolling();
    expect(playgroundService.isPolling()).toBe(true);
    mounted.destroy();
  });
});

/**
 * Tests for the impact service: the pre-save impact check.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkImpact, impactSupported } from '$lib/services/impactService.js';
import { createEndpointConfig } from '$lib/config/endpoints.js';
import type { AuthProvider } from '$lib/types/auth.js';
import type { Workflow } from '$lib/types/index.js';

const draft = { id: 'wf1', name: 'Draft', nodes: [], edges: [] } as unknown as Workflow;
const authProvider: AuthProvider = {
  getAuthHeaders: async () => ({ Authorization: 'Bearer t1' })
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('impactService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const config = createEndpointConfig('https://api.example.com');

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports support from the config', () => {
    expect(impactSupported(config)).toBe(true);
    expect(impactSupported(null)).toBe(false);
    const without = structuredClone(config);
    delete without.endpoints.workflows.impact;
    expect(impactSupported(without)).toBe(false);
  });

  it('answers unavailable without a configured route and does not fetch', async () => {
    const without = structuredClone(config);
    delete without.endpoints.workflows.impact;
    expect(await checkImpact(without, authProvider, 'wf1', draft)).toEqual({
      status: 'unavailable'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses an ok answer', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          confirm: true,
          interface: { level: 'major', breaking: true, changes: [] },
          renames: [],
          items: [
            { kind: 'workflow', severity: 'breaks', label: 'Caller', message: 'Breaks', url: '/x' },
            { kind: 'profile', severity: 'changes', label: 'Profile', message: 'Changes' }
          ]
        }
      })
    );
    const result = await checkImpact(config, authProvider, 'wf1', draft);
    expect(result).toEqual({
      status: 'ok',
      report: {
        confirm: true,
        interfaceLevel: 'major',
        interfaceBreaking: true,
        items: [
          { kind: 'workflow', severity: 'breaks', label: 'Caller', message: 'Breaks', url: '/x' },
          { kind: 'profile', severity: 'changes', label: 'Profile', message: 'Changes', url: null }
        ]
      }
    });
  });

  it('drops malformed items and maps an unknown severity to info', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          confirm: false,
          interface: { level: 'none', breaking: false },
          items: [
            null,
            'text',
            { label: 'No message' },
            { kind: 'k', severity: 'dire', label: 'Odd', message: 'Odd one', url: 5 }
          ]
        }
      })
    );
    const result = await checkImpact(config, authProvider, 'wf1', draft);
    expect(result).toEqual({
      status: 'ok',
      report: {
        confirm: false,
        interfaceLevel: 'none',
        interfaceBreaking: false,
        items: [{ kind: 'k', severity: 'info', label: 'Odd', message: 'Odd one', url: null }]
      }
    });
  });

  it('answers unavailable on 404 and 405', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 405));
    expect(await checkImpact(config, authProvider, 'wf1', draft)).toEqual({
      status: 'unavailable'
    });
    expect(await checkImpact(config, authProvider, 'wf1', draft)).toEqual({
      status: 'unavailable'
    });
  });

  it('answers the server error text on 500', async () => {
    fetchMock.mockResolvedValue(json({ error: 'Boom' }, 500));
    expect(await checkImpact(config, authProvider, 'wf1', draft)).toEqual({
      status: 'error',
      message: 'Boom'
    });
  });

  it('posts the draft as JSON with auth headers to the workflow route', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: {} }));
    await checkImpact(config, authProvider, 'wf1', draft);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/workflow/wf1/impact');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(draft);
    expect(init.headers).toMatchObject({ Authorization: 'Bearer t1' });
  });
});

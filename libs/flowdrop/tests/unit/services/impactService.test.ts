/**
 * Tests for the impact service: the pre-save impact check.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkImpact,
  impactSupported,
  isSafeCopyUrl,
  saveAsCopy
} from '$lib/services/impactService.js';
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

  it.each([401, 403, 404, 405])('answers unavailable on HTTP %i', async (status) => {
    fetchMock.mockResolvedValue(json({ error: 'nope' }, status));
    expect(await checkImpact(config, authProvider, 'wf1', draft)).toEqual({
      status: 'unavailable'
    });
  });

  it('still reports a server failure as an error', async () => {
    fetchMock.mockResolvedValue(json({ error: 'boom' }, 500));
    expect(await checkImpact(config, authProvider, 'wf1', draft)).toEqual({
      status: 'error',
      message: 'boom'
    });
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
        refused: false,
        refusedMessage: null,
        copyUrl: null,
        renames: [],
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
        refused: false,
        refusedMessage: null,
        copyUrl: null,
        renames: [],
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

  it('reads the refusal, the copy url and the renames of a newer backend', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          confirm: true,
          refused: true,
          refusedMessage: 'Two places use it.',
          copyUrl: '/workflow/wf1/copy',
          interface: { level: 'major', breaking: true },
          items: [],
          renames: [
            {
              direction: 'output',
              from: 'node',
              to: 'article',
              // The shape fddo sends: no severity, no message.
              places: [
                { kind: 'block', label: 'Tags', url: '/admin/block/tags', enabled: false },
                { kind: 'block', url: null }
              ]
            },
            { direction: 'input', from: 1 },
            null
          ]
        }
      })
    );
    const result = await checkImpact(config, authProvider, 'wf1', draft);
    expect(result.status === 'ok' && result.report).toMatchObject({
      refused: true,
      refusedMessage: 'Two places use it.',
      copyUrl: '/workflow/wf1/copy',
      renames: [
        {
          direction: 'output',
          from: 'node',
          to: 'article',
          places: [{ kind: 'block', label: 'Tags', url: '/admin/block/tags', enabled: false }]
        }
      ]
    });
  });

  it('keeps the first of two renames with the same direction and name', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          renames: [
            { direction: 'input', from: 'a', to: 'b', places: [] },
            { direction: 'input', from: 'a', to: 'c', places: [] },
            { direction: 'output', from: 'a', to: 'd', places: [] }
          ]
        }
      })
    );
    const result = await checkImpact(config, authProvider, 'wf1', draft);
    const renames = result.status === 'ok' ? result.report.renames : [];
    expect(renames?.map((r) => `${r.direction}:${r.from}>${r.to}`)).toEqual([
      'input:a>b',
      'output:a>d'
    ]);
  });

  it('accepts a copy url that is a path or on the API origin, and no other', () => {
    expect(isSafeCopyUrl(config, '/api/flowdrop/workflows/wf1/copy')).toBe(true);
    expect(isSafeCopyUrl(config, 'https://api.example.com/other/copy')).toBe(true);
    expect(isSafeCopyUrl(config, `${window.location.origin}/copy`)).toBe(true);
    expect(isSafeCopyUrl(config, '/\t/other.example.com/copy')).toBe(false);
    expect(isSafeCopyUrl(config, 'https://other.example.com/copy')).toBe(false);
    expect(isSafeCopyUrl(config, '//other.example.com/copy')).toBe(false);
    expect(isSafeCopyUrl(config, '/\\other.example.com/copy')).toBe(false);
    expect(isSafeCopyUrl(config, 'workflow/copy')).toBe(false);
    expect(isSafeCopyUrl(config, 'javascript:alert(1)')).toBe(false);
  });

  it('saveAsCopy sends nothing to another origin', async () => {
    await expect(
      saveAsCopy(config, authProvider, 'https://other.example.com/copy', draft)
    ).rejects.toThrow('not on this server');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saveAsCopy posts the draft to the copy url and names the copy', async () => {
    fetchMock.mockResolvedValue(
      json({ success: true, data: { id: 7, editorUrl: '/admin/flowdrop/7/edit' } })
    );
    // A path is a path on this site, as Drupal's Url::toString() writes it, never one under the API base.
    const copy = await saveAsCopy(config, authProvider, '/api/flowdrop/workflows/wf1/copy', draft);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${window.location.origin}/api/flowdrop/workflows/wf1/copy`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(draft);
    expect(copy).toEqual({ id: '7', editorUrl: '/admin/flowdrop/7/edit' });
  });

  it('saveAsCopy keeps only an editor url the page may go to', async () => {
    for (const [given, kept] of [
      ['https://cms.example.com/admin/7', 'https://cms.example.com/admin/7'],
      ['/admin/7', '/admin/7'],
      ['javascript:alert(1)', null],
      ['/\\other.example.com', null],
      ['//other.example.com', null],
      ['/admin/\n7', null]
    ] as const) {
      fetchMock.mockResolvedValueOnce(json({ success: true, data: { id: 7, editorUrl: given } }));
      const copy = await saveAsCopy(config, authProvider, '/workflow/wf1/copy', draft);
      expect(copy.editorUrl).toBe(kept);
    }
  });

  it('saveAsCopy throws the backend reason when it refuses', async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: 'No access' }, 403));
    await expect(saveAsCopy(config, authProvider, '/workflow/wf1/copy', draft)).rejects.toThrow(
      'No access'
    );
  });
});

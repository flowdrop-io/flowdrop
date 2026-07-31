import { describe, it, expect } from 'vitest';
import {
  buildEndpointUrl,
  defaultEndpointConfig,
  createEndpointConfig
} from '../../../src/lib/config/endpoints.js';

describe('buildEndpointUrl base override', () => {
  it('uses the global baseUrl when no override is given', () => {
    const url = buildEndpointUrl(defaultEndpointConfig, '/playground/sessions/{sessionId}/stop', {
      sessionId: 'abc'
    });
    expect(url).toBe('/api/flowdrop/playground/sessions/abc/stop');
  });

  it('hangs a group off a different root when overridden', () => {
    // Backends do not always serve every API from one prefix — the reference
    // backend transposes its prefix for signals. A single baseUrl cannot
    // express both, which is what this override exists for.
    const url = buildEndpointUrl(
      defaultEndpointConfig,
      '/pipelines/{pipelineId}/pause',
      { pipelineId: 'p1' },
      '/flowdrop/api'
    );
    expect(url).toBe('/flowdrop/api/pipelines/p1/pause');
  });

  it('leaves absolute URLs untouched regardless of override', () => {
    const url = buildEndpointUrl(
      defaultEndpointConfig,
      'https://example.test/pipelines/{pipelineId}/pause',
      { pipelineId: 'p1' },
      '/flowdrop/api'
    );
    expect(url).toBe('https://example.test/pipelines/p1/pause');
  });

  it('encodes path parameters', () => {
    const url = buildEndpointUrl(
      defaultEndpointConfig,
      '/pipelines/{pipelineId}/pause',
      { pipelineId: 'a b/c' },
      '/flowdrop/api'
    );
    expect(url).toBe('/flowdrop/api/pipelines/a%20b%2Fc/pause');
  });
});

describe('signal endpoint defaults', () => {
  it('resolves each signal route against the signal base', () => {
    const signals = defaultEndpointConfig.endpoints.signals;
    expect(signals).toBeDefined();
    if (!signals) return;

    const resolve = (path: string) =>
      buildEndpointUrl(defaultEndpointConfig, path, { pipelineId: 'p1' }, signals.baseUrl);

    expect(resolve(signals.pause)).toBe('/flowdrop/api/pipelines/p1/pause');
    expect(resolve(signals.resume)).toBe('/flowdrop/api/pipelines/p1/resume');
    expect(resolve(signals.cancel)).toBe('/flowdrop/api/pipelines/p1/cancel');
  });

  it('survives a host overriding the base URL', () => {
    const config = createEndpointConfig('https://api.example.test');
    const signals = config.endpoints.signals;
    expect(signals).toBeDefined();
    if (!signals) return;

    // The group override still wins over the host's global base — a host that
    // wants a single root must also override the group.
    expect(buildEndpointUrl(config, signals.pause, { pipelineId: 'p1' }, signals.baseUrl)).toBe(
      '/flowdrop/api/pipelines/p1/pause'
    );

    // ...which is exactly what clearing the group base achieves.
    expect(buildEndpointUrl(config, signals.pause, { pipelineId: 'p1' }, undefined)).toBe(
      'https://api.example.test/pipelines/p1/pause'
    );
  });
});

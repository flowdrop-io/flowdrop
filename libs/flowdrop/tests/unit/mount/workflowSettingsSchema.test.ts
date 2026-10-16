/**
 * `mountFlowDropApp` passes `workflowSettingsSchema` on to the editor (#54).
 * App itself is replaced by a stub that records its props: what is under test
 * is the mount function's forwarding, not the settings panel.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ConfigSchema, Workflow } from '../../../src/lib/types/index.js';
import { DEFAULT_PORT_CONFIG } from '../../../src/lib/config/defaultPortConfig.js';

const received: Record<string, unknown>[] = [];

vi.mock('../../../src/lib/components/App.svelte', () => ({
  default: (_anchor: unknown, props: Record<string, unknown>) => {
    received.push(props);
  }
}));

const { mountFlowDropApp } = await import('../../../src/lib/svelte-app.js');

const workflow: Workflow = {
  id: 'wf-settings',
  name: 'Settings',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
};

beforeEach(() => {
  received.length = 0;
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mountFlowDropApp({ workflowSettingsSchema })', () => {
  it('passes the schema to the editor', async () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: { version: { type: 'string', title: 'Version' } }
    };
    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = await mountFlowDropApp(el, {
      workflow,
      portConfig: DEFAULT_PORT_CONFIG,
      categories: [],
      features: { showToasts: false, autoSaveDraft: false },
      workflowSettingsSchema: schema
    });

    expect(received).toHaveLength(1);
    expect(received[0].workflowSettingsSchema).toBe(schema);
    app.destroy();
  });

  it('passes nothing when the option is absent', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = await mountFlowDropApp(el, {
      workflow,
      portConfig: DEFAULT_PORT_CONFIG,
      categories: [],
      features: { showToasts: false, autoSaveDraft: false }
    });

    expect(received[0].workflowSettingsSchema).toBeUndefined();
    app.destroy();
  });
});

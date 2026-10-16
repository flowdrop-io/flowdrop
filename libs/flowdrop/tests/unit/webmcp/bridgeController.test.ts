/**
 * WebMCP bridge controller — against a fake widget with the underscored surface
 * of `@jason.today/webmcp` 0.1.13 (`_updateStatus`, `_updateConnectionUI`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createBridgeController,
  getBridgeController,
  resetBridgeWarning,
  setBridgeController
} from '../../../src/lib/webmcp/bridgeController.svelte.js';
import { createFakeBridgeWidget } from '../../../src/lib/webmcp/fakeWidget.js';
import { installBridgedModelContext } from '../../../src/lib/webmcp/bridge.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const container = () => document.querySelector<HTMLElement>('[data-webmcp-widget]');

beforeEach(() => {
  resetBridgeWarning();
  sessionStorage.clear();
});
afterEach(() => {
  setBridgeController(null);
  document.body.innerHTML = '';
});

describe('createBridgeController', () => {
  it('hides the widget DOM without removing it', () => {
    createBridgeController(createFakeBridgeWidget());
    expect(container()).not.toBeNull();
    expect(container()!.style.display).toBe('none');
  });

  it('follows connecting then connected', async () => {
    const widget = createFakeBridgeWidget();
    const bridge = createBridgeController(widget);
    expect(bridge.status).toBe('disconnected');
    bridge.connect('hold');
    expect(bridge.status).toBe('connecting');
    widget.settle();
    await flush();
    expect(bridge.status).toBe('connected');
    expect(bridge.detail).toBe('');
  });

  it('reports a failed connect as an error and keeps it past the close event', async () => {
    const widget = createFakeBridgeWidget();
    const bridge = createBridgeController(widget);
    bridge.connect('fail');
    await flush();
    expect(bridge.status).toBe('error');
    expect(bridge.detail).toBe('Registration failed');
    // The socket's close event reports a bare "Disconnected".
    widget._updateStatus('disconnected', 'Disconnected');
    expect(bridge.status).toBe('error');
    expect(bridge.detail).toBe('Registration failed');
    // A new attempt clears it.
    bridge.connect('hold');
    expect(bridge.status).toBe('connecting');
  });

  it('a disconnect by the person is not an error, even after an error', async () => {
    const widget = createFakeBridgeWidget();
    const bridge = createBridgeController(widget);
    bridge.connect('ok');
    await flush();
    expect(bridge.status).toBe('connected');
    bridge.disconnect();
    expect(bridge.status).toBe('disconnected');
    expect(widget.isConnected).toBe(false);
  });

  it('a connection dropped by the widget (inactivity) reads as disconnected', async () => {
    const widget = createFakeBridgeWidget();
    const bridge = createBridgeController(widget);
    bridge.connect('ok');
    await flush();
    widget.disconnect();
    expect(bridge.status).toBe('disconnected');
  });

  it('lists the tools registered on the widget and notifies subscribers', () => {
    const widget = createFakeBridgeWidget();
    const bridge = createBridgeController(widget);
    const seen: string[][] = [];
    const off = bridge.subscribe((s) => seen.push(s.tools.map((t) => t.name)));
    widget.registerTool('flowdrop_list', 'List nodes', {}, () => null);
    widget.registerTool('flowdrop_add', 'Add a node', {}, () => null);
    expect(bridge.registeredTools).toEqual([
      { name: 'flowdrop_list', description: 'List nodes' },
      { name: 'flowdrop_add', description: 'Add a node' }
    ]);
    expect(seen.at(-1)).toEqual(['flowdrop_list', 'flowdrop_add']);
    off();
    widget.registerTool('flowdrop_undo', 'Undo', {}, () => null);
    expect(seen).toHaveLength(2);
  });

  it('notifies subscribers of status changes', async () => {
    const widget = createFakeBridgeWidget();
    const bridge = createBridgeController(widget);
    const seen: string[] = [];
    bridge.subscribe((s) => seen.push(s.status));
    bridge.connect('ok');
    await flush();
    expect(seen).toEqual(['connecting', 'connected']);
  });

  it('picks up an auto-reconnect that began before it hooked the widget', () => {
    sessionStorage.setItem('webmcp_token', '{"token":"x"}');
    const bridge = createBridgeController(createFakeBridgeWidget());
    expect(bridge.status).toBe('connecting');
  });

  it('seeds from the widget when it is already connected', () => {
    const widget = createFakeBridgeWidget();
    widget.isConnected = true;
    expect(createBridgeController(widget).status).toBe('connected');
  });

  it('wraps the instance, never the prototype, and dispose restores it', () => {
    const widget = createFakeBridgeWidget();
    const before = widget._updateStatus;
    const bridge = createBridgeController(widget);
    expect(widget._updateStatus).not.toBe(before);
    bridge.dispose();
    expect(widget._updateStatus).toBe(before);
    expect(container()!.style.display).toBe('');
  });

  it('is unmanaged when a private method is missing: widget UI stays, one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const widget = createFakeBridgeWidget() as unknown as Record<string, unknown>;
    delete widget._updateStatus;
    const bridge = createBridgeController(widget as never);
    expect(bridge.managed).toBe(false);
    expect(container()!.style.display).toBe('');
    createBridgeController(widget as never);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('_updateStatus');
    // Connecting still works through the widget.
    bridge.connect('ok');
  });
});

describe('installBridgedModelContext', () => {
  it('registers a controller for the installed widget', () => {
    const target = {};
    installBridgedModelContext(createFakeBridgeWidget(), target);
    expect(getBridgeController()?.managed).toBe(true);
  });

  it('leaves the controller alone when a runtime already exists', () => {
    installBridgedModelContext(createFakeBridgeWidget(), { modelContext: {} });
    expect(getBridgeController()).toBeNull();
  });
});

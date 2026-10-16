import { describe, it, expect, vi } from 'vitest';
import { NodeHighlightStore } from '$lib/stores/nodeHighlightStore.svelte.js';

describe('NodeHighlightStore', () => {
  it('lights the canvas node of the hovered message link only', () => {
    const s = new NodeHighlightStore();
    expect(s.canvasNodeId).toBeNull();
    s.hoverLink('a');
    expect(s.canvasNodeId).toBe('a');
    s.hoverNode('b');
    expect(s.canvasNodeId).toBe('a');
    s.hoverLink(null);
    expect(s.canvasNodeId).toBeNull();
  });

  it('lights the messages of the hovered node, else the selected one', () => {
    const s = new NodeHighlightStore();
    s.setSelected('a');
    expect(s.messageNodeId).toBe('a');
    s.hoverNode('b');
    expect(s.messageNodeId).toBe('b');
    s.hoverNode(null);
    expect(s.messageNodeId).toBe('a');
    s.setSelected(null);
    expect(s.messageNodeId).toBeNull();
  });

  it('reveal asks the registered handler, and is false without one', () => {
    const s = new NodeHighlightStore();
    expect(s.canReveal).toBe(false);
    expect(s.reveal('a')).toBe(false);
    const handler = vi.fn(() => true);
    const off = s.setRevealHandler(handler);
    expect(s.canReveal).toBe(true);
    expect(s.reveal('a')).toBe(true);
    expect(handler).toHaveBeenCalledWith('a');
    off();
    expect(s.canReveal).toBe(false);
  });

  it('a stale unregister does not remove a newer handler', () => {
    const s = new NodeHighlightStore();
    const off1 = s.setRevealHandler(() => true);
    s.setRevealHandler(() => false);
    off1();
    expect(s.canReveal).toBe(true);
    expect(s.reveal('a')).toBe(false);
  });
});

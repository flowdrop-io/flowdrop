/**
 * Unit tests — resolveMessageDisplay
 *
 * Pins the contract that drives MessageBubble's dispatcher:
 *   - server-supplied `display` always wins
 *   - role-based defaults: log → log, system → notice (when compact),
 *     everything else → bubble
 *   - compactSystemMessages=false keeps system on bubble
 *
 * Also pins the hierarchy/tags passthrough (these are server-authoritative
 * — no client-side derivation, no merge).
 */

import { describe, it, expect } from 'vitest';
import { resolveMessageDisplay, type PlaygroundMessage } from '$lib/types/playground.js';

function makeMessage(overrides: Partial<PlaygroundMessage> = {}): PlaygroundMessage {
  return {
    id: 'msg-1',
    sessionId: 'sess-1',
    role: 'assistant',
    content: 'hello',
    timestamp: '2026-01-19T10:00:00Z',
    ...overrides
  };
}

describe('resolveMessageDisplay — role-based defaults', () => {
  it('defaults log role to log layout', () => {
    expect(resolveMessageDisplay(makeMessage({ role: 'log' }))).toBe('log');
  });

  it('defaults system role to notice when compactSystemMessages is enabled (default)', () => {
    expect(resolveMessageDisplay(makeMessage({ role: 'system' }))).toBe('notice');
  });

  it('defaults system role to bubble when compactSystemMessages is disabled', () => {
    expect(
      resolveMessageDisplay(makeMessage({ role: 'system' }), { compactSystemMessages: false })
    ).toBe('bubble');
  });

  it('defaults assistant role to bubble', () => {
    expect(resolveMessageDisplay(makeMessage({ role: 'assistant' }))).toBe('bubble');
  });

  it('defaults user role to bubble', () => {
    expect(resolveMessageDisplay(makeMessage({ role: 'user' }))).toBe('bubble');
  });
});

describe('resolveMessageDisplay — server display override', () => {
  it('honours server display=card on a log message', () => {
    expect(resolveMessageDisplay(makeMessage({ role: 'log', display: 'card' }))).toBe('card');
  });

  it('honours server display=bubble on a log message', () => {
    expect(resolveMessageDisplay(makeMessage({ role: 'log', display: 'bubble' }))).toBe('bubble');
  });

  it('honours server display on a system message even when compactSystemMessages is true', () => {
    expect(
      resolveMessageDisplay(makeMessage({ role: 'system', display: 'card' }), {
        compactSystemMessages: true
      })
    ).toBe('card');
  });

  it('honours server display on an assistant message', () => {
    expect(resolveMessageDisplay(makeMessage({ role: 'assistant', display: 'card' }))).toBe('card');
  });
});

describe('hierarchy and tags — server-authoritative passthrough', () => {
  it('preserves hierarchy items verbatim on the message', () => {
    const hierarchy = [
      { id: 'root', label: 'Root' },
      { id: 'child', label: 'Child', icon: 'mdi:hand-wave' }
    ];
    const message = makeMessage({ hierarchy });
    expect(message.hierarchy).toEqual(hierarchy);
    // Reference identity isn't part of the contract, but the array contents
    // are: there is no client-side derivation.
    expect(message.hierarchy?.[1]?.icon).toBe('mdi:hand-wave');
  });

  it('preserves tags verbatim on the message — no client-side synthesis', () => {
    const tags = [
      { id: 'run', label: 'Run #1', color: 'info' as const, variant: 'subtle' as const },
      { id: 'status', label: 'completed', color: 'success' as const, variant: 'solid' as const }
    ];
    const message = makeMessage({ tags });
    expect(message.tags).toEqual(tags);
    expect(message.tags).toHaveLength(2);
  });

  it('treats empty tags array as authoritative — no chips, no merge', () => {
    const message = makeMessage({ tags: [] });
    expect(message.tags).toEqual([]);
  });
});

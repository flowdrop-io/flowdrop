import { describe, it, expect } from 'vitest';
import { defaultMessages } from '../../../src/lib/messages/defaults.js';
import { mergeMessages } from '../../../src/lib/messages/merge.js';
import type { MessagesOverride } from '../../../src/lib/messages/types.js';

describe('2.11.0 chat.tools message overrides', () => {
  it('type-checks overrides written against 2.11.0 and keeps the removed keys', () => {
    // Compile-time: the function forms and the removed keys are still accepted.
    const legacy: MessagesOverride = {
      chat: {
        tools: {
          reading: ({ tool, detail }) => `Lese: ${tool} ${detail}`,
          read: ({ tool }) => `Gelesen: ${tool}`,
          applied: ({ tool }) => `Fertig: ${tool}`,
          awaitingApproval: ({ tool }) => `Warte auf Freigabe: ${tool}`,
          rejected: ({ tool }) => `Abgelehnt: ${tool}`
        }
      }
    };
    const current: MessagesOverride = {
      chat: { tools: { awaitingApproval: 'Warte', rejected: 'Abgelehnt' } }
    };

    const merged = mergeMessages(defaultMessages, legacy);
    const awaiting = merged.chat.tools.awaitingApproval as unknown;
    expect(typeof awaiting).toBe('function');
    expect((awaiting as (p: { tool: string }) => string)({ tool: 'x' })).toBe(
      'Warte auf Freigabe: x'
    );
    expect(merged.chat.tools.reading({ tool: 't', detail: '' })).toBe('Lese: t ');
    expect(mergeMessages(defaultMessages, current).chat.tools.rejected).toBe('Abgelehnt');
  });

  it('defaults still provide the removed keys', () => {
    expect(defaultMessages.chat.tools.reading({ tool: 'describe_type', detail: 'a' })).toBe(
      'Reading: describe_type a'
    );
    expect(defaultMessages.chat.tools.applied({ tool: 't', detail: '' })).toBe('Done: t');
    expect(defaultMessages.chat.tools.awaitingApproval).toBe('Waiting for your approval');
  });
});

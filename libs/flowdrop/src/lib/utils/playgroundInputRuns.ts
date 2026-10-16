/**
 * The earlier runs of a session that carried named inputs, read back from the
 * session's own messages: a turn started with inputs records them in its user
 * message's `metadata.inputs` (the same data the "Ran with …" label names).
 * Nothing is kept client-side, so the list survives a reload and follows a
 * switch of session.
 */

import type { PlaygroundMessage } from '../types/playground.js';
import type { WorkflowInterfaceEntry } from '../types/index.js';

/** One earlier run: what it was started with, and when. */
export interface PlaygroundInputRun {
  /** The user message that started the run. */
  id: string;
  /** ISO 8601 time of that message. */
  timestamp: string;
  /** The inputs it carried, keyed by interface entry id. */
  inputs: Record<string, unknown>;
}

/** The inputs of a message, or null when it carried none. */
function messageInputs(message: PlaygroundMessage): Record<string, unknown> | null {
  if (message.role !== 'user') return null;
  const inputs = message.metadata?.inputs;
  if (inputs === null || typeof inputs !== 'object' || Array.isArray(inputs)) return null;
  return Object.keys(inputs).length > 0 ? (inputs as Record<string, unknown>) : null;
}

/**
 * The session's runs that carried inputs, newest first. Only keys the form
 * still has an entry for are kept, so a refill never reintroduces an input the
 * interface dropped since; a run left with none is not listed.
 */
export function playgroundInputRuns(
  messages: readonly PlaygroundMessage[],
  entries: readonly WorkflowInterfaceEntry[],
  limit = 5
): PlaygroundInputRun[] {
  const ids = new Set(entries.map((entry) => entry.id));
  const runs: PlaygroundInputRun[] = [];
  for (let i = messages.length - 1; i >= 0 && runs.length < limit; i--) {
    const sent = messageInputs(messages[i]);
    if (!sent) continue;
    const inputs = Object.fromEntries(Object.entries(sent).filter(([id]) => ids.has(id)));
    if (Object.keys(inputs).length > 0) {
      runs.push({ id: messages[i].id, timestamp: messages[i].timestamp, inputs });
    }
  }
  return runs;
}

/** A value as a short single line, for the list of runs. */
function brief(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const line = (text ?? '').replace(/\s+/g, ' ').trim();
  return line.length > 40 ? `${line.slice(0, 39)}…` : line;
}

/** "Topic: cats · Count: 3": what a run was started with, by input name. */
export function summarizeRunInputs(
  inputs: Record<string, unknown>,
  entries: readonly WorkflowInterfaceEntry[]
): string {
  return Object.entries(inputs)
    .map(([id, value]) => {
      const entry = entries.find((candidate) => candidate.id === id);
      return `${entry?.name ?? id}: ${brief(value)}`;
    })
    .join(' · ');
}

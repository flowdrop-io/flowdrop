/**
 * Conversation history builder for the AI Assistant.
 *
 * The panel's chat log is tuned for humans: the assistant bubble shows only the
 * explanation (the ```flowdrop block is lifted out into the command preview),
 * and whether the user applied or dismissed that preview lives in UI state.
 * Sending that log verbatim to the backend hides two things from the assistant
 * on the next turn — the commands it emitted, and what became of them. It then
 * has to guess whether its previous change landed, and re-emits `add …` for
 * nodes that already exist (issue #35).
 *
 * This module rebuilds the log into API history: the assistant's *raw* response
 * plus an explicit outcome report for every command it emitted.
 *
 * @module chat/historyBuilder
 */

import type { ChatHistoryMessage, ChatMessageRole, CommandPreviewItem } from '../types/chat.js';

/** One entry of the panel's chat log, as far as history building cares. */
export interface ChatLogEntry {
  role: ChatMessageRole;
  /** What the bubble displays — explanation only for assistant messages. */
  content: string;
  /** The unmodified LLM response, when it differs from {@link content}. */
  rawContent?: string;
  /** Commands extracted from this response, with their live status. */
  commandPreview?: CommandPreviewItem[];
  /** Results of read-only commands auto-executed for this response. */
  readOnlyResults?: string[];
  /** Set when the user dismissed the preview instead of applying it. */
  commandsDismissed?: boolean;
}

/** Longest command echo in an outcome line before it is elided. */
const MAX_COMMAND_ECHO = 160;

/** Collapse a (possibly multiline) command to one readable line. */
function echoCommand(raw: string): string {
  const flat = raw.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_COMMAND_ECHO ? `${flat.slice(0, MAX_COMMAND_ECHO)} …` : flat;
}

/** Describe what happened to a single previewed command. */
function describeOutcome(item: CommandPreviewItem, dismissed: boolean): string {
  const echo = echoCommand(item.raw);
  const reason = item.result ? ` — ${item.result}` : '';

  switch (item.status) {
    case 'success':
      return `APPLIED: ${echo}`;
    case 'error':
      return `FAILED, not applied: ${echo}${reason}`;
    case 'skipped':
      return `SKIPPED, not applied: ${echo}${reason}`;
    // 'pending' / 'executing' — the user never resolved the preview, or is
    // resolving it right now. Either way nothing is committed yet.
    default:
      return dismissed
        ? `DISMISSED by the user, not applied: ${echo}`
        : `NOT APPLIED YET (awaiting the user's approval): ${echo}`;
  }
}

/**
 * Build the outcome report appended to an assistant message in API history.
 *
 * Returns an empty string when the message emitted no commands.
 */
function buildOutcomeReport(entry: ChatLogEntry): string {
  const sections: string[] = [];

  if (entry.commandPreview && entry.commandPreview.length > 0) {
    const dismissed = entry.commandsDismissed === true;
    sections.push(
      [
        '[command outcomes — authoritative. The workflow state in this request already',
        'includes every APPLIED command; re-sending one would duplicate it. Only commands',
        'marked not applied still need to be sent.]'
      ].join('\n')
    );
    for (const item of entry.commandPreview) {
      sections.push(describeOutcome(item, dismissed));
    }
  }

  if (entry.readOnlyResults && entry.readOnlyResults.length > 0) {
    sections.push('[read-only command results]');
    sections.push(...entry.readOnlyResults);
  }

  return sections.length > 0 ? `\n\n${sections.join('\n')}` : '';
}

/**
 * Convert the panel's chat log into the history sent to the chat endpoint.
 *
 * Assistant entries carry their raw response (so the assistant sees the DSL it
 * emitted) followed by an outcome report for each command in it. User entries
 * pass through unchanged.
 */
export function buildApiHistory(log: ChatLogEntry[]): ChatHistoryMessage[] {
  return log.map((entry) => {
    if (entry.role !== 'assistant') {
      return { role: entry.role, content: entry.content };
    }
    const base = entry.rawContent ?? entry.content;
    return { role: entry.role, content: `${base}${buildOutcomeReport(entry)}` };
  });
}

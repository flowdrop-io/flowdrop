import { describe, it, expect } from 'vitest';
import {
  describeArgs,
  formatActivityDuration,
  rowDuration,
  summarizeActivity,
  toolVerb,
  type ActivityRow
} from '$lib/chat/activity.js';
import { defaultMessages } from '$lib/messages/defaults.js';

const verbs = defaultMessages.chat.tools.verbs;
const fallback = (tool: string, phase: 'running' | 'done') =>
  defaultMessages.chat.tools.verbFallback({ tool, phase });

describe('toolVerb', () => {
  it('names a known tool in both tenses', () => {
    expect(toolVerb('search_types', 'running', verbs, fallback)).toBe('Searching node types');
    expect(toolVerb('search_types', 'done', verbs, fallback)).toBe('Searched node types');
    expect(toolVerb('list_nodes', 'done', verbs, fallback)).toBe('Read workflow');
  });

  it('falls back to the tool id for an unknown tool, and never to the prototype', () => {
    expect(toolVerb('mystery', 'running', verbs, fallback)).toBe('Running mystery');
    expect(toolVerb('mystery', 'done', verbs, fallback)).toBe('Ran mystery');
    expect(toolVerb('constructor', 'done', verbs, fallback)).toBe('Ran constructor');
  });
});

describe('describeArgs', () => {
  it('joins the primitive values and skips the rest', () => {
    expect(describeArgs('describe_type', { typeId: 'http_request', deep: { a: 1 } })).toBe(
      'http_request'
    );
    expect(describeArgs('set_config', { node: 'a.1', key: 'n', value: 3, on: true })).toBe(
      'a.1 n 3 true'
    );
  });

  it('quotes a search', () => {
    expect(describeArgs('search_types', { query: 'trim' })).toBe('"trim"');
  });

  it('is empty without values and cuts a long one at 60 characters', () => {
    expect(describeArgs('list_nodes', {})).toBe('');
    expect(describeArgs('list_nodes', { text: 'x'.repeat(100) })).toHaveLength(60);
    expect(describeArgs('list_nodes', { text: 'x'.repeat(100) }).endsWith('…')).toBe(true);
  });
});

describe('formatActivityDuration', () => {
  it('reads in tenths of a second', () => {
    expect(formatActivityDuration(200)).toBe('0.2 s');
    expect(formatActivityDuration(1600)).toBe('1.6 s');
    expect(formatActivityDuration(59_949)).toBe('59.9 s');
  });

  it('says so under a tenth of a second', () => {
    expect(formatActivityDuration(0)).toBe('<0.1 s');
    expect(formatActivityDuration(49)).toBe('<0.1 s');
  });

  it('switches to minutes', () => {
    expect(formatActivityDuration(65_000)).toBe('1 m 05 s');
    expect(formatActivityDuration(120_000)).toBe('2 m 00 s');
  });

  it('gives nothing for a bad value', () => {
    expect(formatActivityDuration(-1)).toBe('');
    expect(formatActivityDuration(Number.NaN)).toBe('');
  });
});

describe('rowDuration', () => {
  it('shows nothing for a step under 0.1 s or without a time', () => {
    expect(rowDuration(undefined)).toBe('');
    expect(rowDuration(99)).toBe('');
  });
  it('shows the time from 0.1 s', () => {
    expect(rowDuration(100)).toBe('0.1 s');
    expect(rowDuration(1600)).toBe('1.6 s');
  });
});

describe('summarizeActivity', () => {
  const row = (status: ActivityRow['status'], ms?: number): ActivityRow => ({
    status,
    verb: 'v',
    detail: '',
    ms
  });

  it('counts calls, sums their time and leaves notes out', () => {
    const summary = summarizeActivity([
      row('ok', 200),
      row('note'),
      row('ok', 400),
      row('ok', 600)
    ]);
    expect(summary).toEqual({ tools: 3, problems: 0, totalMs: 1200 });
  });

  it('counts failed and rejected calls as problems', () => {
    const summary = summarizeActivity([row('ok', 100), row('failed', 50), row('rejected')]);
    expect(summary).toEqual({ tools: 3, problems: 2, totalMs: 150 });
  });

  it('handles no rows', () => {
    expect(summarizeActivity([])).toEqual({ tools: 0, problems: 0, totalMs: 0 });
  });
});

describe('the fold text', () => {
  const used = defaultMessages.chat.tools.used;
  it('reads "Used 4 tools · 1.6 s"', () => {
    expect(used({ count: 4, problems: 0, duration: '1.6 s' })).toBe('Used 4 tools · 1.6 s');
  });
  it('is singular for one, and names failures', () => {
    expect(used({ count: 1, problems: 0, duration: '0.2 s' })).toBe('Used 1 tool · 0.2 s');
    expect(used({ count: 4, problems: 1, duration: '1.6 s' })).toBe(
      'Used 4 tools · 1 failed · 1.6 s'
    );
    expect(used({ count: 2, problems: 0, duration: '' })).toBe('Used 2 tools');
  });
});

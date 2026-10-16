/**
 * ActivityList: rows stay open while the turn runs and fold into
 * "Used N tools · 1.6 s" once it is done.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ActivityList from '$lib/components/chat/ActivityList.svelte';
import type { ActivityRow } from '$lib/chat/activity.js';

const rows: ActivityRow[] = [
  { status: 'ok', verb: 'Read workflow', detail: '', ms: 200 },
  { status: 'ok', verb: 'Searched node types', detail: '"trim"', ms: 400 },
  { status: 'running', verb: 'Adding node', detail: 'text_trim' }
];

let target: HTMLElement;
let mounted: ReturnType<typeof mount> | null = null;

function render(props: { rows: ActivityRow[]; live: boolean; elapsedMs?: number }) {
  target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(ActivityList, { target, props });
  flushSync();
}

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  target?.remove();
});

describe('ActivityList', () => {
  it('shows every row while the turn runs, the running one with a dot and no time', () => {
    render({ rows, live: true });
    expect(target.querySelector('details')).toBeNull();
    expect(target.querySelectorAll('.activity-row')).toHaveLength(3);
    expect(target.querySelectorAll('.activity-row__dot')).toHaveLength(1);
    expect(target.querySelectorAll('.activity-row__time')).toHaveLength(2);
  });

  it('folds into a closed details with the count and the summed time once done', () => {
    render({
      rows: rows.map((r) => ({ ...r, status: 'ok' as const, ms: r.ms ?? 600 })),
      live: false
    });
    const details = target.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(details?.querySelector('summary')?.textContent?.trim()).toBe('Used 3 tools · 1.2 s');
    expect(target.querySelectorAll('.activity-row__dot')).toHaveLength(0);
  });

  it('prefers the whole turn time for the fold', () => {
    const done = rows.map((r) => ({ ...r, status: 'ok' as const, ms: 10 }));
    render({ rows: done, live: false, elapsedMs: 4200 });
    expect(target.querySelector('summary')?.textContent?.trim()).toBe('Used 3 tools · 4.2 s');
  });

  it('drops a time under 0.1 s from the fold', () => {
    const done = rows.map((r) => ({ ...r, status: 'ok' as const, ms: 10 }));
    render({ rows: done, live: false });
    expect(target.querySelector('summary')?.textContent?.trim()).toBe('Used 3 tools');
  });

  it('names failures in the fold', () => {
    render({
      rows: [
        { status: 'ok', verb: 'Read workflow', detail: '', ms: 200 },
        { status: 'failed', verb: 'Adding node failed', detail: 'no such type', ms: 100 }
      ],
      live: false
    });
    expect(target.querySelector('summary')?.textContent?.trim()).toBe(
      'Used 2 tools · 1 failed · 0.3 s'
    );
  });

  it('shows notes alone as rows, with no fold', () => {
    render({ rows: [{ status: 'note', verb: 'Thinking it over', detail: '' }], live: false });
    expect(target.querySelector('details')).toBeNull();
    expect(target.querySelectorAll('.activity-row')).toHaveLength(1);
  });
});

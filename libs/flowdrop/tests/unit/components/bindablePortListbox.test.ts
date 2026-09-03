/**
 * `BindablePortListbox` — the picker behind the interface composer and an
 * entry's "Bound port" control. Mounted for real (client build, happy-dom) so
 * the roving `aria-activedescendant`, the two click modes and the keyboard
 * flow are exercised on the DOM, not reasoned about.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BindablePortListbox from '$lib/components/BindablePortListbox.svelte';
import { PortCompatibilityChecker } from '$lib/utils/connections.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import { bindablePortKey, type RankedBindablePort } from '$lib/utils/workflowInterface.js';
import type { NodePort } from '$lib/types/index.js';

const checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);

function port(id: string, name = id, dataType = 'string', extra: Partial<NodePort> = {}): NodePort {
  return { id, name, type: 'input', dataType, ...extra } as NodePort;
}

function candidate(
  nodeId: string,
  nodeLabel: string,
  p: NodePort,
  extra: Partial<RankedBindablePort> = {}
): RankedBindablePort {
  return { nodeId, nodeLabel, port: p, connected: false, ...extra };
}

/** Free first, then taken — the order `rankBindablePorts` produces. */
const candidates: RankedBindablePort[] = [
  candidate('llm.1', 'LLM', port('prompt', 'Prompt')),
  candidate('llm.1', 'LLM', port('system', 'System prompt', 'string', { required: true })),
  candidate('http.1', 'HTTP', port('body', 'Body', 'json')),
  candidate('out.1', 'Output', port('text', 'Text'), { connected: true }),
  candidate('mail.1', 'Mail', port('to', 'Recipient'), { publishedAs: 'recipient' })
];

type Props = Parameters<
  typeof mount<Record<string, unknown>, typeof BindablePortListbox>
>[1]['props'];

let mounted: ReturnType<typeof mount> | null = null;

function render(props: Partial<Props> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const onHighlight = vi.fn();
  mounted = mount(BindablePortListbox, {
    target,
    props: {
      direction: 'inputs',
      candidates,
      checker,
      idPrefix: 'test',
      onConfirm,
      onCancel,
      onHighlight,
      ...props
    } as Props
  });
  flushSync();
  const listbox = target.querySelector<HTMLElement>('[role="listbox"]')!;
  const options = () => [...target.querySelectorAll<HTMLElement>('[role="option"]')];
  const active = () => listbox.getAttribute('aria-activedescendant');
  const key = (k: string) => {
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    flushSync();
  };
  const idOf = (c: RankedBindablePort) =>
    options().find((o) => o.textContent?.includes(c.port.name))!.id;
  return { target, listbox, options, active, key, idOf, onConfirm, onCancel, onHighlight };
}

afterEach(() => {
  if (mounted) void unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

describe('BindablePortListbox', () => {
  it('lists free ports before taken ones, under their group titles', () => {
    const { target, options } = render();
    const titles = [...target.querySelectorAll('.wf-portlist__group-title')].map((t) =>
      t.textContent?.trim()
    );
    expect(titles).toEqual(['Available', 'Connected or already published']);
    expect(options().map((o) => o.classList.contains('wf-portlist__option--taken'))).toEqual([
      false,
      false,
      false,
      true,
      true
    ]);
    expect(options()[3].textContent).toContain('Connected');
    expect(options()[4].textContent).toContain('Published as recipient');
    expect(options()[1].textContent).toContain('Required');
  });

  it('filters by node, port and type, and says so when nothing matches', () => {
    const { target, options } = render();
    const input = target.querySelector<HTMLInputElement>('input[type="search"]')!;
    const type = (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      flushSync();
    };
    type('json');
    expect(options().map((o) => o.id)).toHaveLength(1);
    expect(options()[0].textContent).toContain('Body');
    type('mail');
    expect(options()[0].textContent).toContain('Recipient');
    type('zzz');
    expect(options()).toHaveLength(0);
    expect(target.textContent).toContain('No ports match your search.');
  });

  it('shows an empty state when there is nothing to bind', () => {
    const { target } = render({ candidates: [] });
    expect(target.querySelector('input[type="search"]')).toBeNull();
    expect(target.textContent).toContain('No exposed ports to bind yet');
  });

  it('moves the highlight with ArrowDown/ArrowUp/Home/End and reports it', () => {
    const { active, key, idOf, onHighlight } = render();
    expect(active()).toBeNull();
    key('ArrowDown');
    expect(active()).toBe(idOf(candidates[0]));
    expect(onHighlight).toHaveBeenLastCalledWith(candidates[0]);
    key('ArrowDown');
    expect(active()).toBe(idOf(candidates[1]));
    key('End');
    expect(active()).toBe(idOf(candidates[4]));
    key('ArrowDown'); // clamps
    expect(active()).toBe(idOf(candidates[4]));
    key('Home');
    expect(active()).toBe(idOf(candidates[0]));
    key('ArrowUp'); // clamps
    expect(active()).toBe(idOf(candidates[0]));
  });

  it('confirms the highlighted row on Enter and cancels on Escape', () => {
    const { key, onConfirm, onCancel } = render();
    key('Enter'); // nothing highlighted yet
    expect(onConfirm).not.toHaveBeenCalled();
    key('ArrowDown');
    key('ArrowDown');
    key('Enter');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(candidates[1]);
    key('Escape');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('a click only highlights by default, and confirms when confirmOnClick is set', () => {
    const a = render();
    a.options()[2].click();
    flushSync();
    expect(a.active()).toBe(a.idOf(candidates[2]));
    expect(a.onConfirm).not.toHaveBeenCalled();
    void unmount(mounted!);
    mounted = null;
    document.body.innerHTML = '';

    const b = render({ confirmOnClick: true });
    b.options()[2].click();
    flushSync();
    expect(b.onConfirm).toHaveBeenCalledWith(candidates[2]);
  });

  it('a double-click confirms in both modes', () => {
    const a = render();
    a.options()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(a.onConfirm).toHaveBeenCalledWith(candidates[0]);
    void unmount(mounted!);
    mounted = null;
    document.body.innerHTML = '';

    const b = render({ confirmOnClick: true });
    b.options()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(b.onConfirm).toHaveBeenCalledWith(candidates[0]);
  });

  it('the current port is not greyed out and wears the Current badge', () => {
    const { options } = render({ currentKey: bindablePortKey(candidates[3]) });
    const current = options()[3];
    expect(current.classList.contains('wf-portlist__option--current')).toBe(true);
    expect(current.textContent).toContain('Current');
    // Still classified as taken (it is connected) — the style, not the class, lifts the grey.
    expect(current.classList.contains('wf-portlist__option--taken')).toBe(true);
    expect(options()[0].textContent).not.toContain('Current');
  });

  it('option ids stay distinct for ids that only differ in punctuation', () => {
    const dotted = candidate('a.b', 'A dot B', port('x'));
    const scored = candidate('a_b', 'A score B', port('x'));
    const { options } = render({ candidates: [dotted, scored] });
    const ids = options().map((o) => o.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('takes focus on mount only when asked', () => {
    const a = render({ autofocus: true });
    expect(document.activeElement).toBe(a.listbox);
    void unmount(mounted!);
    mounted = null;
    document.body.innerHTML = '';
    const b = render();
    expect(document.activeElement).not.toBe(b.listbox);
  });
});

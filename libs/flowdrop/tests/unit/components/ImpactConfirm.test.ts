/**
 * ImpactConfirm and confirmImpact(): the three severity groups, link
 * attributes, Escape cancels, Save anyway saves, a failed check shows one line.
 */

import { describe, it, expect, afterEach, beforeEach, beforeAll, vi } from 'vitest';
import { flushSync } from 'svelte';
import { confirmImpact, impactPending } from '$lib/services/impactGate.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { defaultMessages } from '$lib/messages/index.js';
import type { ImpactReport } from '$lib/types/impact.js';

const report: ImpactReport = {
  confirm: true,
  interfaceLevel: 'breaking',
  interfaceBreaking: true,
  items: [
    {
      kind: 'workflow',
      severity: 'breaks',
      label: 'Parent flow',
      message: 'loses an input',
      url: '/admin/parent'
    },
    {
      kind: 'profile',
      severity: 'changes',
      label: 'Profile A',
      message: 'is switched off',
      url: null
    },
    { kind: 'note', severity: 'info', label: 'Trigger B', message: 'keeps working', url: null }
  ]
};

// jsdom has no modal dialogs: stand in for the two methods the component calls.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

beforeEach(() => {
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

const dialog = (): HTMLElement =>
  document.querySelector('[data-testid="flowdrop-impact-confirm"]') as HTMLElement;

describe('confirmImpact', () => {
  it('renders the three groups with their headings and severity words', () => {
    void confirmImpact({ report });
    flushSync();
    const groups = [...dialog().querySelectorAll('section')];
    expect(groups.map((g) => g.getAttribute('data-severity'))).toEqual([
      'breaks',
      'changes',
      'info'
    ]);
    const headings = groups.map((g) => g.querySelector('h3')?.textContent);
    expect(headings).toEqual(['This change breaks', 'This change also does', 'Also good to know']);
    expect(dialog().textContent).toContain('Before you save');
    expect(groups[0].textContent).toContain('Breaks');
    expect(groups[0].textContent).toContain('loses an input');
  });

  it('links an item with a url in a new tab and leaves the others plain', () => {
    void confirmImpact({ report });
    flushSync();
    const links = dialog().querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/admin/parent');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener');
  });

  it('resolves false once on Escape (the native cancel event) and removes the dialog', async () => {
    const onSettled = vi.fn();
    const result = confirmImpact({ report }).then(onSettled);
    flushSync();
    const el = dialog();
    const cancel = new Event('cancel', { cancelable: true });
    el.dispatchEvent(cancel);
    el.dispatchEvent(new Event('cancel', { cancelable: true }));
    await result;
    expect(cancel.defaultPrevented).toBe(true);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith(false);
    expect(dialog()).toBeNull();
  });

  it('answers false on Escape', async () => {
    const result = confirmImpact({ report });
    flushSync();
    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(await result).toBe(false);
  });

  it('is a modal dialog labelled by its title and body', () => {
    void confirmImpact({ report });
    flushSync();
    const el = dialog() as HTMLDialogElement;
    expect(el.tagName).toBe('DIALOG');
    expect(el.hasAttribute('open')).toBe(true);
    expect(el.getAttribute('role')).toBe('alertdialog');
    expect(el.querySelector(`#${el.getAttribute('aria-labelledby')}`)?.tagName).toBe('H2');
    expect(el.querySelector(`#${el.getAttribute('aria-describedby')}`)).not.toBeNull();
  });

  it('starts focus on Cancel and gives focus back to the opener', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const result = confirmImpact({ report });
    flushSync();
    expect(document.activeElement).toBe(
      document.querySelector('[data-testid="flowdrop-impact-cancel"]')
    );
    (document.querySelector('[data-testid="flowdrop-impact-cancel"]') as HTMLButtonElement).click();
    await result;
    expect(document.activeElement).toBe(opener);
  });

  it('opens one dialog per instance and refuses a second ask', async () => {
    const fd = createFlowDropInstance({ id: 'impact-once' });
    const first = confirmImpact({ report, instance: fd });
    flushSync();
    expect(impactPending(fd)).toBe(true);
    expect(await confirmImpact({ report, instance: fd })).toBe(false);
    expect(document.querySelectorAll('[data-testid="flowdrop-impact-confirm"]')).toHaveLength(1);
    (document.querySelector('[data-testid="flowdrop-impact-save"]') as HTMLButtonElement).click();
    expect(await first).toBe(true);
    expect(impactPending(fd)).toBe(false);
  });

  it('shows the strings of the messages getter it is given', () => {
    const messages = () => ({
      ...defaultMessages,
      impact: { ...defaultMessages.impact, title: 'Vor dem Speichern' }
    });
    void confirmImpact({ report, messages });
    flushSync();
    expect(dialog().textContent).toContain('Vor dem Speichern');
  });

  it('resolves true on Save anyway and false on Cancel', async () => {
    const saved = confirmImpact({ report });
    flushSync();
    (document.querySelector('[data-testid="flowdrop-impact-save"]') as HTMLButtonElement).click();
    expect(await saved).toBe(true);

    const cancelled = confirmImpact({ report });
    flushSync();
    (document.querySelector('[data-testid="flowdrop-impact-cancel"]') as HTMLButtonElement).click();
    expect(await cancelled).toBe(false);
  });

  it('shows one line when the check failed', () => {
    void confirmImpact({ error: 'HTTP 500' });
    flushSync();
    expect(
      dialog().querySelector('[data-testid="flowdrop-impact-error"]')?.textContent?.trim()
    ).toBe('The check of what uses this workflow failed: HTTP 500');
    expect(dialog().querySelectorAll('section')).toHaveLength(0);
  });

  it('puts Cancel before Save anyway in the DOM', () => {
    void confirmImpact({ report });
    flushSync();
    const buttons = [...dialog().querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Cancel', 'Save anyway']);
  });
});

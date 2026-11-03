/**
 * ImpactConfirm and confirmImpact(): the three severity groups, link
 * attributes, Escape cancels, Save anyway saves, a failed check shows one line.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import { confirmImpact } from '$lib/services/impactGate.js';
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

  it('resolves false on Escape and removes the dialog', async () => {
    const result = confirmImpact({ report });
    flushSync();
    dialog()
      .querySelector('[role="alertdialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await result).toBe(false);
    expect(dialog()).toBeNull();
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

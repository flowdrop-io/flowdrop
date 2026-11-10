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
  refused: false,
  refusedMessage: null,
  copyUrl: null,
  renames: [],
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
    expect(onSettled).toHaveBeenCalledWith({ action: 'cancel' });
    expect(dialog()).toBeNull();
  });

  it('resolves cancel when the browser closes the dialog itself, even while busy', async () => {
    // A second Escape under CloseWatcher closes the dialog without a second
    // cancel event; the caller still has to be answered.
    const onSettled = vi.fn();
    const result = confirmImpact({
      report: { ...report, refused: true },
      saveAsCopy: () => new Promise(() => {})
    }).then(onSettled);
    flushSync();
    const el = dialog();
    const copy = [...el.querySelectorAll('button')].find((b) => /copy/i.test(b.textContent ?? ''));
    copy?.click();
    flushSync();
    el.dispatchEvent(new Event('close'));
    await result;
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith({ action: 'cancel' });
  });

  it('answers false on Escape', async () => {
    const result = confirmImpact({ report });
    flushSync();
    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(await result).toEqual({ action: 'cancel' });
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
    expect(await confirmImpact({ report, instance: fd })).toEqual({ action: 'cancel' });
    expect(document.querySelectorAll('[data-testid="flowdrop-impact-confirm"]')).toHaveLength(1);
    (document.querySelector('[data-testid="flowdrop-impact-save"]') as HTMLButtonElement).click();
    expect(await first).toEqual({ action: 'save' });
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
    expect(await saved).toEqual({ action: 'save' });

    const cancelled = confirmImpact({ report });
    flushSync();
    (document.querySelector('[data-testid="flowdrop-impact-cancel"]') as HTMLButtonElement).click();
    expect(await cancelled).toEqual({ action: 'cancel' });
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

describe('confirmImpact: refused saves', () => {
  const refusedReport: ImpactReport = {
    ...report,
    refused: true,
    refusedMessage: 'Remove the button first.',
    copyUrl: '/workflow/wf1/copy'
  };
  const buttons = (): string[] =>
    [...dialog().querySelectorAll('button')].map((b) => b.textContent?.trim() ?? '');
  const click = (id: string): void =>
    (document.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement).click();

  it('says the change cannot be saved while N places use it, and lists them', () => {
    void confirmImpact({ report: refusedReport });
    flushSync();
    expect(dialog().querySelector('h2')?.textContent).toContain("can't be saved");
    expect(
      dialog().querySelector('[data-testid="flowdrop-impact-refused"]')?.textContent?.trim()
    ).toBe("This change can't be saved while 1 place uses it.");
    expect(dialog().textContent).toContain('Remove the button first.');
    expect(dialog().querySelectorAll('a')).toHaveLength(1);
  });

  it('counts only the places that break, and gives no number when none do', () => {
    const two = { ...refusedReport.items[0], label: 'B' };
    void confirmImpact({
      report: { ...refusedReport, items: [...refusedReport.items, two] }
    });
    flushSync();
    expect(
      dialog().querySelector('[data-testid="flowdrop-impact-refused"]')?.textContent?.trim()
    ).toBe("This change can't be saved while 3 places use it.".replace('3', '2'));
    document.body.innerHTML = '';
    void confirmImpact({
      report: {
        ...refusedReport,
        items: refusedReport.items.filter((i) => i.severity !== 'breaks')
      }
    });
    flushSync();
    expect(
      dialog().querySelector('[data-testid="flowdrop-impact-refused"]')?.textContent?.trim()
    ).toBe("This change can't be saved while other things use this workflow.");
  });

  it('offers no Save anyway', () => {
    void confirmImpact({
      report: refusedReport,
      saveAsCopy: async () => ({ id: '2', editorUrl: null }),
      discard: async () => {}
    });
    flushSync();
    expect(buttons()).toEqual(['Keep editing', 'Discard my changes', 'Save as a copy']);
    expect(document.querySelector('[data-testid="flowdrop-impact-save"]')).toBeNull();
  });

  it('offers Keep editing alone when it cannot copy or undo', () => {
    void confirmImpact({ report: { ...refusedReport, copyUrl: null } });
    flushSync();
    expect(buttons()).toEqual(['Keep editing']);
  });

  it('Save as a copy resolves with the copy', async () => {
    const copy = { id: '2', editorUrl: '/admin/2' };
    const saveAsCopy = vi.fn(async () => copy);
    const answer = confirmImpact({ report: refusedReport, saveAsCopy });
    flushSync();
    click('flowdrop-impact-copy');
    expect(await answer).toEqual({ action: 'copied', copy });
    expect(saveAsCopy).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and says why when the copy fails', async () => {
    const answer = confirmImpact({
      report: refusedReport,
      saveAsCopy: async () => {
        throw new Error('No access');
      }
    });
    flushSync();
    click('flowdrop-impact-copy');
    await vi.waitFor(() => {
      flushSync();
      expect(
        dialog().querySelector('[data-testid="flowdrop-impact-action-error"]')?.textContent
      ).toContain('Could not save a copy: No access');
    });
    click('flowdrop-impact-cancel');
    expect(await answer).toEqual({ action: 'cancel' });
  });

  it('Discard my changes resolves discarded after the reload ran', async () => {
    const discard = vi.fn(async () => {});
    const answer = confirmImpact({ report: refusedReport, discard });
    flushSync();
    click('flowdrop-impact-discard');
    expect(await answer).toEqual({ action: 'discarded' });
    expect(discard).toHaveBeenCalledTimes(1);
  });
});

describe('confirmImpact: renames', () => {
  const renameReport: ImpactReport = {
    ...report,
    confirm: false,
    items: [],
    renames: [
      {
        direction: 'output',
        from: 'node',
        to: 'article',
        // The shape fddo sends: no severity, no message.
        places: [
          { kind: 'block', label: 'Tags block', url: '/b', enabled: false },
          { kind: 'workflow', label: 'Caller', url: 'javascript:alert(1)' }
        ]
      }
    ]
  };
  const checkbox = (): HTMLInputElement =>
    document.querySelector('[data-testid="flowdrop-impact-follow-renames"]') as HTMLInputElement;
  const save = (): void =>
    (document.querySelector('[data-testid="flowdrop-impact-save"]') as HTMLButtonElement).click();

  it('lists each rename with its places and an unticked checkbox', () => {
    void confirmImpact({ report: renameReport });
    flushSync();
    const text = dialog().textContent ?? '';
    expect(text).toContain('Renaming output node \u2192 article. Places that use it:');
    expect(text).toContain('Tags block');
    expect(text).toContain('switched off');
    expect(text).toContain('Caller');
    // A link the page may not follow is drawn as text.
    expect(dialog().querySelector('a[href^="javascript"]')).toBeNull();
    expect(dialog().querySelector('a[href="/b"]')?.textContent).toBe('Tags block');
    expect(dialog().querySelector('.flowdrop-ui-checkbox')?.textContent).toContain(
      'Also update these 2 places'
    );
    expect(checkbox().checked).toBe(false);
  });

  it('saves with followRenames false by default and true when ticked', async () => {
    const unticked = confirmImpact({ report: renameReport });
    flushSync();
    save();
    expect(await unticked).toEqual({ action: 'save', followRenames: false });

    const ticked = confirmImpact({ report: renameReport });
    flushSync();
    checkbox().click();
    flushSync();
    save();
    expect(await ticked).toEqual({ action: 'save', followRenames: true });
  });

  it('labels the button Save when a rename is the only reason to ask', () => {
    void confirmImpact({ report: renameReport });
    flushSync();
    expect(dialog().querySelector('[data-testid="flowdrop-impact-save"]')?.textContent).toContain(
      'Save'
    );
    expect(
      dialog().querySelector('[data-testid="flowdrop-impact-save"]')?.textContent
    ).not.toContain('anyway');
  });

  it('shows a rename nothing uses without the box, and sends no followRenames', async () => {
    const noPlaces: ImpactReport = {
      ...report,
      renames: [{ direction: 'input', from: 'a', to: 'b', places: [] }]
    };
    const answer = confirmImpact({ report: noPlaces });
    flushSync();
    expect(dialog().textContent).toContain('Nothing uses it yet.');
    expect(checkbox()).toBeNull();
    save();
    expect(await answer).toEqual({ action: 'save' });
  });

  it('sends no followRenames when the report has no renames', async () => {
    const answer = confirmImpact({ report });
    flushSync();
    save();
    expect(await answer).toEqual({ action: 'save' });
  });
});

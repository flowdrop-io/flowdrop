/**
 * Host-handled external editing (#55): `onExternalEdit` on ConfigForm and
 * ExternalLinkRow, and the write-back helper.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ConfigForm from '$lib/components/ConfigForm.svelte';
import ExternalLinkRow from '$lib/components/ExternalLinkRow.svelte';
import { runExternalEdit } from '$lib/utils/externalEdit.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { createTestWorkflow, createTestNode } from '../../utils/index.js';
import type { ExternalEditLink, WorkflowNode } from '$lib/types/index.js';

const link: ExternalEditLink = {
  url: 'https://admin.example.com/nodes/{instanceId}',
  parameterMapping: { instanceId: 'id' },
  label: 'Edit in Drupal'
};

function nodeWithLink(): WorkflowNode {
  const node = createTestNode({ id: 'n1' });
  node.data.config = { a: 1, b: 2 };
  node.data.metadata.configEdit = { externalEditLink: link };
  return node;
}

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mountForm(props: Record<string, unknown>): HTMLElement {
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(ConfigForm, { target, props: { node: nodeWithLink(), ...props } });
  flushSync();
  return target;
}

describe('ConfigForm external edit link', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });

  it('calls onExternalEdit with (node, link) and does not open a window', async () => {
    const handler = vi.fn(async () => {});
    const target = mountForm({ onExternalEdit: handler });
    const anchor = target.querySelector<HTMLAnchorElement>('[data-testid="external-config-link"]')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    const [node, passedLink] = handler.mock.calls[0] as unknown as [WorkflowNode, ExternalEditLink];
    expect(node.id).toBe('n1');
    expect(passedLink.url).toBe(link.url);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('ignores a second click while the handler is pending', async () => {
    let release!: () => void;
    const handler = vi.fn(() => new Promise<void>((r) => (release = r)));
    const target = mountForm({ onExternalEdit: handler });
    const anchor = target.querySelector<HTMLAnchorElement>('[data-testid="external-config-link"]')!;
    anchor.click();
    anchor.click();
    expect(handler).toHaveBeenCalledTimes(1);
    release();
    await Promise.resolve();
    await Promise.resolve();
    anchor.click();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('swallows a rejected handler', async () => {
    const handler = vi.fn(async () => {
      throw new Error('nope');
    });
    const target = mountForm({ onExternalEdit: handler });
    target.querySelector<HTMLAnchorElement>('[data-testid="external-config-link"]')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('without a handler the link is left alone (not prevented)', () => {
    const target = mountForm({});
    const anchor = target.querySelector<HTMLAnchorElement>('[data-testid="external-config-link"]')!;
    expect(anchor.getAttribute('href')).toContain('admin.example.com');
    let preventedByRow = true;
    // Bubbles after the row's own handler; then stop the navigation itself.
    target.addEventListener('click', (e) => {
      preventedByRow = e.defaultPrevented;
      e.preventDefault();
    });
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(preventedByRow).toBe(false);
  });

  it('without a handler the button still opens a window', async () => {
    const node = nodeWithLink();
    node.data.metadata.configEdit = {
      externalEditLink: link,
      dynamicSchema: { url: '/unreachable-schema' },
      preferDynamicSchema: true
    };
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ConfigForm, { target, props: { node } });
    for (let i = 0; i < 50 && !target.querySelector('.config-form__button--external'); i++) {
      await new Promise((r) => setTimeout(r, 10));
      flushSync();
    }
    const button = target.querySelector<HTMLButtonElement>('.config-form__button--external');
    expect(button).not.toBeNull();
    button!.click();
    expect(openSpy).toHaveBeenCalledWith(
      'https://admin.example.com/nodes/n1',
      '_blank',
      'noopener,noreferrer'
    );
  });
});

describe('ExternalLinkRow', () => {
  /** `prevented` records whether the row itself cancelled the click. */
  const seen = { prevented: false };
  function mountRow(onActivate?: () => void): HTMLAnchorElement {
    seen.prevented = false;
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ExternalLinkRow, { target, props: { name: 'Calc', href: '/x', onActivate } });
    flushSync();
    // Runs after the row's handler; stops the test navigating.
    target.addEventListener('click', (e) => {
      seen.prevented = e.defaultPrevented;
      e.preventDefault();
    });
    return target.querySelector('a')!;
  }

  it('plain click: prevented and callback called', () => {
    const cb = vi.fn();
    const a = mountRow(cb);
    const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    a.dispatchEvent(e);
    expect(seen.prevented).toBe(true);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('modified click follows the link', () => {
    const cb = vi.fn();
    const a = mountRow(cb);
    const e = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true
    });
    a.dispatchEvent(e);
    expect(seen.prevented).toBe(false);
    expect(cb).not.toHaveBeenCalled();
  });

  it('without a callback nothing is prevented', () => {
    const a = mountRow();
    const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    a.dispatchEvent(e);
    expect(seen.prevented).toBe(false);
  });
});

describe('runExternalEdit', () => {
  function setup() {
    const fd = createFlowDropInstance({ id: `ext-${Math.random().toString(36).slice(2)}` });
    const node = nodeWithLink();
    fd.workflow.initialize(createTestWorkflow({ nodes: [node], edges: [] }));
    return { fd, node };
  }
  const cfg = (fd: ReturnType<typeof setup>['fd']) => fd.workflow.current!.nodes[0].data.config;

  it('replaces the config as one undo step and marks dirty', async () => {
    const { fd, node } = setup();
    await runExternalEdit({
      node,
      link,
      handler: async () => ({ c: 3 }),
      store: fd.workflow
    });
    expect(cfg(fd)).toEqual({ c: 3 });
    expect(fd.workflow.isDirty).toBe(true);
    fd.historyBindings.undo();
    expect(cfg(fd)).toEqual({ a: 1, b: 2 });
  });

  it('leaves the node alone when the handler resolves with nothing', async () => {
    const { fd, node } = setup();
    await runExternalEdit({ node, link, handler: async () => {}, store: fd.workflow });
    expect(cfg(fd)).toEqual({ a: 1, b: 2 });
    expect(fd.workflow.isDirty).toBe(false);
  });

  it('leaves the node alone and does not throw when the handler rejects', async () => {
    const { fd, node } = setup();
    await expect(
      runExternalEdit({
        node,
        link,
        handler: () => Promise.reject(new Error('x')),
        store: fd.workflow
      })
    ).resolves.toBeUndefined();
    expect(cfg(fd)).toEqual({ a: 1, b: 2 });
    expect(fd.workflow.isDirty).toBe(false);
  });

  it('drops the result when the node was deleted meanwhile', async () => {
    const { fd, node } = setup();
    await runExternalEdit({
      node,
      link,
      handler: async () => {
        fd.workflow.initialize(createTestWorkflow({ nodes: [], edges: [] }));
        return { c: 3 };
      },
      store: fd.workflow
    });
    expect(fd.workflow.current!.nodes).toHaveLength(0);
    expect(fd.workflow.isDirty).toBe(false);
  });

  it('does not write when the editor is not in edit mode', async () => {
    const { fd, node } = setup();
    const handler = vi.fn(async () => ({ c: 3 }));
    await runExternalEdit({ node, link, handler, store: fd.workflow, canWrite: false });
    expect(handler).toHaveBeenCalled();
    expect(cfg(fd)).toEqual({ a: 1, b: 2 });
  });
});

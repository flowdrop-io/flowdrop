/**
 * Impact gate: mounts the {@link ImpactConfirm} dialog imperatively and
 * resolves once with the person's decision.
 *
 * The dialog mounts outside the editor tree, so the host passes the element
 * whose scope it should look like (`host`: the editor root, read for the skin
 * scope and colour scheme) or the scheme itself (`theme`).
 *
 * @module services/impactGate
 */

import { mount, unmount } from 'svelte';
import { defaultMessages, messagesContext, type Messages } from '../messages/index.js';
import type { ImpactReport } from '../types/impact.js';
import ImpactConfirm from '../components/ImpactConfirm.svelte';
import { SCOPE_ATTR } from '../utils/portal.js';
import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import { themeScope } from '../utils/themeScope.svelte.js';

export interface ConfirmImpactOptions {
  /** What the check found. */
  report?: ImpactReport;
  /** The reason the check failed; the dialog then shows that one line. */
  error?: string;
  /** The editor element; its skin scope is copied onto the dialog. Default `document.body` for mounting only. */
  host?: HTMLElement;
  /** The colour scheme (`light` | `dark`). Default: follows the editor's resolved scheme. */
  theme?: string;
  /** The editor's messages (`fd.messages`). Default: the built-in English. */
  messages?: () => Messages;
  /**
   * The editor instance asking. At most one question is open per instance: a
   * second ask while one is open resolves `false` and opens no second dialog.
   */
  instance?: FlowDropInstance;
}

const pending = new WeakSet<FlowDropInstance>();

/** Whether this instance has an impact question open. */
export function impactPending(instance: FlowDropInstance): boolean {
  return pending.has(instance);
}

/** Ask whether the save may go ahead. Resolves `true` to save, `false` to cancel. */
export function confirmImpact(options: ConfirmImpactOptions): Promise<boolean> {
  if (typeof document === 'undefined') {
    // No DOM to ask in: refuse rather than silently save.
    return Promise.resolve(false);
  }
  const key = options.instance;
  if (key && pending.has(key)) return Promise.resolve(false);
  if (key) pending.add(key);
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const element = document.createElement('div');
    element.className = 'fd-impact-confirm-host';
    const scope = options.host?.closest(`[${SCOPE_ATTR}]`)?.getAttribute(SCOPE_ATTR);
    if (scope) element.setAttribute(SCOPE_ATTR, scope);
    const theme = options.theme ? null : themeScope(element);
    if (options.theme) element.setAttribute('data-theme', options.theme);
    document.body.appendChild(element);

    const finish = (save: boolean): void => {
      if (settled) return;
      settled = true;
      if (key) pending.delete(key);
      void unmount(component);
      theme?.destroy();
      element.remove();
      resolve(save);
    };

    const component = mount(ImpactConfirm, {
      target: element,
      context: messagesContext(options.messages ?? (() => defaultMessages)),
      props: {
        report: options.report ?? null,
        error: options.error,
        onResolve: finish
      }
    });
  });
}

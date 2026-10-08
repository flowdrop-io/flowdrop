import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';

import PanelHeader from '$lib/components/primitives/PanelHeader.svelte';

let target: HTMLElement;
let instance: ReturnType<typeof mount> | null = null;
const snip = (html: string) => createRawSnippet(() => ({ render: () => html }));
function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(PanelHeader, { target, props: props as never });
  flushSync();
  return target;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('PanelHeader', () => {
  it('renders the title as an h2 by default and honours "as"', () => {
    expect(render({ title: 'Console' }).querySelector('h2')?.textContent).toBe('Console');
    unmount(instance!);
    expect(render({ title: 'Console', as: 'h4' }).querySelector('h4')).not.toBeNull();
  });

  it('renders the subtitle', () => {
    expect(
      render({ title: 'A', subtitle: 'Sub' }).querySelector('.flowdrop-ui-panel-header__subtitle')
        ?.textContent
    ).toBe('Sub');
  });

  it('prefers the leading snippet over the title', () => {
    const t = render({ title: 'Ignored', leading: snip('<span id="chip">chip</span>') });
    expect(t.querySelector('#chip')).not.toBeNull();
    expect(t.querySelector('h2')).toBeNull();
  });

  it('renders actions on the right only when given', () => {
    expect(render({ title: 'A' }).querySelector('.flowdrop-ui-panel-header__actions')).toBeNull();
    unmount(instance!);
    expect(
      render({ title: 'A', actions: snip('<button id="x">x</button>') }).querySelector(
        '.flowdrop-ui-panel-header__actions #x'
      )
    ).not.toBeNull();
  });
});

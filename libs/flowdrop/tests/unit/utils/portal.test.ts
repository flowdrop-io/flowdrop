import { describe, it, expect } from 'vitest';
import { portal } from '../../../src/lib/utils/portal.js';

describe('portal', () => {
  it('moves the node to body, copies the nearest scope and marks it', () => {
    const root = document.createElement('div');
    root.setAttribute('data-fd-scope', 's1');
    const inner = document.createElement('div');
    const node = document.createElement('div');
    root.appendChild(inner);
    inner.appendChild(node);
    document.body.appendChild(root);

    const action = portal(node);
    expect(node.parentElement).toBe(document.body);
    expect(node.getAttribute('data-fd-scope')).toBe('s1');
    expect(node.classList.contains('flowdrop-portal')).toBe(true);

    action.destroy();
    expect(node.isConnected).toBe(false);
    root.remove();
  });

  it('keeps the scope when the target changes later', () => {
    const root = document.createElement('div');
    root.setAttribute('data-fd-scope', 's2');
    const node = document.createElement('div');
    root.appendChild(node);
    document.body.appendChild(root);
    const target = document.createElement('div');
    document.body.appendChild(target);

    const action = portal(node);
    action.update(target);
    expect(node.parentElement).toBe(target);
    expect(node.getAttribute('data-fd-scope')).toBe('s2');
    action.destroy();
    root.remove();
    target.remove();
  });

  it('adds no scope when there is no scoped ancestor', () => {
    const wrap = document.createElement('div');
    const node = document.createElement('div');
    wrap.appendChild(node);
    document.body.appendChild(wrap);
    const action = portal(node);
    expect(node.hasAttribute('data-fd-scope')).toBe(false);
    expect(node.classList.contains('flowdrop-portal')).toBe(true);
    action.destroy();
    wrap.remove();
  });
});

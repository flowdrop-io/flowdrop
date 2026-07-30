/**
 * Unit Tests - Canvas Selection Utility
 *
 * Covers which canvas mousedowns get their default (text-selection drag)
 * suppressed. Regression cover for #37.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { suppressPortDragSelection } from '$lib/utils/canvasSelection.js';

describe('suppressPortDragSelection', () => {
  let handle: HTMLElement;
  let handleChild: HTMLElement;
  let label: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="svelte-flow__node" tabindex="0">
        <div class="flowdrop-simple-node__label">Calculator</div>
        <div class="svelte-flow__handle svelte-flow__handle-right source" tabindex="-1">
          <span class="port-dot"></span>
        </div>
      </div>
    `;
    handle = document.querySelector('.svelte-flow__handle') as HTMLElement;
    handleChild = document.querySelector('.port-dot') as HTMLElement;
    label = document.querySelector('.flowdrop-simple-node__label') as HTMLElement;
  });

  function mousedown(target: HTMLElement, button = 0): MouseEvent {
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button });
    target.dispatchEvent(event);
    return event;
  }

  it('should suppress the default on a port handle mousedown', () => {
    const event = mousedown(handle);
    suppressPortDragSelection(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should suppress the default when the mousedown lands on a handle child', () => {
    const event = mousedown(handleChild);
    suppressPortDragSelection(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should keep focus on the handle, replacing the suppressed default action', () => {
    const event = mousedown(handleChild);
    suppressPortDragSelection(event);
    expect(document.activeElement).toBe(handle);
  });

  it('should leave node body mousedowns alone (xyflow drives node drag itself)', () => {
    const event = mousedown(label);
    suppressPortDragSelection(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('should leave non-primary buttons alone so context menus still work', () => {
    const event = mousedown(handle, 2);
    suppressPortDragSelection(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('should ignore targets that are not elements', () => {
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    expect(() => suppressPortDragSelection(event)).not.toThrow();
    expect(event.defaultPrevented).toBe(false);
  });
});

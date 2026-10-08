import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Field from '$lib/components/primitives/Field.svelte';

let instance: ReturnType<typeof mount> | null = null;
let target: HTMLElement;
const control = createRawSnippet<
  [{ id: string; describedBy: string | undefined; invalid: boolean }]
>((ctx) => ({
  render: () =>
    `<input id="${ctx().id}" data-by="${ctx().describedBy ?? ''}" data-invalid="${ctx().invalid}" />`
}));
function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Field, {
    target,
    props: { label: 'Email', children: control, ...props } as never
  });
  flushSync();
  return target;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('primitives/Field', () => {
  it('labels the control through a generated id', () => {
    const t = render({});
    const input = t.querySelector('input')!;
    expect(input.id).toBeTruthy();
    expect(t.querySelector('label')?.getAttribute('for')).toBe(input.id);
    expect(input.dataset.by).toBe('');
    expect(input.dataset.invalid).toBe('false');
  });

  it('uses the given id', () => {
    const t = render({ id: 'my-id' });
    expect(t.querySelector('input')?.id).toBe('my-id');
  });

  it('wires help and error into describedBy and invalid', () => {
    const t = render({ id: 'f', help: 'Helpful', error: 'Wrong' });
    const input = t.querySelector('input')!;
    expect(input.dataset.by).toBe('f-help f-error');
    expect(input.dataset.invalid).toBe('true');
    expect(t.querySelector('#f-help')?.textContent).toBe('Helpful');
    expect(t.querySelector('#f-error')?.getAttribute('role')).toBe('alert');
  });

  it('shows the type tag and required marker', () => {
    const t = render({ typeTag: 'array', required: true });
    expect(t.querySelector('.flowdrop-ui-field__tag')?.textContent).toBe('array');
    expect(t.querySelector('.flowdrop-ui-field__required')).not.toBeNull();
  });

  it('example chips call onexample with the value', () => {
    const onexample = vi.fn();
    const t = render({ examples: ['[]', '["a"]'], onexample });
    const buttons = t.querySelectorAll<HTMLButtonElement>('.flowdrop-ui-field__examples button');
    expect(buttons).toHaveLength(2);
    buttons[1].click();
    expect(onexample).toHaveBeenCalledWith('["a"]');
  });
});

/**
 * A field edited as JSON because of its type (absent type, several non-null
 * words) shows a stored string JSON-quoted, so editing it keeps it a string.
 * Only `format: json` / `code` fields show a string that parses as JSON raw.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import FormCodeEditor from '$lib/components/form/FormCodeEditor.svelte';
import FormFieldLight from '$lib/components/form/FormFieldLight.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { FieldSchema } from '$lib/components/form/types.js';

let mounted: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

async function editorText(value: unknown, schema?: { format?: string }): Promise<string> {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormCodeEditor, {
    target,
    props: { id: 'f', value, schema, onChange: () => {} },
    context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
  });
  flushSync();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await tick();
  return (target.querySelector('.cm-content') as HTMLElement).textContent ?? '';
}

describe('FormCodeEditor shows a stored string', () => {
  it.each(['5', 'null', 'true', '{"a":1}'])(
    'JSON-quoted for a field with no format: %s',
    async (s) => {
      expect(await editorText(s, {})).toBe(JSON.stringify(s));
      unmount(mounted!);
      mounted = null;
    }
  );

  it.each(['json', 'code'])('as it is for format %s', async (format) => {
    expect(await editorText('{"a":1}', { format })).toBe('{"a":1}');
  });

  it('still shows an object as formatted JSON', async () => {
    expect(await editorText({ a: 1 }, {})).toContain('"a": 1');
  });
});

describe('the textarea standing in for an unregistered code editor', () => {
  function render(schema: FieldSchema, value: unknown) {
    const onChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    mounted = mount(FormFieldLight, {
      target,
      props: { fieldKey: 'f', schema, value, onChange } as never,
      context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
    });
    flushSync();
    return { onChange, area: () => target.querySelector<HTMLTextAreaElement>('textarea')! };
  }

  it('quotes a string stored in a field with several types', () => {
    expect(render({ type: ['string', 'number'] }, '5').area().value).toBe('"5"');
    unmount(mounted!);
    mounted = null;
    expect(render({}, 'null').area().value).toBe('"null"');
  });

  it('keeps a quoted string a string when edited', () => {
    const f = render({ type: ['string', 'number'] }, '5');
    f.area().value = '"6"';
    f.area().dispatchEvent(new Event('input', { bubbles: true }));
    expect(f.onChange).toHaveBeenLastCalledWith('6');
  });

  it('shows a format: json string as it is', () => {
    expect(render({ type: 'string', format: 'json' }, '{"a":1}').area().value).toBe('{"a":1}');
  });
});

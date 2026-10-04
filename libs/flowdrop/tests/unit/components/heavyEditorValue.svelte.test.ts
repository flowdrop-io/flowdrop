/**
 * The markdown and template editors receive the raw config value when they are
 * rendered through the field factory (registered, or bundled by FormFieldFull).
 * That value is not always a string — null for an unset field, a number from a
 * mistyped schema — and CodeMirror throws on anything but a string
 * (`(config.doc || "").split is not a function`). FormFieldFull used to coerce
 * with String(value ?? ''); the editors now do it themselves. Mounted for real
 * (client build, happy-dom).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import FormMarkdownEditor from '$lib/components/form/FormMarkdownEditor.svelte';
import FormTemplateEditor from '$lib/components/form/FormTemplateEditor.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';

let mounted: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

const editors = [
  ['FormMarkdownEditor', FormMarkdownEditor],
  ['FormTemplateEditor', FormTemplateEditor]
] as const;

async function render(component: (typeof editors)[number][1], value: unknown) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const props = $state({ id: 'f', value, onChange: () => {} });
  mounted = mount(component as never, {
    target,
    props: props as never,
    context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
  });
  flushSync();
  // The template editor builds CodeMirror after its variable schema resolves.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await tick();
  return { target, props };
}

/** The document text, without the placeholder CodeMirror shows when it is empty. */
function editorText(target: HTMLElement) {
  const content = target.querySelector('.cm-content')?.cloneNode(true) as HTMLElement | undefined;
  content?.querySelectorAll('.cm-placeholder').forEach((el) => el.remove());
  return content?.textContent ?? null;
}

describe.each(editors)('%s with a value that is not a string', (_, component) => {
  it.each([
    ['null', null, ''],
    ['a number', 42, '42']
  ])('mounts with %s', async (_label, value, expected) => {
    const { target } = await render(component, value);
    expect(editorText(target)).toBe(expected);
  });

  it('survives the value changing to null after mount', async () => {
    const { target, props } = await render(component, 'hello');
    expect(editorText(target)).toBe('hello');
    props.value = null;
    flushSync();
    expect(editorText(target)).toBe('');
  });
});

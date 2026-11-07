/**
 * The code, markdown and template editors follow `disabled` after they are
 * mounted: a lock can arrive while an editor is open, and the text must stop
 * taking edits then (and take them again once the lock is gone).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import FormCodeEditor from '$lib/components/form/FormCodeEditor.svelte';
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
  ['FormCodeEditor', FormCodeEditor],
  ['FormMarkdownEditor', FormMarkdownEditor],
  ['FormTemplateEditor', FormTemplateEditor]
] as const;

describe.each(editors)('%s', (_, component) => {
  it('turns read-only and back after it is mounted', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const props = $state({ id: 'f', value: 'text', disabled: false, onChange: () => {} });
    mounted = mount(component as never, {
      target,
      props: props as never,
      context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
    });
    flushSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();

    const content = () => target.querySelector('.cm-content') as HTMLElement;
    expect(content().getAttribute('contenteditable')).toBe('true');
    props.disabled = true;
    flushSync();
    expect(content().getAttribute('contenteditable')).toBe('false');
    props.disabled = false;
    flushSync();
    expect(content().getAttribute('contenteditable')).toBe('true');
  });
});

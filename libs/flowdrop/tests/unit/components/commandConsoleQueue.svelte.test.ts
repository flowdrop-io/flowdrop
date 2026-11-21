/**
 * A Console line that throws is reported as a failed line, and the lines
 * queued behind it still run.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';

const calls: string[] = [];
vi.mock('$lib/commands/console.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/commands/console.js')>();
  return {
    ...actual,
    executeConsoleCommand: async (command: unknown) => {
      calls.push(JSON.stringify(command));
      if (calls.length === 1) throw new Error('boom');
      return { ok: true as const, message: 'second line ran' };
    }
  };
});
vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const { default: CommandConsole } = await import('$lib/components/console/CommandConsole.svelte');
const { createFlowDropInstance } = await import('$lib/stores/instanceContainer.svelte.js');
const { FLOWDROP_INSTANCE_KEY } = await import('$lib/stores/getInstance.svelte.js');

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

describe('CommandConsole queue', () => {
  it('reports a thrown line as an error and runs the next one', async () => {
    const fd = createFlowDropInstance({ id: 'console-queue' });
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(CommandConsole, {
      target,
      context: new Map<unknown, unknown>([[FLOWDROP_INSTANCE_KEY, fd]]),
      props: { nodeTypes: [] }
    });
    flushSync();
    const input = target.querySelector('input.console-input__field') as HTMLInputElement;
    const submit = async (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      flushSync();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      flushSync();
    };
    await submit('mode');
    await submit('mode');
    for (let i = 0; i < 5; i++) {
      await tick();
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(calls).toHaveLength(2);
    const text = target.querySelector('.console-output')?.textContent ?? '';
    expect(text).toContain('boom');
    expect(text).toContain('second line ran');
    fd.destroy();
  });
});

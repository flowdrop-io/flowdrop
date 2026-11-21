/**
 * The Console registry: one place that knows which lines are Console lines, how
 * to document them, and how every other surface refuses them.
 */

import { describe, it, expect } from 'vitest';
import {
  CONSOLE_HELP,
  CONSOLE_VERBS,
  consoleHelp,
  consoleRefusal,
  isConsoleLine,
  parseCommand,
  executeCommand
} from '../../../src/lib/commands/index.js';
import { createFlowDropInstance } from '../../../src/lib/stores/instanceContainer.svelte.js';
import { createStoreCommandContext } from '../../../src/lib/commands/storeIntegration.svelte.js';
import { createTestWorkflow } from '../../utils/index.js';

describe('Console registry', () => {
  it('knows its verbs once', () => {
    expect(CONSOLE_VERBS).toEqual(['session', 'mode', 'runs', 'save', 'export']);
    for (const row of CONSOLE_HELP) {
      expect(
        CONSOLE_VERBS.some((verb) => row.name === verb || row.name.startsWith(`${verb} `))
      ).toBe(true);
      expect(row.syntax.startsWith(row.name.split(' ')[0])).toBe(true);
    }
    expect(isConsoleLine('  RUNS open 1')).toBe(true);
    expect(isConsoleLine('sessions')).toBe(false);
  });

  it('answers help for a verb and for one sub-command, from one list', () => {
    expect(consoleHelp('session').map((r) => r.name)).toHaveLength(9);
    expect(consoleHelp('session list').map((r) => r.name)).toEqual(['session list']);
    expect(consoleHelp('runs').map((r) => r.name)).toEqual([
      'runs',
      'runs open',
      'runs rerun',
      'runs cancel',
      'runs dismiss'
    ]);
    expect(consoleHelp('RUNS  open').map((r) => r.name)).toEqual(['runs open']);
    expect(consoleHelp('mode')).toHaveLength(1);
    expect(consoleHelp('runs dance')).toEqual([]);
  });

  it('refuses every Console line outside the Console, naming the WebMCP tool where one exists', () => {
    expect(consoleRefusal('add node x')).toBeNull();
    expect(consoleRefusal('mode test')).toContain('set_editor_mode');
    expect(consoleRefusal('save')).toContain('the save tool');
    expect(consoleRefusal('runs list')).not.toContain('tool');
    expect(consoleRefusal('session send "x"')).toContain('only in the editor Console');
    for (const line of ['mode test', 'save', 'export', 'runs', 'session status']) {
      const parsed = parseCommand(line);
      expect(parsed.ok).toBe(false);
      expect(!parsed.ok && parsed.error).toBe(consoleRefusal(line));
    }
  });
});

describe('workflow format offers only what the host allows', () => {
  function setup(allowlist: string[] | null) {
    const fd = createFlowDropInstance({ id: `fmt-${Math.random().toString(36).slice(2)}` });
    fd.workflow.initialize(createTestWorkflow({ nodes: [] }));
    fd.formatAllowlist = allowlist;
    const context = createStoreCommandContext([], undefined, fd);
    if (!context) throw new Error('no context');
    const run = (line: string) => {
      const parsed = parseCommand(line);
      if (!parsed.ok) throw new Error(parsed.error);
      return executeCommand(parsed.command, context);
    };
    return { fd, context, run };
  }

  it('refuses a registered format the allowlist leaves out', () => {
    const { context, run, fd } = setup(['flowdrop']);
    expect(fd.formats.getOneOfOptions().map((o) => o.const)).toContain('agentspec');
    expect(context.formatOptions?.()).toEqual(['flowdrop']);
    const refused = run('workflow format agentspec');
    expect(refused.ok).toBe(false);
    expect(!refused.ok && refused.error).toContain('flowdrop');
  });

  it('offers every registered format without an allowlist', () => {
    const { context, run } = setup(null);
    expect(context.formatOptions?.()).toContain('agentspec');
    expect(run('workflow format agentspec').ok).toBe(true);
  });

  it('keeps the allowlist on the instance, not on the public registry', () => {
    const { fd } = setup(['flowdrop']);
    expect(fd.allowedFormatOptions().map((o) => o.const)).toEqual(['flowdrop']);
    expect(fd.formats.getOneOfOptions().length).toBeGreaterThan(1);
    expect('allowlist' in fd.formats).toBe(false);
    expect('getAllowedOptions' in fd.formats).toBe(false);
    fd.formatAllowlist = null;
    expect(fd.allowedFormatOptions().length).toBeGreaterThan(1);
  });
});

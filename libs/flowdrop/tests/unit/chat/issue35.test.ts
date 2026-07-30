/**
 * Unit Tests — AI panel handling of quoted values and applied-state (issue #35)
 *
 * Both halves of the bug report are pinned here, using the assistant response
 * from the report verbatim:
 *
 *  1. The assistant closes a `"""` value at the *end of a content line*
 *     (`set n.1:t """line one\nline two"""`). The extractor used to require the
 *     closing `"""` on its own line, so it swallowed the rest of the block —
 *     every later command, the closing fence and the trailing prose.
 *  2. On the next turn the assistant was told neither which commands it had
 *     emitted (the ```flowdrop block is stripped from the display bubble) nor
 *     whether they were applied, so it re-emitted `add …` and duplicated nodes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractCommands } from '$lib/chat/responseParser.js';
import { buildApiHistory, type ChatLogEntry } from '$lib/chat/historyBuilder.js';
import { parseCommand } from '$lib/commands/parser.js';
import { executeCommand } from '$lib/commands/executor.js';
import { createStoreCommandContext } from '$lib/commands/storeIntegration.svelte.js';
import {
  createFlowDropInstance,
  type FlowDropInstance
} from '$lib/stores/instanceContainer.svelte.js';
import type { Command } from '$lib/commands/types.js';
import { createTestWorkflow, createTestNode, createTestNodeMetadata } from '../../utils/index.js';

/** The reported assistant response, trimmed to the shapes that matter. */
const RESPONSE = [
  'Let me reconfigure `value.4` and add the merge + template nodes.',
  '',
  '```flowdrop',
  '# Step 1 — repurpose value.4 as the static commit prefix',
  'set value.4:value "chore(deps): apply Composer security updates"',
  'rename value.4 Commit Prefix',
  '',
  '# Step 2 — add a Merge node',
  'add merge at 1660,200',
  'set merge.1:dynamicInputs [{"id":"prefix","name":"Prefix","dataType":"mixed"},{"id":"summary","name":"Summary","dataType":"mixed"}]',
  '',
  '# Step 3 — set the template string (prefix, blank line, then the summary)',
  'set template.1:template """{{prefix}}',
  '',
  '{{summary}}"""',
  '',
  '# Step 4 — wire it up',
  'connect merge.1:output to template.1:data',
  'canvas fitview',
  '```',
  '',
  "Here's how the data flows."
].join('\n');

const TEMPLATE_COMMAND = 'set template.1:template """{{prefix}}\n\n{{summary}}"""';
const DYNAMIC_INPUTS_COMMAND =
  'set merge.1:dynamicInputs [{"id":"prefix","name":"Prefix","dataType":"mixed"},{"id":"summary","name":"Summary","dataType":"mixed"}]';

function parse(input: string): Command {
  const parsed = parseCommand(input);
  if (!parsed.ok) throw new Error(`Parse failed: ${parsed.error}`);
  return parsed.command;
}

// ==========================================================================
// Bug A — a `"""` value closed at the end of a content line
// ==========================================================================

describe('extractCommands: inline triple-quote delimiters', () => {
  it('keeps every command in the reported response', () => {
    const { commands, explanation } = extractCommands(RESPONSE);

    expect(commands).toEqual([
      'set value.4:value "chore(deps): apply Composer security updates"',
      'rename value.4 Commit Prefix',
      'add merge at 1660,200',
      DYNAMIC_INPUTS_COMMAND,
      TEMPLATE_COMMAND,
      'connect merge.1:output to template.1:data',
      'canvas fitview'
    ]);

    // The dangling buffer used to eat the closing fence too, truncating the
    // explanation at the start of the block.
    expect(explanation).toContain("Here's how the data flows.");
  });

  it('accepts the opening """ with content on the same line', () => {
    const { commands } = extractCommands(
      ['```flowdrop', 'set n.1:prompt """line one', 'line two"""', 'add http_request', '```'].join(
        '\n'
      )
    );

    expect(commands).toEqual(['set n.1:prompt """line one\nline two"""', 'add http_request']);
  });

  it('still treats a balanced pair inside content as content', () => {
    const { commands } = extractCommands(
      [
        '```flowdrop',
        'set note.1:content """',
        'Use Python """docstrings""" for documentation.',
        '"""',
        'add http_request',
        '```'
      ].join('\n')
    );

    expect(commands).toHaveLength(2);
    expect(commands[0]).toContain('Use Python """docstrings"""');
    expect(commands[1]).toBe('add http_request');
  });
});

describe('set values with quotes survive parse + execute', () => {
  let fd: FlowDropInstance;

  beforeEach(() => {
    fd = createFlowDropInstance({ id: `issue35-${Math.random().toString(36).slice(2)}` });
    fd.workflow.initialize(
      createTestWorkflow({
        nodes: [
          createTestNode({
            id: 'template.1',
            data: { label: 'Template', config: {}, metadata: createTestNodeMetadata() }
          }),
          createTestNode({
            id: 'merge.1',
            data: { label: 'Merge', config: {}, metadata: createTestNodeMetadata() }
          })
        ]
      })
    );
  });

  function context() {
    const ctx = createStoreCommandContext([createTestNodeMetadata()], undefined, fd);
    if (!ctx) throw new Error('No command context');
    return ctx;
  }

  it('stores a multiline template value with its newlines', () => {
    expect(executeCommand(parse(TEMPLATE_COMMAND), context()).ok).toBe(true);
    const node = fd.workflow.current?.nodes.find((n) => n.id === 'template.1');
    expect(node?.data.config).toEqual({ template: '{{prefix}}\n\n{{summary}}' });
  });

  it('stores a JSON array value with embedded double quotes as an array', () => {
    expect(executeCommand(parse(DYNAMIC_INPUTS_COMMAND), context()).ok).toBe(true);
    const node = fd.workflow.current?.nodes.find((n) => n.id === 'merge.1');
    expect(node?.data.config).toEqual({
      dynamicInputs: [
        { id: 'prefix', name: 'Prefix', dataType: 'mixed' },
        { id: 'summary', name: 'Summary', dataType: 'mixed' }
      ]
    });
  });
});

// ==========================================================================
// Bug B — the assistant is told what it emitted and what became of it
// ==========================================================================

describe('buildApiHistory', () => {
  const applied: ChatLogEntry = {
    role: 'assistant',
    content: 'Let me reconfigure `value.4` and add the merge + template nodes.',
    rawContent: RESPONSE,
    commandPreview: [
      { raw: 'add merge at 1660,200', status: 'success', result: 'Added merge.1' },
      { raw: TEMPLATE_COMMAND, status: 'success', result: 'Set template.1:template' }
    ]
  };

  it('sends the raw response so the assistant sees the DSL it emitted', () => {
    const [entry] = buildApiHistory([applied]);
    expect(entry.content).toContain('```flowdrop');
    expect(entry.content).toContain(TEMPLATE_COMMAND);
  });

  it('reports applied commands as applied', () => {
    const [entry] = buildApiHistory([applied]);
    expect(entry.content).toContain('APPLIED: add merge at 1660,200');
    expect(entry.content).toContain('already');
  });

  it('distinguishes dismissed from still-pending previews', () => {
    const pending: ChatLogEntry = {
      ...applied,
      commandPreview: [{ raw: 'add merge at 1660,200', status: 'pending' }]
    };

    expect(buildApiHistory([pending])[0].content).toContain('NOT APPLIED YET');
    expect(buildApiHistory([{ ...pending, commandsDismissed: true }])[0].content).toContain(
      'DISMISSED by the user, not applied'
    );
  });

  it('reports failed and skipped commands as not applied', () => {
    const [entry] = buildApiHistory([
      {
        ...applied,
        commandPreview: [
          { raw: 'set n.1:x """oops', status: 'error', result: 'Unclosed """ block' },
          { raw: 'layout beautify', status: 'skipped', result: 'Layout changes are off' }
        ]
      }
    ]);

    expect(entry.content).toContain('FAILED, not applied: set n.1:x """oops — Unclosed """ block');
    expect(entry.content).toContain('SKIPPED, not applied: layout beautify');
  });

  it('feeds read-only command results back to the assistant', () => {
    const [entry] = buildApiHistory([
      { role: 'assistant', content: 'Let me look.', readOnlyResults: ['> list nodes\nmerge.1'] }
    ]);
    expect(entry.content).toContain('> list nodes');
  });

  it('passes user messages through untouched', () => {
    expect(buildApiHistory([{ role: 'user', content: 'try again' }])).toEqual([
      { role: 'user', content: 'try again' }
    ]);
  });
});

describe('the display bubble alone is not enough history', () => {
  it('drops the flowdrop block — which is why rawContent is sent instead', () => {
    // What getHistory() used to send for an assistant turn.
    const { explanation } = extractCommands(RESPONSE);
    expect(explanation).not.toContain('```flowdrop');
    expect(explanation).not.toContain('add merge at');
  });
});

describe('DSL prompts describe quoting and applied-state', () => {
  // Vitest runs with the package root as cwd (see layoutOptOut.test.ts).
  const docsDir = resolve(process.cwd(), 'docs');

  it.each(['dsl-system-prompt.md', 'dsl-llm-prompt.md'])(
    '%s explains delimiter matching and never re-applying commands',
    (file) => {
      const text = readFileSync(resolve(docsDir, file), 'utf8');

      // Quoting rules (bug A).
      expect(text).toContain('at the end of the last content line');
      expect(text).toContain('\\"""');

      // Applied-state rules (bug B).
      expect(text).toContain('command outcomes');
      expect(text).toMatch(/never re-send a command reported as `APPLIED`/i);
    }
  );
});

describe('workflow state after an applied batch', () => {
  it('reflects the assistant mutations immediately (what the next turn serializes)', () => {
    const fd = createFlowDropInstance({
      id: `issue35-state-${Math.random().toString(36).slice(2)}`
    });
    fd.workflow.initialize(createTestWorkflow({ nodes: [] }));

    const nodeTypes = [createTestNodeMetadata({ node_type_id: 'merge', name: 'Merge' })];
    const ctx = createStoreCommandContext(nodeTypes, undefined, fd);
    if (!ctx) throw new Error('No command context');

    expect(executeCommand(parse('add merge at 1660,200'), ctx).ok).toBe(true);

    // getWorkflowState() in AIChatPanel reads exactly this, at send time.
    expect(fd.workflow.current?.nodes.map((n) => n.id)).toEqual(['merge.1']);
  });
});

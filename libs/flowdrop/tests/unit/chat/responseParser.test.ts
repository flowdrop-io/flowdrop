import { describe, it, expect } from 'vitest';
import { extractCommands } from '../../../src/lib/chat/responseParser.js';

describe('extractCommands', () => {
  it('returns explanation with empty commands for pure text', () => {
    const response = 'Here is some explanation about your workflow.\nIt has two nodes connected.';
    const result = extractCommands(response);
    expect(result.explanation).toBe(response);
    expect(result.commands).toEqual([]);
  });

  it('extracts commands from flowdrop fenced code blocks', () => {
    const response = `Here is what I'll do:

\`\`\`flowdrop
add llm_node
add http_request
connect llm_node.1 output to http_request.1 input
\`\`\`

Let me know if you'd like changes.`;

    const result = extractCommands(response);
    expect(result.commands).toEqual([
      'add llm_node',
      'add http_request',
      'connect llm_node.1 output to http_request.1 input'
    ]);
    expect(result.explanation).toContain("Here is what I'll do:");
    expect(result.explanation).toContain("Let me know if you'd like changes.");
  });

  it('handles mixed text and commands', () => {
    const response = `I'll add a node first.

\`\`\`flowdrop
add llm_node
\`\`\`

Now let me connect it.

\`\`\`flowdrop
connect llm_node.1 output to http_request.1 input
\`\`\`

Done!`;

    const result = extractCommands(response);
    expect(result.commands).toEqual([
      'add llm_node',
      'connect llm_node.1 output to http_request.1 input'
    ]);
    expect(result.explanation).toContain("I'll add a node first.");
    expect(result.explanation).toContain('Now let me connect it.');
    expect(result.explanation).toContain('Done!');
  });

  it('handles multiple code blocks', () => {
    const response = `\`\`\`flowdrop
add llm_node
\`\`\`

\`\`\`flowdrop
add http_request
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(['add llm_node', 'add http_request']);
  });

  it('returns empty commands for empty input', () => {
    const result = extractCommands('');
    expect(result.explanation).toBe('');
    expect(result.commands).toEqual([]);
  });

  it('skips empty lines inside code blocks', () => {
    const response = `\`\`\`flowdrop
add llm_node

add http_request
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(['add llm_node', 'add http_request']);
  });

  it('skips comment lines inside code blocks', () => {
    const response = `\`\`\`flowdrop
# This adds a node
add llm_node
// Connect them
connect llm_node.1 output to http_request.1 input
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual([
      'add llm_node',
      'connect llm_node.1 output to http_request.1 input'
    ]);
  });

  it('ignores bare (untagged) fenced code blocks', () => {
    const response = `Here are the commands:

\`\`\`
add llm_node
\`\`\`

Done!`;

    const result = extractCommands(response);
    expect(result.commands).toEqual([]);
    expect(result.explanation).toContain('Here are the commands:');
    expect(result.explanation).toContain('Done!');
  });

  it('ignores non-flowdrop language code blocks', () => {
    const response = `Here's some JavaScript:

\`\`\`javascript
console.log("hello");
\`\`\`

And here are the commands:

\`\`\`flowdrop
add llm_node
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(['add llm_node']);
    expect(result.explanation).toContain("Here's some JavaScript:");
    expect(result.explanation).toContain('And here are the commands:');
  });

  it('handles response with only a code block', () => {
    const response = `\`\`\`flowdrop
list_nodes
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(['list_nodes']);
    expect(result.explanation).toBe('');
  });

  describe('multiline triple-quote values', () => {
    it('extracts a basic multiline value as a single command string', () => {
      const response = `\`\`\`flowdrop
set llm_node.1:system_prompt """
You are helpful.
Answer concisely.
"""
\`\`\``;

      const result = extractCommands(response);
      expect(result.commands).toEqual([
        'set llm_node.1:system_prompt """\nYou are helpful.\nAnswer concisely.\n"""'
      ]);
    });

    it('does not close the block when a content line ends with """ (bug 1 regression)', () => {
      const response = `\`\`\`flowdrop
set note.1:content """
Use Python """docstrings""" for documentation.
Wrap them in triple quotes.
"""
\`\`\``;

      const result = extractCommands(response);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toContain('Use Python """docstrings"""');
      expect(result.commands[0]).toContain('Wrap them in triple quotes.');
    });

    it('does not close the flowdrop block when content contains nested code fences (bug 2 regression)', () => {
      const response = `\`\`\`flowdrop
set llm_node.1:system_prompt """
Use this example:
\`\`\`python
def greet(): pass
\`\`\`
"""
add http_request
\`\`\``;

      const result = extractCommands(response);
      expect(result.commands).toHaveLength(2);
      expect(result.commands[0]).toContain('```python');
      expect(result.commands[1]).toBe('add http_request');
    });

    it('handles multiline JSON value inside triple-quotes', () => {
      const response = `\`\`\`flowdrop
set api_node.1:headers """
{"Content-Type": "application/json", "Authorization": "Bearer token"}
"""
\`\`\``;

      const result = extractCommands(response);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toContain('"Content-Type"');
    });

    it('preserves \\""" escape sequence in extracted command (not treated as close)', () => {
      const response = `\`\`\`flowdrop
set note.1:content """
The delimiter is \\""" in our DSL.
"""
\`\`\``;

      const result = extractCommands(response);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toContain('\\"""');
    });

    it('silently drops an unclosed triple-quote block', () => {
      const response = `\`\`\`flowdrop
set llm_node.1:system_prompt """
This value is never closed
\`\`\``;

      const result = extractCommands(response);
      expect(result.commands).toEqual([]);
    });

    it('extracts multiline command followed by a single-line command', () => {
      const response = `\`\`\`flowdrop
set llm_node.1:system_prompt """
You are helpful.
"""
add http_request
\`\`\``;

      const result = extractCommands(response);
      expect(result.commands).toEqual([
        'set llm_node.1:system_prompt """\nYou are helpful.\n"""',
        'add http_request'
      ]);
    });
  });
});

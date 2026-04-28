/**
 * Response Parser for LLM Chat Interface
 *
 * Extracts DSL commands from LLM markdown responses by parsing
 * fenced code blocks labeled ```flowdrop. All other fenced blocks
 * (bare ```, ```python, etc.) are treated as explanation text.
 *
 * @module chat/responseParser
 */

import type { ExtractedCommands } from '../types/chat.js';

/**
 * Extract DSL commands from an LLM response string.
 *
 * Only fenced code blocks labeled `flowdrop` are parsed for commands.
 * All other fenced blocks are passed through as explanation text.
 * Empty lines and comment lines inside flowdrop blocks are skipped.
 *
 * @param llmResponse - The raw LLM response text (may contain markdown)
 * @returns Extracted commands and explanation text
 */
export function extractCommands(llmResponse: string): ExtractedCommands {
  const commands: string[] = [];
  const explanationParts: string[] = [];

  const lines = llmResponse.split('\n');
  let inCodeBlock = false;
  let isFlowdropBlock = false;
  let currentExplanation: string[] = [];
  let multilineBuffer: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle multiline buffer FIRST — prevents code fences inside """...""" from
    // closing the outer flowdrop block or being misinterpreted as control lines.
    if (multilineBuffer !== null) {
      // Closing """ must be a standalone line (exact match after trimming).
      // This prevents content lines that end with """ from prematurely closing
      // the block (e.g. `Use Python """docstrings"""` or JSON ending with """).
      if (trimmed === '"""') {
        multilineBuffer.push(line);
        commands.push(multilineBuffer.join('\n'));
        multilineBuffer = null;
      } else {
        multilineBuffer.push(line); // preserve raw indentation inside value
      }
      continue;
    }

    // Check for code block fence opening/closing
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        // Opening fence
        inCodeBlock = true;
        const lang = trimmed.slice(3).trim().toLowerCase();
        isFlowdropBlock = lang === 'flowdrop';
        // Flush accumulated explanation text
        if (currentExplanation.length > 0) {
          explanationParts.push(currentExplanation.join('\n'));
          currentExplanation = [];
        }
      } else {
        // Closing fence
        inCodeBlock = false;
        isFlowdropBlock = false;
      }
      continue;
    }

    if (inCodeBlock && isFlowdropBlock) {
      // Skip empty lines and comment lines inside code blocks
      if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('//')) {
        continue;
      }

      // Detect opening triple-quote without a closing one on the same line —
      // start accumulating a multiline value block
      const tripleOpen = trimmed.indexOf('"""');
      if (tripleOpen !== -1 && trimmed.indexOf('"""', tripleOpen + 3) === -1) {
        // Opening triple-quote with no closing on this line — start buffer
        multilineBuffer = [trimmed];
        continue;
      }

      commands.push(trimmed);
    } else if (!inCodeBlock) {
      currentExplanation.push(line);
    }
  }

  // Flush dangling multiline buffer (LLM never closed """ and the response
  // ended before any closing fence). Surface as a command so the parser
  // produces a visible error rather than silently dropping the content.
  if (multilineBuffer !== null) {
    commands.push(multilineBuffer.join('\n'));
    multilineBuffer = null;
  }

  // Flush remaining explanation text
  if (currentExplanation.length > 0) {
    explanationParts.push(currentExplanation.join('\n'));
  }

  const explanation = explanationParts.join('\n').trim();

  return { explanation, commands };
}

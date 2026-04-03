/**
 * Response Parser for LLM Chat Interface
 *
 * Extracts DSL commands from LLM markdown responses by parsing
 * fenced code blocks (```flowdrop or bare ```).
 *
 * @module chat/responseParser
 */

import type { ExtractedCommands } from "../types/chat.js";

/**
 * Extract DSL commands from an LLM response string.
 *
 * Parses fenced code blocks labeled `flowdrop` (preferred) or bare
 * fenced code blocks (fallback). Text outside code blocks becomes
 * the explanation. Empty lines and comment lines inside code blocks
 * are skipped.
 *
 * @param llmResponse - The raw LLM response text (may contain markdown)
 * @returns Extracted commands and explanation text
 */
export function extractCommands(llmResponse: string): ExtractedCommands {
  const commands: string[] = [];
  const explanationParts: string[] = [];

  const lines = llmResponse.split("\n");
  let inCodeBlock = false;
  let isFlowdropBlock = false;
  let currentExplanation: string[] = [];
  let multilineBuffer: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for code block fence opening/closing
    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        // Opening fence
        inCodeBlock = true;
        const lang = trimmed.slice(3).trim().toLowerCase();
        isFlowdropBlock = lang === "flowdrop" || lang === "";
        // Flush accumulated explanation text
        if (currentExplanation.length > 0) {
          explanationParts.push(currentExplanation.join("\n"));
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
      if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("//")) {
        continue;
      }

      // Detect opening triple-quote without a closing one on the same line —
      // start accumulating a multiline value block
      if (multilineBuffer !== null) {
        // We're inside a triple-quoted value; check for closing """
        if (trimmed === '"""' || trimmed.endsWith('"""')) {
          multilineBuffer.push(line);
          commands.push(multilineBuffer.join("\n"));
          multilineBuffer = null;
        } else {
          multilineBuffer.push(line); // preserve raw indentation inside value
        }
        continue;
      }

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

  // Flush remaining explanation text
  if (currentExplanation.length > 0) {
    explanationParts.push(currentExplanation.join("\n"));
  }

  const explanation = explanationParts.join("\n").trim();

  return { explanation, commands };
}

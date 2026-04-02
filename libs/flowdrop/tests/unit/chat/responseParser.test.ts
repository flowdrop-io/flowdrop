import { describe, it, expect } from "vitest";
import { extractCommands } from "../../../src/lib/chat/responseParser.js";

describe("extractCommands", () => {
  it("returns explanation with empty commands for pure text", () => {
    const response = "Here is some explanation about your workflow.\nIt has two nodes connected.";
    const result = extractCommands(response);
    expect(result.explanation).toBe(response);
    expect(result.commands).toEqual([]);
  });

  it("extracts commands from flowdrop fenced code blocks", () => {
    const response = `Here is what I'll do:

\`\`\`flowdrop
add llm_node
add http_request
connect llm_node.1 output to http_request.1 input
\`\`\`

Let me know if you'd like changes.`;

    const result = extractCommands(response);
    expect(result.commands).toEqual([
      "add llm_node",
      "add http_request",
      "connect llm_node.1 output to http_request.1 input",
    ]);
    expect(result.explanation).toContain("Here is what I'll do:");
    expect(result.explanation).toContain("Let me know if you'd like changes.");
  });

  it("extracts commands from bare fenced code blocks as fallback", () => {
    const response = `Try this:

\`\`\`
add text_template
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(["add text_template"]);
    expect(result.explanation).toBe("Try this:");
  });

  it("handles mixed text and commands", () => {
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
      "add llm_node",
      "connect llm_node.1 output to http_request.1 input",
    ]);
    expect(result.explanation).toContain("I'll add a node first.");
    expect(result.explanation).toContain("Now let me connect it.");
    expect(result.explanation).toContain("Done!");
  });

  it("handles multiple code blocks", () => {
    const response = `\`\`\`flowdrop
add llm_node
\`\`\`

\`\`\`flowdrop
add http_request
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(["add llm_node", "add http_request"]);
  });

  it("returns empty commands for empty input", () => {
    const result = extractCommands("");
    expect(result.explanation).toBe("");
    expect(result.commands).toEqual([]);
  });

  it("skips empty lines inside code blocks", () => {
    const response = `\`\`\`flowdrop
add llm_node

add http_request
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(["add llm_node", "add http_request"]);
  });

  it("skips comment lines inside code blocks", () => {
    const response = `\`\`\`flowdrop
# This adds a node
add llm_node
// Connect them
connect llm_node.1 output to http_request.1 input
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual([
      "add llm_node",
      "connect llm_node.1 output to http_request.1 input",
    ]);
  });

  it("ignores non-flowdrop language code blocks", () => {
    const response = `Here's some JavaScript:

\`\`\`javascript
console.log("hello");
\`\`\`

And here are the commands:

\`\`\`flowdrop
add llm_node
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(["add llm_node"]);
    expect(result.explanation).toContain("Here's some JavaScript:");
    expect(result.explanation).toContain("And here are the commands:");
  });

  it("handles response with only a code block", () => {
    const response = `\`\`\`flowdrop
list_nodes
\`\`\``;

    const result = extractCommands(response);
    expect(result.commands).toEqual(["list_nodes"]);
    expect(result.explanation).toBe("");
  });
});

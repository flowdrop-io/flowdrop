/**
 * FlowDrop Workflow Validation
 *
 * Lightweight validation utilities for workflow JSON data.
 * Checks minimum required fields without relying on a full JSON Schema validator library.
 *
 * @module utils/validation
 */

/**
 * Result of a workflow validation check.
 */
export interface WorkflowValidationResult {
  valid: boolean;
  /** Human-readable description of the first validation failure, or undefined if valid. */
  error?: string;
}

/**
 * Validate that the given value has the minimum required fields of a FlowDrop Workflow.
 *
 * Required fields (matching the Workflow type and workflow.schema.json):
 * - `id`    — string
 * - `name`  — string
 * - `nodes` — array
 * - `edges` — array
 *
 * @param data - The parsed JSON value to validate.
 * @returns A `WorkflowValidationResult` indicating whether the data is valid.
 */
export function validateWorkflowData(data: unknown): WorkflowValidationResult {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "Workflow must be a JSON object." };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string" || obj.id.trim() === "") {
    return {
      valid: false,
      error: 'Workflow JSON must contain a non-empty string "id" field.',
    };
  }

  if (typeof obj.name !== "string" || obj.name.trim() === "") {
    return {
      valid: false,
      error: 'Workflow JSON must contain a non-empty string "name" field.',
    };
  }

  if (!Array.isArray(obj.nodes)) {
    return {
      valid: false,
      error: 'Workflow JSON must contain a "nodes" array.',
    };
  }

  if (!Array.isArray(obj.edges)) {
    return {
      valid: false,
      error: 'Workflow JSON must contain an "edges" array.',
    };
  }

  return { valid: true };
}

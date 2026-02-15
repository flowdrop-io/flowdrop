/**
 * FlowDrop Workflow JSON Schema
 *
 * Provides the versioned JSON Schema for the FlowDrop workflow document format.
 * The schema is generated from the OpenAPI YAML definitions in `api/components/schemas/`.
 *
 * @example
 * ```typescript
 * import { workflowSchema, WORKFLOW_SCHEMA_VERSION } from '@d34dman/flowdrop/core';
 *
 * // Use with any JSON Schema validator (e.g., Ajv)
 * import Ajv from 'ajv/dist/2020';
 * const ajv = new Ajv();
 * const validate = ajv.compile(workflowSchema);
 * const valid = validate(myWorkflow);
 * ```
 *
 * @module schema
 */

import workflowSchema from '../../../schemas/v1/workflow.schema.json';

/** Current workflow schema format version */
export const WORKFLOW_SCHEMA_VERSION = '1.0.0';

export { workflowSchema };

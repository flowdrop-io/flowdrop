/**
 * Sample data for the FlowDrop demos.
 *
 * Ported verbatim from `apps/example-server-express/src/data` so the demos show
 * the exact same node registry, workflows, port config, and categories a real
 * backend would serve — but bundled statically, with zero network calls.
 *
 * The seed files carry their own loose local types (see `./types.ts`). The
 * library's strict types (`NodeMetadata`, `Workflow`, …) are structurally
 * compatible, so routes cast at the `<App>` boundary via the helpers below.
 */
import type {
  NodeMetadata as LibNodeMetadata,
  Workflow as LibWorkflow,
  PortConfig as LibPortConfig,
  CategoryDefinition as LibCategoryDefinition
} from '@flowdrop/flowdrop/core';

import { nodes as rawNodes, getNodeById } from './nodes.js';
import { getAllWorkflows } from './workflows.js';
import { portConfig as rawPortConfig } from './portConfig.js';
import { categories as rawCategories } from './categories.js';

/** Full curated node registry (covers every category). */
export const nodes = rawNodes as unknown as LibNodeMetadata[];

/** Port-compatibility configuration. */
export const portConfig = rawPortConfig as unknown as LibPortConfig;

/** Sidebar category definitions. */
export const categories = rawCategories as unknown as LibCategoryDefinition[];

/** All seed workflows, with node metadata already resolved inline. */
export const workflows = getAllWorkflows() as unknown as LibWorkflow[];

/** The "Simple Chat Pipeline" — the canonical demo workflow. */
export const sampleWorkflow = workflows[0];

export { getNodeById };

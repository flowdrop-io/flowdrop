/**
 * Generate a self-contained JSON Schema for the FlowDrop Workflow format
 * from the existing OpenAPI YAML component schemas.
 *
 * Usage:
 *   node scripts/generate-schema.mjs          # Generate schemas/v1/workflow.schema.json
 *   node scripts/generate-schema.mjs --check  # Verify committed file matches generated output
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse as parseYAML } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCHEMAS_DIR = resolve(ROOT, 'api/components/schemas');
const OUTPUT_PATH = resolve(ROOT, 'schemas/v1/workflow.schema.json');

// ---------------------------------------------------------------------------
// 1. Load and parse all YAML source files
// ---------------------------------------------------------------------------

/** @type {Record<string, Record<string, unknown>>} filename -> parsed YAML */
const sources = {};

for (const file of ['workflow.yaml', 'node.yaml', 'common.yaml', 'config.yaml']) {
	sources[file] = parseYAML(readFileSync(resolve(SCHEMAS_DIR, file), 'utf-8'));
}

// ---------------------------------------------------------------------------
// 2. Build a lookup from every named schema across all files
//    e.g. { 'workflow.yaml': { 'Workflow': {...}, 'WorkflowNode': {...} }, ... }
//    Already structured this way by the YAML parse (top-level keys = schema names).
// ---------------------------------------------------------------------------

/**
 * Resolve a `$ref` string to { file, name }.
 *
 * Patterns found in the YAML:
 *   '#/WorkflowNode'               -> same file, schema "WorkflowNode"
 *   './common.yaml#/Position'      -> file common.yaml, schema "Position"
 *   './node.yaml#/NodeConfig'      -> file node.yaml, schema "NodeConfig"
 *   './config.yaml#/ConfigSchema'  -> file config.yaml, schema "ConfigSchema"
 */
function parseRef(ref, currentFile) {
	if (ref.startsWith('#/')) {
		return { file: currentFile, name: ref.slice(2) };
	}
	const [filePart, fragmentPart] = ref.split('#');
	const file = filePart.replace('./', '');
	return { file, name: fragmentPart.slice(1) }; // strip leading /
}

// ---------------------------------------------------------------------------
// 3. Determine which schemas are reachable from the root "Workflow" type
//    and collect them into `$defs`.
// ---------------------------------------------------------------------------

/** Set of schema names that are included in the output $defs */
const collectedDefs = new Set();

/** @type {Record<string, unknown>} name -> converted JSON Schema definition */
const defs = {};

/**
 * Recursively walk a schema object and:
 *  - Rewrite `$ref` to `#/$defs/<Name>`
 *  - Strip OpenAPI-only properties (`example`, `examples`)
 *  - Collect any referenced definitions we haven't processed yet
 *  - Handle `$ref` alongside sibling properties (like `description`)
 */
function convertSchema(schema, currentFile) {
	if (schema == null || typeof schema !== 'object') return schema;

	if (Array.isArray(schema)) {
		return schema.map((item) => convertSchema(item, currentFile));
	}

	const result = {};

	for (const [key, value] of Object.entries(schema)) {
		// Strip OpenAPI-specific properties
		if (key === 'example' || key === 'examples') continue;

		if (key === '$ref') {
			const { file, name } = parseRef(value, currentFile);
			// Queue this definition for collection if not already done
			if (!collectedDefs.has(name)) {
				collectDef(file, name);
			}
			result['$ref'] = `#/$defs/${name}`;
		} else if (key === 'allOf' || key === 'anyOf' || key === 'oneOf') {
			result[key] = value.map((item) => convertSchema(item, currentFile));
		} else if (key === 'properties') {
			result.properties = {};
			for (const [propName, propSchema] of Object.entries(value)) {
				result.properties[propName] = convertSchema(propSchema, currentFile);
			}
		} else if (key === 'additionalProperties' && typeof value === 'object') {
			result.additionalProperties = convertSchema(value, currentFile);
		} else if (key === 'items') {
			result.items = convertSchema(value, currentFile);
		} else {
			result[key] = value;
		}
	}

	// If we have $ref alongside other properties (e.g., $ref + description),
	// use allOf to merge them per JSON Schema semantics.
	if (result['$ref'] && Object.keys(result).length > 1) {
		const { $ref, ...rest } = result;
		return { allOf: [{ $ref }, rest] };
	}

	return result;
}

/**
 * Collect a named schema into `$defs`, converting it along the way.
 */
function collectDef(file, name) {
	if (collectedDefs.has(name)) return;
	collectedDefs.add(name); // Mark early to prevent infinite recursion

	const source = sources[file]?.[name];
	if (!source) {
		throw new Error(`Schema not found: ${file}#/${name}`);
	}

	defs[name] = convertSchema(source, file);
}

// ---------------------------------------------------------------------------
// 4. Start from the root "Workflow" schema and build the output
// ---------------------------------------------------------------------------

// Convert the root Workflow schema (it will recursively collect all dependencies)
const workflowSource = sources['workflow.yaml']['Workflow'];
const rootSchema = convertSchema(workflowSource, 'workflow.yaml');

// Sort $defs alphabetically for stable output
const sortedDefs = {};
for (const key of Object.keys(defs).sort()) {
	sortedDefs[key] = defs[key];
}

const outputSchema = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$id: 'https://flowdrop.io/schemas/v1/workflow.schema.json',
	title: 'FlowDrop Workflow',
	description:
		'Schema for a FlowDrop workflow document. Validates the structure of workflows created by the FlowDrop visual workflow editor.',
	...rootSchema,
	$defs: sortedDefs
};

const output = JSON.stringify(outputSchema, null, 2) + '\n';

// ---------------------------------------------------------------------------
// 5. Write or check
// ---------------------------------------------------------------------------

const isCheck = process.argv.includes('--check');

if (isCheck) {
	let committed;
	try {
		committed = readFileSync(OUTPUT_PATH, 'utf-8');
	} catch {
		console.error(`ERROR: ${OUTPUT_PATH} does not exist. Run 'npm run schema:generate' first.`);
		process.exit(1);
	}
	if (committed !== output) {
		console.error(
			"ERROR: Committed schema is out of date. Run 'npm run schema:generate' to update."
		);
		process.exit(1);
	}
	console.log('Schema is up to date.');
} else {
	writeFileSync(OUTPUT_PATH, output);
	console.log(`Generated ${OUTPUT_PATH}`);
	console.log(`  ${Object.keys(sortedDefs).length} definitions collected`);
}

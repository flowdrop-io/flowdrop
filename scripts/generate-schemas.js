#!/usr/bin/env node
/**
 * Generate JSON Schemas from TypeScript types
 * 
 * This script generates JSON Schema files for FlowDrop's core types,
 * allowing backend implementations to validate the JSON they produce.
 * 
 * Usage:
 *   npm run generate:schemas
 * 
 * Output:
 *   schemas/node-metadata.schema.json - Schema for NodeMetadata
 *   schemas/config-schema.schema.json - Schema for ConfigSchema
 *   schemas/port-config.schema.json   - Schema for PortConfig
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const schemasDir = join(rootDir, 'schemas');

// Ensure schemas directory exists
if (!existsSync(schemasDir)) {
  mkdirSync(schemasDir, { recursive: true });
}

// Types to generate schemas for
const types = [
  { name: 'NodeMetadata', output: 'node-metadata.schema.json' },
  { name: 'ConfigSchema', output: 'config-schema.schema.json' },
  { name: 'PortConfig', output: 'port-config.schema.json' },
  { name: 'NodePort', output: 'node-port.schema.json' },
  { name: 'ConfigProperty', output: 'config-property.schema.json' },
];

console.log('Generating JSON Schemas from TypeScript types...\n');

for (const type of types) {
  const outputPath = join(schemasDir, type.output);
  console.log(`  Generating ${type.name} -> ${type.output}`);
  
  try {
    execSync(
      `npx ts-json-schema-generator ` +
      `--path "src/lib/types/schema-types.ts" ` +
      `--type "${type.name}" ` +
      `--tsconfig tsconfig.json ` +
      `--no-type-check ` +
      `--out "${outputPath}"`,
      { cwd: rootDir, stdio: 'pipe' }
    );
    console.log(`    ✓ Generated ${type.output}`);
  } catch (error) {
    console.error(`    ✗ Failed to generate ${type.name}: ${error.message}`);
    process.exit(1);
  }
}

console.log('\nDone! Schemas written to schemas/ directory.');

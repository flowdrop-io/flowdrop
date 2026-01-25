# FlowDrop JSON Schemas

This directory contains JSON Schema files generated from FlowDrop's TypeScript types.
These schemas can be used by backend implementations to validate the JSON they produce
for the FlowDrop editor.

## Available Schemas

| Schema | Description |
|--------|-------------|
| `node-metadata.schema.json` | Schema for node type definitions (NodeMetadata) |
| `config-schema.schema.json` | Schema for node configuration schemas (ConfigSchema) |
| `config-property.schema.json` | Schema for individual config properties (ConfigProperty) |
| `node-port.schema.json` | Schema for node port definitions (NodePort) |
| `port-config.schema.json` | Schema for port configuration system (PortConfig) |

## Usage

### In JavaScript/TypeScript

```typescript
import nodeMetadataSchema from '@d34dman/flowdrop/schemas/node-metadata.schema.json';
import Ajv from 'ajv';

const ajv = new Ajv();
const validate = ajv.compile(nodeMetadataSchema);

const myNodeType = {
  id: 'my-node',
  name: 'My Node',
  // ...
};

if (!validate(myNodeType)) {
  console.error('Validation errors:', validate.errors);
}
```

### In Rust

Using the `jsonschema` crate:

```rust
use jsonschema::JSONSchema;
use serde_json::json;

let schema = serde_json::from_str(include_str!("node-metadata.schema.json"))?;
let compiled = JSONSchema::compile(&schema)?;

let node_metadata = json!({
    "id": "my-node",
    "name": "My Node",
    // ...
});

if let Err(errors) = compiled.validate(&node_metadata) {
    for error in errors {
        eprintln!("Validation error: {}", error);
    }
}
```

## Regenerating Schemas

To regenerate schemas after modifying TypeScript types:

```bash
npm run generate:schemas
```

This requires `ts-json-schema-generator` to be installed (already in devDependencies).

## Schema Source

Schemas are generated from `src/lib/types/schema-types.ts`, which re-exports types
from the main types file (`src/lib/types/index.ts`) that don't have Svelte dependencies.

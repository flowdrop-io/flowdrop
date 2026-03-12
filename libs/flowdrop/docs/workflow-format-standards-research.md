# Workflow Format Standards Research — Findings & Options

## Context

FlowDrop stores workflows in a custom JSON format (nodes + edges + metadata). This research investigates whether a universal standard format exists that FlowDrop could adopt, and evaluates the trade-offs.

---

## TL;DR

**No universal standard fully covers FlowDrop's requirements.** The closest candidates are:

1. **Open Agent Spec** (5/9 features) — best semantic alignment for AI workflows
2. **ComfyUI format** (4/9 features) — best structural alignment (typed ports + separate links array)

FlowDrop's custom format is well-designed and covers more than any existing standard. The decision is whether to formalize the format, build adapters, or both.

---

## Standards Evaluated

### 1. BPMN 2.0 (Score: 3/9)

- **Format**: XML only (no official JSON)
- **Strengths**: Mature (ISO 19510), excellent branching/gateway semantics, diagram interchange for visual layout, rich extension system
- **Weaknesses**: XML-only, no typed ports, no config schemas, no dynamic ports. Enterprise-heavyweight
- **Adoption**: Very high — Camunda, Flowable, jBPM, IBM, Oracle, SAP
- **Tooling**: bpmn-js, bpmn-moddle, Camunda Modeler
- **FlowDrop fit**: Poor — fundamentally different model (process-centric vs node-graph)

### 2. JSON Graph Format / JGF (Score: 1/9)

- **Format**: JSON
- **Structure**: `{ graph: { nodes: {id: {label, metadata}}, edges: [{source, target, relation, metadata}] } }`
- **Strengths**: Minimal, extensible via metadata, JSON-native
- **Weaknesses**: Too minimal — provides only the graph substrate. All workflow features must go in metadata
- **Adoption**: Low — academic/research usage
- **FlowDrop fit**: Poor — would be "FlowDrop's format in a JGF wrapper" with no real interop benefit

### 3. Common Workflow Language / CWL v1.2 (Score: 2/9)

- **Format**: YAML/JSON with SALAD preprocessing
- **Strengths**: Strong type system, portable across execution environments
- **Weaknesses**: Scientific batch processing focus, implicit edges (via `source` references), no visual layout, SALAD adds complexity
- **Adoption**: High in bioinformatics — FDA, GA4GH, Seven Bridges
- **FlowDrop fit**: Poor — fundamentally different domain (CLI tool chaining)

### 4. Workflow Description Language / WDL (Score: 2/9)

- **Format**: Custom DSL (not JSON/YAML)
- **Strengths**: Strong type system, scatter/gather parallelism
- **Weaknesses**: Text-based DSL with no JSON representation, no visual concept
- **Adoption**: High in genomics — Broad Institute, Terra
- **FlowDrop fit**: Very poor — zero structural overlap

### 5. n8n Workflow Format (Score: 3/9)

- **Format**: JSON (no formal spec)
- **Structure**: `{ nodes: [{id, name, type, position, parameters}], connections: {nodeName: {main: [[{node, type, index}]]}} }`
- **Strengths**: Positions, branching (IF/Switch), large template community (1000+)
- **Weaknesses**: Connections keyed by node **name** (fragile), no typed ports, no config schemas, no port system
- **Adoption**: Very high — 50k+ GitHub stars, 400+ integrations
- **FlowDrop fit**: Moderate — import possible but lossy (no types, no schemas)

### 6. Node-RED Flow Format (Score: 2/9)

- **Format**: JSON (flat array of all objects)
- **Structure**: `[{id, type, x, y, wires: [[targetId1], [targetId2]]}]` — edges embedded in nodes
- **Strengths**: Positions, large ecosystem (4000+ community nodes)
- **Weaknesses**: Flat array mixing tabs/nodes/configs, edges embedded in nodes (not separate), no types, no schemas
- **Adoption**: Very high in IoT — IBM-originated, OpenJS Foundation
- **FlowDrop fit**: Moderate — requires significant structural transformation

### 7. ComfyUI Workflow Format (Score: 4/9) — Structurally Closest

- **Format**: JSON with official JSON Schema
- **Structure**:
  ```json
  {
    "nodes": [{
      "id": 1, "type": "KSampler",
      "pos": [315, 178], "size": [315, 262],
      "inputs": [{"name": "model", "type": "MODEL", "link": 1}],
      "outputs": [{"name": "LATENT", "type": "LATENT", "links": [4]}],
      "widgets_values": [8566257, "randomize", 20]
    }],
    "links": [[link_id, origin_node, origin_slot, target_node, target_slot, data_type]]
  }
  ```
- **Strengths**: Separate nodes + links arrays, typed ports on every connection, positions + sizes, groups with bounding boxes, official JSON Schema
- **Weaknesses**: Config is positional `widgets_values` (fragile, not named), no branching, Litegraph quirks (slot indices instead of port names)
- **Adoption**: Very high in AI image generation — dominant tool, thousands of custom nodes
- **FlowDrop fit**: Good structural match — closest architecture to FlowDrop's model

### 8. Open Agent Specification (Score: 5/9) — Semantically Closest

- **Format**: YAML/JSON
- **Structure**:
  ```yaml
  component_type: flow
  nodes:
    classify:
      component_type: llm_node
      inputs: [{ title: "input", type: "string" }]
      outputs: [{ title: "category", type: "string" }]
    branch:
      component_type: branching_node
      branches:
        - name: "technical"
          condition: "category == 'technical'"
  control_flow_edges:
    - { from_node: "start", to_node: "classify" }
  data_flow_edges:
    - {
        from_node: "classify",
        from_output: "category",
        to_node: "branch",
        to_input: "category",
      }
  ```
- **Strengths**: Typed ports with JSON Schema, branching with conditions, separate control-flow and data-flow edges, JSON Schema configs, AI-agent focus, named port connections
- **Weaknesses**: No visual layout, no dynamic ports, no extension system, emerging (not yet widely adopted)
- **Adoption**: Emerging (2025-2026) — Oracle-led, PyAgentSpec SDK, adapters for LangGraph/AutoGen/CrewAI
- **Key opportunity**: **No visual editor exists** — FlowDrop could become the visual editor for Agent Spec
- **FlowDrop fit**: Strong semantic alignment — best match for AI workflow domain

---

## Feature Coverage Matrix

| Feature            | BPMN    | JGF | CWL     | WDL | n8n     | Node-RED | ComfyUI | Agent Spec |
| ------------------ | ------- | --- | ------- | --- | ------- | -------- | ------- | ---------- |
| Typed Ports        | No      | No  | Yes     | Yes | No      | No       | Yes     | Yes        |
| Dynamic Ports      | No      | No  | No      | No  | Partial | Partial  | Partial | No         |
| Config Schemas     | No      | No  | Partial | No  | No      | No       | No      | Yes        |
| Visual Layout      | Yes     | No  | No      | No  | Yes     | Yes      | Yes     | No         |
| Branching/Gateways | Yes     | No  | Limited | Yes | Yes     | Partial  | No      | Yes        |
| Execution State    | Partial | No  | No      | No  | Partial | No       | Partial | Partial    |
| Handle-based Edges | No      | No  | No      | No  | No      | No       | Yes     | Yes        |
| Extension System   | Yes     | Yes | No      | No  | No      | No       | Yes     | No         |
| Rich Node Metadata | Yes     | No  | Partial | No  | Partial | Partial  | Partial | Yes        |

---

## FlowDrop Features No Standard Covers

These are unique to FlowDrop and would require custom extensions in any standard:

1. **Dynamic ports via config** — Users create input/output handles at runtime through `config.dynamicInputs` / `config.dynamicOutputs`
2. **Config-driven branching** — Branches defined as config arrays (not separate node types)
3. **Template variable autocomplete** — Automatic upstream port schema drilling (`{{ user.address.city }}`)
4. **Instance-level display overrides** — `instanceTitle`, `instanceBadge`, per-instance `nodeType` switching
5. **Port compatibility rules** — Configurable type-matching system (e.g., `string` -> `mixed`)
6. **Dynamic schema endpoints** — Fetch config schemas from REST APIs at runtime
7. **Extension namespacing** — Two-level (`metadata.extensions` + `data.extensions`) third-party data

---

## Options

### Option A: Build an Agent Spec Adapter

- FlowDrop's internal format stays as-is
- Build import/export to Agent Spec format
- FlowDrop becomes **the visual editor for Agent Spec** (unique market position)
- Lossy conversion: dynamic ports, template variables, visual layout would be FlowDrop-specific extensions
- **Effort**: Medium — mapping is mostly straightforward for the core features

### Option B: Formalize FlowDrop's Format as a Standard

- Publish a versioned JSON Schema for the `StandardWorkflow` format
- Document it as a specification others can adopt
- Version it (you already have `metadata.version`)
- **Effort**: Low-medium — format is already well-defined, needs formal schema + docs

### Option C: Hybrid (Formalize + Adapters)

- Formalize FlowDrop's format (Option B)
- Build adapters for Agent Spec, ComfyUI, and/or n8n
- Maximum interoperability while maintaining a strong core format
- **Effort**: High — multiple adapters to build and maintain

### Option D: Keep As-Is

- The research validates that FlowDrop's custom format is reasonable and more feature-rich than any standard
- No changes needed — revisit when a standard matures further
- **Effort**: None

---

## Key Files (for future reference)

| File                                      | Purpose                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| `src/lib/types/index.ts`                  | Core TypeScript interfaces (Workflow, Node, Edge, Port, etc.) |
| `src/lib/adapters/WorkflowAdapter.ts`     | StandardWorkflow <-> SvelteFlow conversion                    |
| `api/v1/components/schemas/workflow.yaml` | OpenAPI workflow schema                                       |
| `api/v1/components/schemas/node.yaml`     | OpenAPI node schema                                           |
| `api/v1/components/schemas/common.yaml`   | OpenAPI common types                                          |
| `api/v1/components/schemas/config.yaml`   | OpenAPI config schema                                         |
| `src/lib/services/workflowStorage.ts`     | Storage interface                                             |
| `src/mocks/data/workflows.ts`             | Example workflows                                             |

---

## Sources

- [BPMN 2.0 Specification (OMG)](https://www.omg.org/spec/BPMN/2.0.2/About-BPMN)
- [JSON Graph Format Specification](https://jsongraphformat.info/)
- [CWL v1.2 Standards](https://www.commonwl.org/v1.2/)
- [OpenWDL Specification](https://docs.openwdl.org/overview.html)
- [n8n Export/Import Docs](https://docs.n8n.io/workflows/export-import/)
- [Node-RED Flow Structure](https://nodered.org/docs/developing-flows/flow-structure)
- [ComfyUI Workflow JSON Specification](https://docs.comfy.org/specs/workflow_json)
- [Open Agent Specification (GitHub)](https://github.com/oracle/agent-spec)
- [Agent Spec Technical Report (arXiv)](https://arxiv.org/abs/2510.04173)

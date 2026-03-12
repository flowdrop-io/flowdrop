/**
 * Unit Tests - Workflow JSON Schema
 *
 * Tests that the generated JSON Schema is structurally correct and
 * validates FlowDrop workflow documents.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load the committed schema directly from disk (avoids bundler issues in tests)
const schemaPath = resolve(
  __dirname,
  "../../../src/lib/schemas/v1/workflow.schema.json",
);
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

describe("Workflow JSON Schema", () => {
  describe("schema metadata", () => {
    it("should use JSON Schema draft-2020-12", () => {
      expect(schema.$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
    });

    it("should have a $id", () => {
      expect(schema.$id).toBe(
        "https://flowdrop.io/schemas/v1/workflow.schema.json",
      );
    });

    it("should have a title and description", () => {
      expect(schema.title).toBe("FlowDrop Workflow");
      expect(schema.description).toBeTruthy();
    });
  });

  describe("root schema structure", () => {
    it("should be an object type", () => {
      expect(schema.type).toBe("object");
    });

    it("should require id, name, nodes, edges, and metadata", () => {
      expect(schema.required).toEqual(
        expect.arrayContaining(["id", "name", "nodes", "edges", "metadata"]),
      );
    });

    it("should define nodes as an array of WorkflowNode", () => {
      expect(schema.properties.nodes.type).toBe("array");
      expect(schema.properties.nodes.items.$ref).toBe("#/$defs/WorkflowNode");
    });

    it("should define edges as an array of WorkflowEdge", () => {
      expect(schema.properties.edges.type).toBe("array");
      expect(schema.properties.edges.items.$ref).toBe("#/$defs/WorkflowEdge");
    });

    it("should reference WorkflowMetadata for metadata", () => {
      expect(schema.properties.metadata.$ref).toBe("#/$defs/WorkflowMetadata");
    });
  });

  describe("$defs completeness", () => {
    const expectedDefs = [
      "WorkflowNode",
      "WorkflowEdge",
      "WorkflowMetadata",
      "NodeMetadata",
      "NodePort",
      "NodeConfig",
      "NodeExtensions",
      "NodeUIExtensions",
      "DynamicPort",
      "Branch",
      "NodeExecutionInfo",
      "NodeExecutionStatus",
      "ConfigSchema",
      "ConfigProperty",
      "OneOfItem",
      "AutocompleteConfig",
      "TemplateVariablesConfig",
      "VariableSchema",
      "TemplateVariable",
      "PortDataSchema",
      "Position",
      "NodeType",
      "NodeCategory",
      "NodeDataType",
    ];

    it.each(expectedDefs)("should contain $defs/%s", (defName) => {
      expect(schema.$defs).toHaveProperty(defName);
    });

    it("should not contain API-only schemas (CreateWorkflowRequest, UpdateWorkflowRequest)", () => {
      expect(schema.$defs).not.toHaveProperty("CreateWorkflowRequest");
      expect(schema.$defs).not.toHaveProperty("UpdateWorkflowRequest");
    });
  });

  describe("key definition structures", () => {
    it("WorkflowNode should require id, type, position, and data", () => {
      const def = schema.$defs.WorkflowNode;
      expect(def.required).toEqual(
        expect.arrayContaining(["id", "type", "position", "data"]),
      );
    });

    it("WorkflowEdge should require id, source, and target", () => {
      const def = schema.$defs.WorkflowEdge;
      expect(def.required).toEqual(
        expect.arrayContaining(["id", "source", "target"]),
      );
    });

    it("WorkflowMetadata should require version, createdAt, and updatedAt", () => {
      const def = schema.$defs.WorkflowMetadata;
      expect(def.required).toEqual(
        expect.arrayContaining(["version", "createdAt", "updatedAt"]),
      );
    });

    it("NodeMetadata should require id, name, description, category, version, inputs, and outputs", () => {
      const def = schema.$defs.NodeMetadata;
      expect(def.required).toEqual(
        expect.arrayContaining([
          "id",
          "name",
          "description",
          "category",
          "version",
          "inputs",
          "outputs",
        ]),
      );
    });

    it("Position should require x and y", () => {
      const def = schema.$defs.Position;
      expect(def.required).toEqual(expect.arrayContaining(["x", "y"]));
    });

    it("NodeType should enumerate built-in types", () => {
      const def = schema.$defs.NodeType;
      expect(def.enum).toEqual(
        expect.arrayContaining([
          "note",
          "simple",
          "square",
          "tool",
          "gateway",
          "terminal",
          "default",
        ]),
      );
    });

    it("NodeConfig should allow additional properties", () => {
      const def = schema.$defs.NodeConfig;
      expect(def.additionalProperties).toBe(true);
    });

    it("ConfigProperty should be recursive (items references itself)", () => {
      const def = schema.$defs.ConfigProperty;
      // items uses allOf with $ref to ConfigProperty
      const itemsRef =
        def.properties.items.$ref || def.properties.items.allOf?.[0]?.$ref;
      expect(itemsRef).toBe("#/$defs/ConfigProperty");
    });

    it("PortDataSchema should be recursive (properties/items reference itself)", () => {
      const def = schema.$defs.PortDataSchema;
      expect(def.properties.properties.additionalProperties.$ref).toBe(
        "#/$defs/PortDataSchema",
      );
    });
  });

  describe("no OpenAPI-only properties", () => {
    function findExamples(obj: unknown, path = ""): string[] {
      const found: string[] = [];
      if (obj == null || typeof obj !== "object") return found;
      for (const [key, value] of Object.entries(
        obj as Record<string, unknown>,
      )) {
        if (key === "example" || key === "examples") {
          found.push(`${path}.${key}`);
        }
        if (typeof value === "object" && value !== null) {
          found.push(...findExamples(value, `${path}.${key}`));
        }
      }
      return found;
    }

    it('should not contain any "example" or "examples" properties', () => {
      const found = findExamples(schema);
      expect(found).toEqual([]);
    });
  });

  describe("schema generation consistency", () => {
    it("committed schema should match freshly generated output", async () => {
      // Dynamically import the generation logic and run it
      const { execSync } = await import("node:child_process");
      const result = execSync("node scripts/generate-schema.mjs --check", {
        cwd: resolve(__dirname, "../../.."),
        encoding: "utf-8",
      });
      expect(result).toContain("up to date");
    });
  });
});

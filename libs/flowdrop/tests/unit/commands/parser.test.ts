import { describe, it, expect } from "vitest";
import { parseCommand } from "../../../src/lib/commands/parser.js";

describe("parseCommand", () => {
  // ==========================================================================
  // add_node
  // ==========================================================================
  describe("add", () => {
    it("parses add <type>", () => {
      const result = parseCommand("add llm_node");
      expect(result).toEqual({
        ok: true,
        command: { type: "add_node", nodeTypeId: "llm_node" },
      });
    });

    it("parses add <type> at <x>,<y>", () => {
      const result = parseCommand("add llm_node at 200,300");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "add_node",
          nodeTypeId: "llm_node",
          position: { x: 200, y: 300 },
        },
      });
    });

    it("parses add with negative coordinates", () => {
      const result = parseCommand("add llm_node at -50,-100");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "add_node",
          nodeTypeId: "llm_node",
          position: { x: -50, y: -100 },
        },
      });
    });

    it("parses add with spaces around comma in coords", () => {
      const result = parseCommand("add llm_node at 200 , 300");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "add_node",
          nodeTypeId: "llm_node",
          position: { x: 200, y: 300 },
        },
      });
    });

    it("parses add with decimal coordinates", () => {
      const result = parseCommand("add llm_node at 200.5,300.7");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "add_node",
          nodeTypeId: "llm_node",
          position: { x: 200.5, y: 300.7 },
        },
      });
    });

    it("is case-insensitive for verb", () => {
      expect(parseCommand("ADD llm_node")).toEqual({
        ok: true,
        command: { type: "add_node", nodeTypeId: "llm_node" },
      });
      expect(parseCommand("Add llm_node")).toEqual({
        ok: true,
        command: { type: "add_node", nodeTypeId: "llm_node" },
      });
    });

    it("preserves case of identifiers", () => {
      const result = parseCommand("add LLM_Node");
      expect(result).toEqual({
        ok: true,
        command: { type: "add_node", nodeTypeId: "LLM_Node" },
      });
    });

    it("returns error for add with no type", () => {
      const result = parseCommand("add");
      expect(result).toEqual({
        ok: false,
        error: "Invalid syntax for 'add' command",
        input: "add",
      });
    });
  });

  // ==========================================================================
  // delete_node
  // ==========================================================================
  describe("delete", () => {
    it("parses delete <nodeId>", () => {
      const result = parseCommand("delete llm_node.1");
      expect(result).toEqual({
        ok: true,
        command: { type: "delete_node", nodeId: "llm_node.1" },
      });
    });

    it("is case-insensitive for verb", () => {
      const result = parseCommand("DELETE llm_node.1");
      expect(result).toEqual({
        ok: true,
        command: { type: "delete_node", nodeId: "llm_node.1" },
      });
    });
  });

  // ==========================================================================
  // rename_node
  // ==========================================================================
  describe("rename", () => {
    it("parses rename <nodeId> <label>", () => {
      const result = parseCommand("rename llm_node.1 My Node");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "rename_node",
          nodeId: "llm_node.1",
          label: "My Node",
        },
      });
    });

    it("parses rename with single-word label", () => {
      const result = parseCommand("rename llm_node.1 ChatBot");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "rename_node",
          nodeId: "llm_node.1",
          label: "ChatBot",
        },
      });
    });

    it("parses rename with multi-word label", () => {
      const result = parseCommand("rename llm_node.1 My Awesome Chat Bot");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "rename_node",
          nodeId: "llm_node.1",
          label: "My Awesome Chat Bot",
        },
      });
    });
  });

  // ==========================================================================
  // set_config
  // ==========================================================================
  describe("set", () => {
    it("parses set <nodeId>:<key> <value>", () => {
      const result = parseCommand("set llm_node.1:model gpt-4");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "set_config",
          nodeId: "llm_node.1",
          key: "model",
          value: "gpt-4",
        },
      });
    });

    it("parses set with value containing spaces", () => {
      const result = parseCommand("set llm_node.1:system_prompt You are a helpful assistant");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "set_config",
          nodeId: "llm_node.1",
          key: "system_prompt",
          value: "You are a helpful assistant",
        },
      });
    });

    it("parses set with quoted value", () => {
      const result = parseCommand('set llm_node.1:name "42"');
      expect(result).toEqual({
        ok: true,
        command: {
          type: "set_config",
          nodeId: "llm_node.1",
          key: "name",
          value: '"42"',
        },
      });
    });

    it("parses set with numeric value", () => {
      const result = parseCommand("set llm_node.1:temperature 0.7");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "set_config",
          nodeId: "llm_node.1",
          key: "temperature",
          value: "0.7",
        },
      });
    });

    it("returns error for set with missing value", () => {
      const result = parseCommand("set llm_node.1:model");
      expect(result).toEqual({
        ok: false,
        error: "Invalid syntax for 'set' command",
        input: "set llm_node.1:model",
      });
    });
  });

  // ==========================================================================
  // get_config
  // ==========================================================================
  describe("get", () => {
    it("parses get <nodeId>:<key>", () => {
      const result = parseCommand("get llm_node.1:model");
      expect(result).toEqual({
        ok: true,
        command: {
          type: "get_config",
          nodeId: "llm_node.1",
          key: "model",
        },
      });
    });

    it("returns error for get without key", () => {
      const result = parseCommand("get llm_node.1");
      expect(result).toEqual({
        ok: false,
        error: "Invalid syntax for 'get' command",
        input: "get llm_node.1",
      });
    });
  });

  // ==========================================================================
  // info
  // ==========================================================================
  describe("info", () => {
    it("parses info <nodeId>", () => {
      const result = parseCommand("info llm_node.1");
      expect(result).toEqual({
        ok: true,
        command: { type: "info", nodeId: "llm_node.1" },
      });
    });
  });

  // ==========================================================================
  // config_open
  // ==========================================================================
  describe("config", () => {
    it("parses config <nodeId>", () => {
      const result = parseCommand("config llm_node.1");
      expect(result).toEqual({
        ok: true,
        command: { type: "config_open", nodeId: "llm_node.1" },
      });
    });
  });

  // ==========================================================================
  // select_node
  // ==========================================================================
  describe("select", () => {
    it("parses select <nodeId>", () => {
      const result = parseCommand("select llm_node.1");
      expect(result).toEqual({
        ok: true,
        command: { type: "select_node", nodeId: "llm_node.1" },
      });
    });
  });

  // ==========================================================================
  // Error cases
  // ==========================================================================
  describe("error handling", () => {
    it("returns error for empty input", () => {
      const result = parseCommand("");
      expect(result).toEqual({
        ok: false,
        error: "Empty command",
        input: "",
      });
    });

    it("returns error for whitespace-only input", () => {
      const result = parseCommand("   ");
      expect(result).toEqual({
        ok: false,
        error: "Empty command",
        input: "   ",
      });
    });

    it("returns error for unknown command", () => {
      const result = parseCommand("fly llm_node.1");
      expect(result).toEqual({
        ok: false,
        error: "Unknown command: fly",
        input: "fly llm_node.1",
      });
    });

    it("returns error for malformed known command", () => {
      const result = parseCommand("delete");
      expect(result).toEqual({
        ok: false,
        error: "Invalid syntax for 'delete' command",
        input: "delete",
      });
    });

    it("trims leading/trailing whitespace before parsing", () => {
      const result = parseCommand("  add llm_node  ");
      expect(result).toEqual({
        ok: true,
        command: { type: "add_node", nodeTypeId: "llm_node" },
      });
    });
  });
});

import { describe, it, expect } from "vitest";
import { isMutatingCommand } from "../../../src/lib/chat/commandClassifier.js";

describe("isMutatingCommand", () => {
  describe("read-only commands return false", () => {
    it.each(["list_nodes", "list_edges", "list_types", "info", "get_config", "help"])(
      "%s is read-only",
      (commandType) => {
        expect(isMutatingCommand(commandType)).toBe(false);
      },
    );
  });

  describe("mutating commands return true", () => {
    it.each([
      "add",
      "remove",
      "connect",
      "disconnect",
      "set_config",
      "layout",
      "rename",
      "move",
      "swap",
    ])("%s is mutating", (commandType) => {
      expect(isMutatingCommand(commandType)).toBe(true);
    });
  });

  it("treats unknown commands as mutating", () => {
    expect(isMutatingCommand("unknown_command")).toBe(true);
  });
});

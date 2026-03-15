/**
 * Unit Tests - Port Utilities
 *
 * Tests for applyPortOrder: ordering, partial lists, unknown IDs, and edge cases.
 */

import { describe, it, expect } from "vitest";
import { applyPortOrder } from "$lib/utils/portUtils.js";
import type { NodePort } from "$lib/types/index.js";

// Minimal port factory — only the fields applyPortOrder cares about
function makePort(id: string, dataType = "string"): NodePort {
  return { id, name: id, type: "input", dataType };
}

const A = makePort("a");
const B = makePort("b");
const C = makePort("c");
const D = makePort("d");

describe("applyPortOrder", () => {
  describe("no-op cases", () => {
    it("returns the original array when orderedIds is undefined", () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, undefined);
      expect(result).toEqual([A, B, C]);
    });

    it("returns the original array when orderedIds is empty", () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, []);
      expect(result).toEqual([A, B, C]);
    });

    it("returns the original array when ports is empty", () => {
      const result = applyPortOrder([], ["a", "b"]);
      expect(result).toEqual([]);
    });
  });

  describe("full ordering", () => {
    it("sorts ports to match the given order exactly", () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ["c", "a", "b"]);
      expect(result.map((p) => p.id)).toEqual(["c", "a", "b"]);
    });

    it("handles a two-port swap", () => {
      const ports = [A, B];
      const result = applyPortOrder(ports, ["b", "a"]);
      expect(result.map((p) => p.id)).toEqual(["b", "a"]);
    });

    it("preserves order when orderedIds matches existing order", () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ["a", "b", "c"]);
      expect(result.map((p) => p.id)).toEqual(["a", "b", "c"]);
    });
  });

  describe("partial ordering — unlisted ports go to end", () => {
    it("places listed ports first, unlisted last in original order", () => {
      const ports = [A, B, C, D];
      // Only specify b and d — a and c should follow in their original relative order
      const result = applyPortOrder(ports, ["b", "d"]);
      expect(result.map((p) => p.id)).toEqual(["b", "d", "a", "c"]);
    });

    it("places a single listed port first, rest follow in original order", () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ["c"]);
      expect(result.map((p) => p.id)).toEqual(["c", "a", "b"]);
    });

    it("preserves relative order of multiple unlisted ports", () => {
      const ports = [A, B, C, D];
      const result = applyPortOrder(ports, ["d"]);
      // d first, then a, b, c in original order
      expect(result.map((p) => p.id)).toEqual(["d", "a", "b", "c"]);
    });
  });

  describe("unknown IDs in orderedIds", () => {
    it("ignores IDs in orderedIds that do not exist in ports", () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ["z", "b", "a"]);
      // z doesn't exist — b and a are placed first, c follows
      expect(result.map((p) => p.id)).toEqual(["b", "a", "c"]);
    });

    it("returns ports in original order when all orderedIds are unknown", () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ["x", "y", "z"]);
      expect(result.map((p) => p.id)).toEqual(["a", "b", "c"]);
    });
  });

  describe("does not mutate inputs", () => {
    it("does not mutate the original ports array", () => {
      const ports = [A, B, C];
      const original = [...ports];
      applyPortOrder(ports, ["c", "a", "b"]);
      expect(ports).toEqual(original);
    });

    it("returns a new array instance", () => {
      const ports = [A, B, C];
      const result = applyPortOrder(ports, ["a", "b", "c"]);
      expect(result).not.toBe(ports);
    });
  });

  describe("NaN guard — two or more unlisted ports", () => {
    it("handles multiple unlisted ports without corrupting sort (Infinity - Infinity guard)", () => {
      // All ports are unlisted — sort must not produce NaN comparisons
      const ports = [A, B, C, D];
      const result = applyPortOrder(ports, ["z"]); // z doesn't exist, all 4 are unlisted
      // Original relative order must be preserved
      expect(result.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
    });

    it("preserves original order for all unlisted ports when orderedIds only covers some", () => {
      const ports = [A, B, C, D];
      const result = applyPortOrder(ports, ["b"]);
      expect(result[0].id).toBe("b");
      // The rest — a, c, d — must maintain original relative order
      expect(result.slice(1).map((p) => p.id)).toEqual(["a", "c", "d"]);
    });
  });

  describe("single port", () => {
    it("handles a single port with matching orderedId", () => {
      const result = applyPortOrder([A], ["a"]);
      expect(result.map((p) => p.id)).toEqual(["a"]);
    });

    it("handles a single port not in orderedIds", () => {
      const result = applyPortOrder([A], ["z"]);
      expect(result.map((p) => p.id)).toEqual(["a"]);
    });
  });
});

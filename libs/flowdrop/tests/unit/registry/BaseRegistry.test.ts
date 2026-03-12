import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseRegistry } from "../../../src/lib/registry/BaseRegistry.js";

interface TestItem {
  id: string;
  name: string;
}

/**
 * Concrete test subclass — BaseRegistry doesn't define register(),
 * so we create a simple one for testing.
 */
class TestRegistry extends BaseRegistry<string, TestItem> {
  register(item: TestItem, overwrite = false): void {
    if (this.items.has(item.id) && !overwrite) {
      throw new Error(
        `Key "${item.id}" is already registered. Use overwrite: true to replace it.`,
      );
    }
    this.items.set(item.id, item);
    this.notifyListeners();
  }
}

describe("BaseRegistry", () => {
  let registry: TestRegistry;

  beforeEach(() => {
    registry = new TestRegistry();
  });

  describe("register (via subclass)", () => {
    it("should register an item", () => {
      registry.register({ id: "a", name: "Alpha" });
      expect(registry.get("a")).toEqual({ id: "a", name: "Alpha" });
    });

    it("should throw on duplicate key by default", () => {
      registry.register({ id: "a", name: "Alpha" });
      expect(() => registry.register({ id: "a", name: "Alpha 2" })).toThrow(
        'Key "a" is already registered',
      );
    });

    it("should allow overwrite when flag is true", () => {
      registry.register({ id: "a", name: "Alpha" });
      registry.register({ id: "a", name: "Alpha 2" }, true);
      expect(registry.get("a")?.name).toBe("Alpha 2");
    });

    it("should notify listeners on register", () => {
      const listener = vi.fn();
      registry.subscribe(listener);
      registry.register({ id: "a", name: "Alpha" });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("unregister", () => {
    it("should remove a registered item and return true", () => {
      registry.register({ id: "a", name: "Alpha" });
      expect(registry.unregister("a")).toBe(true);
      expect(registry.has("a")).toBe(false);
    });

    it("should return false for non-existent key", () => {
      expect(registry.unregister("missing")).toBe(false);
    });

    it("should notify listeners on unregister", () => {
      registry.register({ id: "a", name: "Alpha" });
      const listener = vi.fn();
      registry.subscribe(listener);
      registry.unregister("a");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify listeners when key not found", () => {
      const listener = vi.fn();
      registry.subscribe(listener);
      registry.unregister("missing");
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("get / has", () => {
    it("should return undefined for non-existent key", () => {
      expect(registry.get("missing")).toBeUndefined();
    });

    it("should return false for non-existent key", () => {
      expect(registry.has("missing")).toBe(false);
    });

    it("should return the item and true for existing key", () => {
      registry.register({ id: "a", name: "Alpha" });
      expect(registry.get("a")).toEqual({ id: "a", name: "Alpha" });
      expect(registry.has("a")).toBe(true);
    });
  });

  describe("getKeys / getAll", () => {
    it("should return empty arrays for empty registry", () => {
      expect(registry.getKeys()).toEqual([]);
      expect(registry.getAll()).toEqual([]);
    });

    it("should return all keys and values", () => {
      registry.register({ id: "a", name: "Alpha" });
      registry.register({ id: "b", name: "Beta" });
      expect(registry.getKeys()).toEqual(["a", "b"]);
      expect(registry.getAll()).toEqual([
        { id: "a", name: "Alpha" },
        { id: "b", name: "Beta" },
      ]);
    });
  });

  describe("subscribe", () => {
    it("should call listener on changes", () => {
      const listener = vi.fn();
      registry.subscribe(listener);

      registry.register({ id: "a", name: "Alpha" });
      registry.register({ id: "b", name: "Beta" });
      registry.unregister("a");

      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("should stop calling listener after unsubscribe", () => {
      const listener = vi.fn();
      const unsubscribe = registry.subscribe(listener);

      registry.register({ id: "a", name: "Alpha" });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      registry.register({ id: "b", name: "Beta" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should support multiple listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      registry.subscribe(listener1);
      registry.subscribe(listener2);

      registry.register({ id: "a", name: "Alpha" });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("onClear", () => {
    it("should call onClear callbacks when clear() is called", () => {
      const callback = vi.fn();
      registry.onClear(callback);

      registry.register({ id: "a", name: "Alpha" });
      expect(callback).not.toHaveBeenCalled();

      registry.clear();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should stop calling callback after unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = registry.onClear(callback);

      registry.clear();
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      registry.clear();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should call onClear before notifying listeners", () => {
      const order: string[] = [];
      registry.onClear(() => order.push("onClear"));
      registry.subscribe(() => order.push("listener"));

      registry.clear();
      expect(order).toEqual(["onClear", "listener"]);
    });
  });

  describe("clear", () => {
    it("should remove all items", () => {
      registry.register({ id: "a", name: "Alpha" });
      registry.register({ id: "b", name: "Beta" });
      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });

    it("should notify listeners on clear", () => {
      const listener = vi.fn();
      registry.subscribe(listener);
      registry.clear();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("size", () => {
    it("should return 0 for empty registry", () => {
      expect(registry.size).toBe(0);
    });

    it("should track the number of items", () => {
      registry.register({ id: "a", name: "Alpha" });
      expect(registry.size).toBe(1);
      registry.register({ id: "b", name: "Beta" });
      expect(registry.size).toBe(2);
      registry.unregister("a");
      expect(registry.size).toBe(1);
    });
  });
});

import { describe, test, expect } from "bun:test";
import { ParamsBuilder } from "../../../src/sdk/builders/params-builder";

describe("ParamsBuilder", () => {
  describe("set", () => {
    test("should set a string parameter", () => {
      const builder = new ParamsBuilder();
      const result = builder.set("message", "Hello world").build();
      
      expect(result).toEqual({ message: "Hello world" });
    });

    test("should set a number parameter", () => {
      const builder = new ParamsBuilder();
      const result = builder.set("count", 42).build();
      
      expect(result).toEqual({ count: 42 });
    });

    test("should set a boolean parameter", () => {
      const builder = new ParamsBuilder();
      const result = builder.set("enabled", true).build();
      
      expect(result).toEqual({ enabled: true });
    });

    test("should set multiple parameters via chaining", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .set("name", "test")
        .set("value", 100)
        .set("active", false)
        .build();
      
      expect(result).toEqual({
        name: "test",
        value: 100,
        active: false
      });
    });

    test("should overwrite existing parameter", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .set("key", "first")
        .set("key", "second")
        .build();
      
      expect(result).toEqual({ key: "second" });
    });

    test("should set null value", () => {
      const builder = new ParamsBuilder();
      const result = builder.set("empty", null).build();
      
      expect(result).toEqual({ empty: null });
    });

    test("should set array value", () => {
      const builder = new ParamsBuilder();
      const result = builder.set("items", [1, 2, 3]).build();
      
      expect(result).toEqual({ items: [1, 2, 3] });
    });

    test("should set nested object value", () => {
      const builder = new ParamsBuilder();
      const nested = { a: 1, b: 2 };
      const result = builder.set("data", nested).build();
      
      expect(result).toEqual({ data: nested });
    });
  });

  describe("setAll", () => {
    test("should set multiple parameters at once", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .setAll({ a: 1, b: 2, c: 3 })
        .build();
      
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    test("should merge with existing parameters", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .set("existing", "value")
        .setAll({ new1: "a", new2: "b" })
        .build();
      
      expect(result).toEqual({
        existing: "value",
        new1: "a",
        new2: "b"
      });
    });

    test("should overwrite existing parameters with setAll", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .set("key", "old")
        .setAll({ key: "new", other: "value" })
        .build();
      
      expect(result).toEqual({ key: "new", other: "value" });
    });

    test("should handle empty object", () => {
      const builder = new ParamsBuilder();
      const result = builder.set("keep", "me").setAll({}).build();
      
      expect(result).toEqual({ keep: "me" });
    });
  });

  describe("setNested", () => {
    test("should set simple nested parameter", () => {
      const builder = new ParamsBuilder();
      const result = builder.setNested("user.name", "John").build();
      
      expect(result).toEqual({ user: { name: "John" } });
    });

    test("should set deeply nested parameter", () => {
      const builder = new ParamsBuilder();
      const result = builder.setNested("a.b.c.d", "deep").build();
      
      expect(result).toEqual({ a: { b: { c: { d: "deep" } } } });
    });

    test("should merge with existing nested structure", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .setNested("user.name", "John")
        .setNested("user.age", 30)
        .build();
      
      expect(result).toEqual({ user: { name: "John", age: 30 } });
    });

    test("should handle overwriting nested value", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .setNested("data.value", "first")
        .setNested("data.value", "second")
        .build();
      
      expect(result).toEqual({ data: { value: "second" } });
    });

    test("should treat numeric keys as strings (not array indices)", () => {
      // The setNested method treats all keys as strings, not array indices
      const builder = new ParamsBuilder();
      const result = builder.setNested("items.0", "first").build();
      
      expect(result).toEqual({ items: { "0": "first" } });
    });

    test("should handle dot in key name", () => {
      const builder = new ParamsBuilder();
      const result = builder.setNested("config.key", "value").build();
      
      expect(result).toEqual({ config: { key: "value" } });
    });
  });

  describe("addItem", () => {
    test("should add item to new array", () => {
      const builder = new ParamsBuilder();
      const result = builder.addItem("items", "apple").build();
      
      expect(result).toEqual({ items: ["apple"] });
    });

    test("should add multiple items to array", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .addItem("items", "apple")
        .addItem("items", "banana")
        .addItem("items", "cherry")
        .build();
      
      expect(result).toEqual({ items: ["apple", "banana", "cherry"] });
    });

    test("should initialize array if not exists", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .set("tags", ["initial"])
        .addItem("tags", "new")
        .build();
      
      expect(result).toEqual({ tags: ["initial", "new"] });
    });

    test("should add various types to array", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .addItem("mixed", 1)
        .addItem("mixed", "two")
        .addItem("mixed", true)
        .build();
      
      expect(result).toEqual({ mixed: [1, "two", true] });
    });

    test("should add object to array", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .addItem("users", { name: "John" })
        .addItem("users", { name: "Jane" })
        .build();
      
      expect(result).toEqual({ users: [{ name: "John" }, { name: "Jane" }] });
    });
  });

  describe("remove", () => {
    test("should remove existing parameter", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .set("keep", "value")
        .set("remove", "to delete")
        .remove("remove")
        .build();
      
      expect(result).toEqual({ keep: "value" });
    });

    test("should handle removing non-existent parameter", () => {
      const builder = new ParamsBuilder();
      const result = builder
        .set("keep", "value")
        .remove("nonexistent")
        .build();
      
      expect(result).toEqual({ keep: "value" });
    });

    test("should remove from empty builder", () => {
      const builder = new ParamsBuilder();
      const result = builder.remove("anything").build();
      
      expect(result).toEqual({});
    });
  });

  describe("has", () => {
    test("should return true for existing parameter", () => {
      const builder = new ParamsBuilder();
      builder.set("exists", "value");
      
      expect(builder.has("exists")).toBe(true);
    });

    test("should return false for non-existent parameter", () => {
      const builder = new ParamsBuilder();
      builder.set("exists", "value");
      
      expect(builder.has("nonexistent")).toBe(false);
    });

    test("should return false for removed parameter", () => {
      const builder = new ParamsBuilder();
      builder.set("key", "value").remove("key");
      
      expect(builder.has("key")).toBe(false);
    });

    test("should return false on empty builder", () => {
      const builder = new ParamsBuilder();
      
      expect(builder.has("key")).toBe(false);
    });
  });

  describe("get", () => {
    test("should get existing parameter", () => {
      const builder = new ParamsBuilder();
      builder.set("key", "value");
      
      expect(builder.get("key")).toBe("value");
    });

    test("should return undefined for non-existent parameter", () => {
      const builder = new ParamsBuilder();
      
      expect(builder.get("nonexistent")).toBeUndefined();
    });

    test("should get various types", () => {
      const builder = new ParamsBuilder();
      builder
        .set("num", 42)
        .set("bool", true)
        .set("arr", [1, 2])
        .set("obj", { a: 1 });
      
      expect(builder.get("num")).toBe(42);
      expect(builder.get("bool")).toBe(true);
      expect(builder.get("arr")).toEqual([1, 2]);
      expect(builder.get("obj")).toEqual({ a: 1 });
    });

    test("should return undefined for removed parameter", () => {
      const builder = new ParamsBuilder();
      builder.set("key", "value").remove("key");
      
      expect(builder.get("key")).toBeUndefined();
    });
  });

  describe("build", () => {
    test("should return copy of params", () => {
      const builder = new ParamsBuilder();
      builder.set("key", "value");
      const result = builder.build();
      
      // Modify returned object should not affect builder
      result.modified = true;
      const result2 = builder.build();
      
      expect(result2).not.toHaveProperty("modified");
      expect(result2).toEqual({ key: "value" });
    });

    test("should return empty object for empty builder", () => {
      const builder = new ParamsBuilder();
      const result = builder.build();
      
      expect(result).toEqual({});
    });
  });

  describe("getRaw", () => {
    test("should return reference to internal params", () => {
      const builder = new ParamsBuilder();
      builder.set("key", "value");
      const result = builder.getRaw();
      
      // Should be the same reference
      expect(result).toBe(builder.getRaw());
      
      // Modifying should affect internal state
      result.newKey = "newValue";
      expect(builder.getRaw()).toHaveProperty("newKey");
    });
  });

  describe("complex scenarios", () => {
    test("should build complex params object", () => {
      const nestedBuilder = new ParamsBuilder()
        .set("city", "NYC")
        .set("zip", "10001");
      
      const result = new ParamsBuilder()
        .set("user", "john")
        .set("count", 5)
        .setNested("address.street", "123 Main St")
        .setAll(nestedBuilder.getRaw())
        .addItem("tags", "vip")
        .addItem("tags", "active")
        .build();
      
      expect(result).toEqual({
        user: "john",
        count: 5,
        address: { street: "123 Main St" },
        city: "NYC",
        zip: "10001",
        tags: ["vip", "active"]
      });
    });

    test("should handle building from scratch with all methods", () => {
      const result = new ParamsBuilder()
        .set("id", 1)
        .setAll({ type: "test" })
        .setNested("metadata.created.by", "system")
        .addItem("flags", "initialized")
        .set("active", true)
        .remove("flags")
        .addItem("flags", "ready")
        .build();
      
      expect(result).toEqual({
        id: 1,
        type: "test",
        metadata: { created: { by: "system" } },
        flags: ["ready"],
        active: true
      });
    });
  });
});

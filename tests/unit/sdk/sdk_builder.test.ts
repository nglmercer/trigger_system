import { describe, test, expect, beforeEach } from "bun:test";
import { ConditionBuilder, ActionBuilder, RuleBuilder } from "../../../src/sdk/builder";
import { RuleExporter } from "../../../src/sdk/exporter";

describe("SDK Builder Tests", () => {
  describe("ConditionBuilder", () => {
    test("should create a simple condition", () => {
      const builder = new ConditionBuilder();
      const condition = builder
        .where("data.user", "EQ", "admin")
        .build();
      
      expect(condition).toEqual({
        field: "data.user",
        operator: "EQ",
        value: "admin"
      });
    });

    test("should create an AND group with multiple conditions", () => {
      const builder = new ConditionBuilder("AND");
      const condition = builder
        .where("data.role", "EQ", "admin")
        .where("data.active", "EQ", true)
        .build();
      
      expect(condition).toEqual({
        operator: "AND",
        conditions: [
          { field: "data.role", operator: "EQ", value: "admin" },
          { field: "data.active", operator: "EQ", value: true }
        ]
      });
    });

    test("should create an OR group", () => {
      const builder = new ConditionBuilder("OR");
      const condition = builder
        .where("data.status", "EQ", "pending")
        .where("data.status", "EQ", "processing")
        .build();
      
      expect(condition).toEqual({
        operator: "OR",
        conditions: [
          { field: "data.status", operator: "EQ", value: "pending" },
          { field: "data.status", operator: "EQ", value: "processing" }
        ]
      });
    });

    test("should throw error when no conditions added", () => {
      const builder = new ConditionBuilder();
      expect(() => builder.build()).toThrow("Condition group must have at least one condition");
    });

    test("should support nested conditions with and()", () => {
      const condition = new ConditionBuilder("AND")
        .where("data.level", "GTE", 5)
        .and((b) => b.where("data.hasBadge", "EQ", true))
        .build();
      
      // The inner builder has only one condition with AND default, so it returns just the condition
      expect(condition).toEqual({
        operator: "AND",
        conditions: [
          { field: "data.level", operator: "GTE", value: 5 },
          { field: "data.hasBadge", operator: "EQ", value: true }
        ]
      });
    });

    test("should support nested conditions with or()", () => {
      const condition = new ConditionBuilder("AND")
        .where("data.type", "EQ", "premium")
        .or((b) => b.where("data.points", "GTE", 1000))
        .build();
      
      expect(condition).toEqual({
        operator: "AND",
        conditions: [
          { field: "data.type", operator: "EQ", value: "premium" },
          {
            operator: "OR",
            conditions: [
              { field: "data.points", operator: "GTE", value: 1000 }
            ]
          }
        ]
      });
    });
  });

  describe("ActionBuilder", () => {
    test("should create a single action", () => {
      const builder = new ActionBuilder();
      const action = builder
        .add("LOG", { message: "Hello" })
        .build();
      
      expect(action).toEqual({
        type: "LOG",
        params: { message: "Hello" }
      });
    });

    test("should create action array in ALL mode", () => {
      const builder = new ActionBuilder();
      const action = builder
        .setMode("ALL")
        .add("LOG", { message: "First" })
        .add("LOG", { message: "Second" })
        .build();
      
      expect(action).toEqual([
        { type: "LOG", params: { message: "First" } },
        { type: "LOG", params: { message: "Second" } }
      ]);
    });

    test("should create action group with mode", () => {
      const builder = new ActionBuilder();
      const action = builder
        .setMode("SEQUENCE")
        .add("STATE_SET", { key: "step1", value: true })
        .add("STATE_SET", { key: "step2", value: true })
        .build();
      
      expect(action).toEqual({
        mode: "SEQUENCE",
        actions: [
          { type: "STATE_SET", params: { key: "step1", value: true } },
          { type: "STATE_SET", params: { key: "step2", value: true } }
        ]
      });
    });

    test("should support delay and probability options", () => {
      const builder = new ActionBuilder();
      const action = builder
        .add("LOG", { message: "Delayed" }, { delay: 1000, probability: 0.5 })
        .build();
      
      expect(action).toEqual({
        type: "LOG",
        params: { message: "Delayed" },
        delay: 1000,
        probability: 0.5
      });
    });

    test("should throw error when no actions added", () => {
      const builder = new ActionBuilder();
      expect(() => builder.build()).toThrow("Action group must have at least one action");
    });
  });

  describe("RuleBuilder", () => {
    test("should build a basic rule", () => {
      const rule = new RuleBuilder()
        .withId("my-rule")
        .on("USER_LOGIN")
        .if("data.role", "EQ", "admin")
        .do("LOG", { message: "Admin logged in" })
        .build();
      
      expect(rule.id).toBe("my-rule");
      expect(rule.on).toBe("USER_LOGIN");
      expect(rule.if).toEqual({ field: "data.role", operator: "EQ", value: "admin" });
      expect(rule.do).toEqual({ type: "LOG", params: { message: "Admin logged in" } });
      expect(rule.enabled).toBe(true);
      expect(rule.priority).toBe(0);
    });

    test("should add multiple if conditions", () => {
      const rule = new RuleBuilder()
        .withId("multi-condition")
        .on("TEST")
        .if("data.a", "EQ", 1)
        .if("data.b", "EQ", 2)
        .do("LOG", { message: "test" })
        .build();
      
      expect(rule.if).toEqual([
        { field: "data.a", operator: "EQ", value: 1 },
        { field: "data.b", operator: "EQ", value: 2 }
      ]);
    });

    test("should add multiple do actions", () => {
      const rule = new RuleBuilder()
        .withId("multi-action")
        .on("TEST")
        .do("STATE_SET", { key: "a", value: 1 })
        .do("STATE_SET", { key: "b", value: 2 })
        .build();
      
      expect(rule.do).toEqual([
        { type: "STATE_SET", params: { key: "a", value: 1 } },
        { type: "STATE_SET", params: { key: "b", value: 2 } }
      ]);
    });

    test("should build complex conditions using ConditionBuilder", () => {
      const rule = new RuleBuilder()
        .withId("complex")
        .on("TEST")
        .ifComplex((b) => b
          .where("data.score", "GTE", 80)
          .and((sub) => sub.where("data.passed", "EQ", true))
        )
        .do("LOG", { message: "Passed" })
        .build();
      
      // The and() creates a single condition group which is simplified
      expect(rule.if).toEqual({
        operator: "AND",
        conditions: [
          { field: "data.score", operator: "GTE", value: 80 },
          { field: "data.passed", operator: "EQ", value: true }
        ]
      });
    });

    test("should build complex actions using ActionBuilder", () => {
      const rule = new RuleBuilder()
        .withId("complex-action")
        .on("TEST")
        .doComplex((b) => b
          .setMode("SEQUENCE")
          .add("STATE_SET", { key: "step1", value: true })
          .add("LOG", { message: "Step 1 done" })
        )
        .build();
      
      expect(rule.do).toEqual({
        mode: "SEQUENCE",
        actions: [
          { type: "STATE_SET", params: { key: "step1", value: true } },
          { type: "LOG", params: { message: "Step 1 done" } }
        ]
      });
    });

    test("should add metadata properties", () => {
      const rule = new RuleBuilder()
        .withId("meta")
        .withName("Meta Rule")
        .withDescription("A test rule")
        .withPriority(10)
        .withCooldown(5000)
        .withTags(["test", "example"])
        .on("TEST")
        .do("LOG", { message: "test" })
        .build();
      
      expect(rule.name).toBe("Meta Rule");
      expect(rule.description).toBe("A test rule");
      expect(rule.priority).toBe(10);
      expect(rule.cooldown).toBe(5000);
      expect(rule.tags).toEqual(["test", "example"]);
    });

    test("should throw error when id is missing", () => {
      const builder = new RuleBuilder()
        .on("TEST")
        .do("LOG", { message: "test" });
      
      expect(() => builder.build()).toThrow("Rule ID is required");
    });

    test("should throw error when event is missing", () => {
      const builder = new RuleBuilder()
        .withId("test")
        .do("LOG", { message: "test" });
      
      expect(() => builder.build()).toThrow("Rule 'on' event is required");
    });

    test("should throw error when action is missing", () => {
      const builder = new RuleBuilder()
        .withId("test")
        .on("TEST");
      
      expect(() => builder.build()).toThrow("Rule 'do' action is required");
    });
  });
});

describe("SDK Exporter Tests", () => {
  describe("RuleExporter.toYaml", () => {
    test("should export a single rule to YAML", () => {
      const rule = new RuleBuilder()
        .withId("export-test")
        .on("TEST")
        .do("LOG", { message: "Hello" })
        .build();
      
      const yaml = RuleExporter.toYaml(rule);
      
      expect(yaml).toContain("id: export-test");
      expect(yaml).toContain("on: TEST");
      expect(yaml).toContain("type: LOG");
    });

    test("should export array of rules to YAML", () => {
      const rules = [
        new RuleBuilder()
          .withId("rule1")
          .on("TEST1")
          .do("LOG", { message: "Rule 1" })
          .build(),
        new RuleBuilder()
          .withId("rule2")
          .on("TEST2")
          .do("LOG", { message: "Rule 2" })
          .build()
      ];
      
      const yaml = RuleExporter.toYaml(rules);
      
      expect(yaml).toContain("id: rule1");
      expect(yaml).toContain("id: rule2");
    });
  });

  describe("RuleExporter.saveToFile", () => {
    test("should save rule to file", async () => {
      const rule = new RuleBuilder()
        .withId("file-test")
        .on("TEST")
        .do("LOG", { message: "File test" })
        .build();
      
      const testPath = "/tmp/test-rule-export.yaml";
      await RuleExporter.saveToFile(rule, testPath);
      
      // Read the file and verify content
      const fs = await import("fs");
      const content = fs.readFileSync(testPath, "utf8");
      expect(content).toContain("id: file-test");
      
      // Cleanup
      fs.unlinkSync(testPath);
    });

    test("should create directory if not exists", async () => {
      const rule = new RuleBuilder()
        .withId("dir-test")
        .on("TEST")
        .do("LOG", { message: "Dir test" })
        .build();
      
      const testPath = "/tmp/nested/test-rule-export.yaml";
      await RuleExporter.saveToFile(rule, testPath);
      
      // Read the file and verify content
      const fs = await import("fs");
      const content = fs.readFileSync(testPath, "utf8");
      expect(content).toContain("id: dir-test");
      
      // Cleanup
      fs.unlinkSync(testPath);
      fs.rmdirSync("/tmp/nested");
    });
  });
});

import { expect, test, describe } from "bun:test";
import { RuleBuilder, ConditionBuilder, ActionBuilder } from "./builder";
import { RuleExporter } from "./exporter";

describe("RuleBuilder SDK", () => {
  test("should create a basic rule with correct key order", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .withId("rule-xn7i5")
      .withName("New Rule")
      .on("123")
      .ifComplex(c => c.where("data", "EQ", "100"))
      .do("data", {})
      .build();

    const yaml = RuleExporter.toCleanYaml(rule);
    
    // Check key order in YAML string
    const lines = yaml.split("\n");
    expect(lines[1]).toContain("id: rule-xn7i5");
    expect(lines[2]).toContain("name: New Rule");
    expect(lines[3]).toContain("on: \"123\"");
    expect(lines[4]).toContain("if:");
    expect(lines[8]).toContain("do:");
  });

  test("should handle nested condition groups", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .withId("test-nested")
      .on("event")
      .ifComplex(c => 
        c.where("a", "EQ", 1)
         .or(sub => sub.where("b", "GT", 10).where("c", "LT", 5))
      )
      .do("action", {})
      .build();

    expect(rule.if).toBeDefined();
    const ifNode = rule.if as any;
    expect(ifNode.operator).toBe("AND");
    expect(ifNode.conditions).toHaveLength(2);
    expect(ifNode.conditions[1].operator).toBe("OR");
  });

  test("should handle action groups with modes", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .withId("test-actions")
      .on("event")
      .doComplex(a => 
        a.setMode("EITHER")
         .add("log", { msg: "high" }, { probability: 0.8 })
         .add("log", { msg: "low" }, { probability: 0.2 })
      )
      .build();

    expect(rule.do).toBeDefined();
    const doNode = rule.do as any;
    expect(doNode.mode).toBe("EITHER");
    expect(doNode.actions).toHaveLength(2);
  });
});

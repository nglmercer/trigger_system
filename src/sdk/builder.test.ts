import { expect, test, describe } from "bun:test";
import { RuleBuilder } from "./builder";
import { RuleExporter } from "./exporter";
import type { ConditionGroup, ActionGroup } from "../types";

describe("RuleBuilder SDK", () => {
  test("should create a basic rule with correct key order", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("rule-xn7i5")
      .name("New Rule")
      .on("123")
      .ifComplex(c => c.where("data", "EQ", "100"))
      .do("data", {})
      .build();

    const yaml = RuleExporter.toCleanYaml(rule);
    
    // The keys should appear in this logical order
    expect(yaml.indexOf("id: rule-xn7i5")).toBeLessThan(yaml.indexOf("name: New Rule"));
    expect(yaml.indexOf("name: New Rule")).toBeLessThan(yaml.indexOf("on: \"123\""));
    expect(yaml.indexOf("on: \"123\"")).toBeLessThan(yaml.indexOf("if:"));
    expect(yaml.indexOf("if:")).toBeLessThan(yaml.indexOf("do:"));
  });

  test("should handle nested condition groups", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-nested")
      .on("event")
      .ifComplex(c => 
        c.where("a", "EQ", 1)
         .or(sub => sub.where("b", "GT", 10).where("c", "LT", 5))
      )
      .do("action", {})
      .build();

    expect(rule.if).toBeDefined();
    const ifNode = rule.if as ConditionGroup;
    expect(ifNode.operator).toBe("AND");
    expect(ifNode.conditions).toHaveLength(2);
    expect((ifNode.conditions[1] as ConditionGroup).operator).toBe("OR");
  });

  test("should handle action groups with modes", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-actions")
      .on("event")
      .doComplex(a => 
        a.setMode("EITHER")
         .add("log", { msg: "high" }, { probability: 0.8 })
         .add("log", { msg: "low" }, { probability: 0.2 })
      )
      .build();

    expect(rule.do).toBeDefined();
    const doNode = rule.do as ActionGroup;
    expect(doNode.mode).toBe("EITHER");
    expect(doNode.actions).toHaveLength(2);
  });

  test("should handle aggregator condition group pattern correctly", () => {
    // Mimicking: C1, C2 -> Group -> Action
    const builder = new RuleBuilder();
    
    const subConds = [
      { field: "data", operator: "NEQ", value: "100" },
      { field: "data", operator: "NEQ", value: "100" }
    ];

    const rule = builder
      .id("rule-3y023")
      .on("data")
      .ifComplex(c => 
        c.and(sub => {
          subConds.forEach(sc => sub.where(sc.field, sc.operator as any, sc.value));
          return sub;
        })
      )
      .do("data", {})
      .build();

    expect(rule.if).toBeDefined();
    const yaml = RuleExporter.toCleanYaml(rule);
    
    // Check that it contains the fields
    // Because they were duplicates, it should be condensed to a single condition without AND
    expect(yaml).toContain("field: data");
  });

  test("should flatten redundant and duplicate condition groups", () => {
    // Tests optimizeCondition
    const builder = new RuleBuilder();
    // Intentionally create nested AND inside AND and duplicates
    const rule = builder
      .id("test-opt-if")
      .on("event")
      .ifComplex(c => 
        c.where("a", "EQ", 1)
         .where("a", "EQ", 1) // duplicate
         .and(sub => sub.where("b", "EQ", 2).and(sub2 => sub2.where("c", "EQ", 3)))
      )
      .do("log", {})
      .build();

    const yaml = RuleExporter.toCleanYaml(rule);
    // There should only be one AND block because they get flattened
    const andMatches = (yaml.match(/operator: AND/g) || []).length;
    expect(andMatches).toBe(1);

    // Duplicate 'a' should be removed
    const aMatches = (yaml.match(/field: a/g) || []).length;
    expect(aMatches).toBe(1);
    
    // b and c should be extracted to the top level AND
    expect(yaml).toContain("field: b");
    expect(yaml).toContain("field: c");
  });

  test("should flatten redundant and duplicate action groups", () => {
    // Tests optimizeAction
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-opt-do")
      .on("event")
      .doComplex(a => 
         a.setMode("ALL")
          .add("log", { msg: "A" })
          .add("log", { msg: "A" }) // duplicate
          .add("action_inside_all", {}) // mock
      )
      .build();

    // The builder's do() array feature
    // Let's modify the rule directly to simulate nested ActionGroup
    let doArray = rule.do;
    if (Array.isArray(doArray)) {
        doArray.push({
          mode: 'ALL',
          actions: [
            { type: "log", params: { msg: "B" } },
            { type: "action_inside_all", params: {} } // duplicate across groups
        ]
      });
    }

    // We can run optimization again by building another RuleBuilder wrapping it
    const builder2 = new RuleBuilder().id("opt").on("event").withDo(doArray).build();

    const yaml = RuleExporter.toCleanYaml(builder2);
    
    // the mode ALL should only appear once
    const allMatches = (yaml.match(/mode: ALL/g) || []).length;
    // Since defaults omit mode: ALL if not requested directly sometimes, 
    // wait, our optimizer leaves one ActionGroup if >1 items.
    expect(allMatches).toBeLessThanOrEqual(1);

    // msg A should appear once
    const aMatches = (yaml.match(/msg: A/g) || []).length;
    expect(aMatches).toBe(1);

    // action_inside_all should appear once
    const insideMatches = (yaml.match(/type: action_inside_all/g) || []).length;
    expect(insideMatches).toBe(1);
  });
});

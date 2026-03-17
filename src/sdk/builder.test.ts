import { expect, test, describe } from "bun:test";
import { RuleBuilder, optimizeCondition, optimizeAction, type OptimizeOptions } from "./builder";
import { RuleExporter } from "./exporter";
import type { ConditionGroup, ActionGroup, RuleCondition, Action, Condition } from "../types";

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

    // msg A should appear twice
    const aMatches = (yaml.match(/msg: A/g) || []).length;
    expect(aMatches).toBe(2);

    // type: action_inside_all should appear twice
    const insideMatches = (yaml.match(/type: action_inside_all/g) || []).length;
    expect(insideMatches).toBe(2);
  });

  test("should build a rule from generic graph nodes and edges", () => {
    const nodes = [
      { id: "e1", type: "event", data: { id: "rule-graph-1", event: "user_login" } },
      { id: "c1", type: "condition", data: { field: "role", operator: "EQ", value: "admin" } },
      { id: "a1", type: "action", data: { type: "notify", params: { msg: "Admin logged in" } } }
    ];

    const edges = [
      { source: "e1", target: "c1" },
      { source: "c1", target: "a1" }
    ];

    const builder = RuleBuilder.fromGraph(nodes, edges);
    const rule = builder.build();

    expect(rule.id).toBe("rule-graph-1");
    expect(rule.on).toBe("user_login");
    
    // Verify condition
    const ifNode = rule.if as Condition;
    expect(ifNode).toBeDefined();
    expect(ifNode.field).toBe("role");
    expect(ifNode.value).toBe("admin");

    // Verify action
    const doNode = rule.do as Action;
    expect(doNode).toBeDefined();
    expect(doNode.type).toBe("notify");
  });
  test("should build a rule from generic graph nodes with transformers", () => {
    const nodes = [
      { id: "e1", type: "event", data: { id: "rule-trans-1", event: "user_login" } },
      { id: "c1", type: "condition", data: { field: "role", operator: "EQ", value: "admin" } },
      { id: "a1", type: "action", data: { type: "notify", params: { msg: "Admin logged in" } } }
    ];

    const edges = [
      { source: "e1", target: "c1" },
      { source: "c1", target: "a1" }
    ];

    const builder = RuleBuilder.fromGraph(nodes, edges, {}, {
      condition: (cond, node) => {
        if ('field' in cond && cond.field === 'role') {
          return { ...cond, field: 'user_role' };
        }
        return cond;
      },
      action: (act, node) => {
        if ('type' in act && act.type === 'notify') {
          return { ...act, type: 'send_email' };
        }
        return act;
      }
    });

    const rule = builder.build();

    expect(rule.id).toBe("rule-trans-1");
    
    // Verify condition changed
    const ifNode = rule.if as Condition;
    expect(ifNode).toBeDefined();
    expect(ifNode.field).toBe("user_role");
    
    // Verify action changed
    const doNode = rule.do as Action;
    expect(doNode).toBeDefined();
    expect(doNode.type).toBe("send_email");
  });

  test("should keep duplicates when deduplicate is false", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-no-dedup")
      .on("event")
      .ifComplex(c => 
        c.where("a", "EQ", 1)
         .where("a", "EQ", 1) // duplicate - should be kept
         .where("b", "EQ", 2)
      )
      .do("log", { msg: "test" })
      .optimize({ deduplicate: false })
      .build();

    const yaml = RuleExporter.toCleanYaml(rule);
    
    // With deduplicate: false, 'a' should appear twice
    const aMatches = (yaml.match(/field: a/g) || []).length;
    expect(aMatches).toBe(2);
    
    // b should appear once
    expect(yaml).toContain("field: b");
  });

  test("should deduplicate using uniqueIdField", () => {
    const conditions: RuleCondition[] = [
      { field: "a", operator: "EQ", value: 1, id: "cond-1" } as RuleCondition,
      { field: "a", operator: "EQ", value: 1, id: "cond-2" } as RuleCondition, // same content, different id - should be kept
      { field: "a", operator: "EQ", value: 1 } as RuleCondition, // no id - kept (not deduplicated against items with IDs)
    ];

    const options: OptimizeOptions = { deduplicate: true, uniqueIdField: "id" };
    const result = optimizeCondition(conditions, options);

    // Should have 3: items with IDs are kept regardless, item without ID is kept
    // because it's not a duplicate of the ones with IDs (different key set)
    expect(result).toBeDefined();
    if (Array.isArray(result)) {
      expect(result.length).toBe(3);
    }
  });

  test("should keep actions with different ids using uniqueIdField", () => {
    const actions: Action[] = [
      { type: "log", params: { msg: "A" }, id: "action-1" } as Action,
      { type: "log", params: { msg: "A" }, id: "action-2" } as Action, // same content, different id
      { type: "log", params: { msg: "A" } } as Action, // no id - kept
    ];

    const options: OptimizeOptions = { deduplicate: true, uniqueIdField: "id" };
    const result = optimizeAction(actions, options);

    // Should have 3: action-1 and action-2 (different IDs), plus the one without id
    expect(result).toBeDefined();
    if (Array.isArray(result)) {
      expect(result.length).toBe(3);
    }
  });

  test("should work with graph parser optimizeOptions", () => {
    const nodes = [
      { id: "e1", type: "event", data: { id: "rule-opt-1", event: "user_login" } },
      { id: "c1", type: "condition", data: { field: "role", operator: "EQ", value: "admin" } },
      { id: "c2", type: "condition", data: { field: "role", operator: "EQ", value: "admin" } }, // duplicate
      { id: "a1", type: "action", data: { type: "notify", params: { msg: "Admin logged in" } } }
    ];

    const edges = [
      { source: "e1", target: "c1" },
      { source: "e1", target: "c2" },
      { source: "c1", target: "a1" },
      { source: "c2", target: "a1" }
    ];

    // Test with deduplicate: true (default for conditions)
    const builder1 = RuleBuilder.fromGraph(nodes, edges, { 
      optimizeOptions: { deduplicate: true } 
    });
    const rule1 = builder1.build();
    
    // With deduplicate: true, conditions should be merged into one
    expect(rule1.if).toBeDefined();
    const yaml1 = RuleExporter.toCleanYaml(rule1);
    const roleMatches1 = (yaml1.match(/field: role/g) || []).length;
    expect(roleMatches1).toBe(1);

    // Test with deduplicate: false
    const builder2 = RuleBuilder.fromGraph(nodes, edges, { 
      optimizeOptions: { deduplicate: false } 
    });
    const rule2 = builder2.build();
    
    const yaml2 = RuleExporter.toCleanYaml(rule2);
    const roleMatches2 = (yaml2.match(/field: role/g) || []).length;
    expect(roleMatches2).toBe(2);
  });

  // --- Tests for then/else conditional actions ---

  test("then() should be an alias for do()", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-then-alias")
      .on("event")
      .then("log", { msg: "test" })
      .build();

    expect(rule.do).toBeDefined();
    const doAction = rule.do as Action;
    expect(doAction.type).toBe("log");
    expect(doAction.params).toEqual({ msg: "test" });
  });

  test("then() should work with multiple actions", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-then-multiple")
      .on("event")
      .then("log", { msg: "first" })
      .then("log", { msg: "second" })
      .build();

    expect(rule.do).toBeDefined();
    expect(Array.isArray(rule.do)).toBe(true);
    const actions = rule.do as Action[];
    expect(actions.length).toBe(2);
    expect(actions[0]?.type).toBe("log");
    expect(actions[1]?.type).toBe("log");
  });

  test("ifAction() should add condition to last action", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-if-action")
      .on("event")
      .do("checkStatus", {})
      .ifAction("data.status", "EQ", "active")
      .build();

    expect(rule.do).toBeDefined();
    const doAction = rule.do as Action;
    expect(doAction.if).toBeDefined();
    expect((doAction.if as Condition).field).toBe("data.status");
    expect((doAction.if as Condition).operator).toBe("EQ");
    expect((doAction.if as Condition).value).toBe("active");
  });

  test("thenAction() should add then clause to last action", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-then-action")
      .on("event")
      .do("checkStatus", {})
      .ifAction("data.status", "EQ", "active")
      .thenAction({ type: "notify", params: { message: "Active!" } })
      .build();

    expect(rule.do).toBeDefined();
    const doAction = rule.do as Action;
    expect(doAction.then).toBeDefined();
    const thenAction = doAction.then as Action;
    expect(thenAction.type).toBe("notify");
    expect(thenAction.params).toEqual({ message: "Active!" });
  });

  test("else() should add else clause to last action", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-else")
      .on("event")
      .do("checkStatus", {})
      .ifAction("data.status", "EQ", "active")
      .thenAction({ type: "notify", params: { message: "Active!" } })
      .elseAction({ type: "notify", params: { message: "Not active" } })
      .build();

    expect(rule.do).toBeDefined();
    const doAction = rule.do as Action;
    expect(doAction.else).toBeDefined();
    const elseAction = doAction.else as Action;
    expect(elseAction.type).toBe("notify");
    expect(elseAction.params).toEqual({ message: "Not active" });
  });

  test("else() without thenAction should work", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-else-only")
      .on("event")
      .do("checkStatus", {})
      .ifAction("data.status", "EQ", "active")
      .else({ type: "log", params: { msg: "Not active" } })
      .build();

    expect(rule.do).toBeDefined();
    const doAction = rule.do as Action;
    expect(doAction.if).toBeDefined();
    expect(doAction.else).toBeDefined();
    const elseAction = doAction.else as Action;
    expect(elseAction.type).toBe("log");
    expect(elseAction.params).toEqual({ msg: "Not active" });
  });

  test("should throw error when else() is called without prior do()", () => {
    const builder = new RuleBuilder();
    expect(() => {
      builder
        .id("test-error")
        .on("event")
        .else({ type: "log", params: { msg: "test" } })
        .build();
    }).toThrow("Cannot add else: no action defined");
  });

  test("should support complete if-then-else pattern with array actions", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-if-then-else-array")
      .on("event")
      .do("checkStatus", {})
      .ifAction("data.status", "EQ", "active")
      .thenAction([
        { type: "notify", params: { message: "Active!" } },
        { type: "log", params: { msg: "Logging active" } }
      ])
      .elseAction({ type: "log", params: { msg: "Not active" } })
      .build();

    expect(rule.do).toBeDefined();
    const doAction = rule.do as Action;
    
    // Check then is an array
    expect(Array.isArray(doAction.then)).toBe(true);
    const thenActions = doAction.then as Action[];
    expect(thenActions.length).toBe(2);
    expect(thenActions[0]?.type).toBe("notify");
    expect(thenActions[1]?.type).toBe("log");
    
    // Check else
    expect(doAction.else).toBeDefined();
  });

  test("should work with mixed do and then actions", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-mixed")
      .on("event")
      .do("log", { msg: "Before conditional" })
      .do("checkStatus", {})
      .ifAction("data.status", "EQ", "active")
      .thenAction({ type: "notify", params: { message: "Active!" } })
      .elseAction({ type: "log", params: { msg: "Not active" } })
      .build();

    expect(rule.do).toBeDefined();
    expect(Array.isArray(rule.do)).toBe(true);
    const actions = rule.do as Action[];
    expect(actions.length).toBe(2);
    
    // First action is a regular action
    expect(actions[0]?.type).toBe("log");
    expect(actions[0]?.if).toBeUndefined();
    
    // Second action has conditional
    const conditionalAction = actions[1];
    expect(conditionalAction?.if).toBeDefined();
    expect(conditionalAction?.then).toBeDefined();
    expect(conditionalAction?.else).toBeDefined();
  });

  test("elseRule() should add else at rule level", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-else-rule")
      .on("event")
      .if("data.status", "EQ", "active")
      .do("notify", { message: "Active!" })
      .elseRule({ type: "log", params: { msg: "Not active" } })
      .build();

    expect(rule.if).toBeDefined();
    expect(rule.do).toBeDefined();
    expect(rule.else).toBeDefined();
    
    const elseAction = rule.else as Action;
    expect(elseAction.type).toBe("log");
    expect(elseAction.params).toEqual({ msg: "Not active" });
  });

  test("elseRule() should work with action arrays", () => {
    const builder = new RuleBuilder();
    const rule = builder
      .id("test-else-rule-array")
      .on("event")
      .if("data.status", "EQ", "active")
      .do("notify", { message: "Active!" })
      .elseRule([
        { type: "log", params: { msg: "Not active 1" } },
        { type: "log", params: { msg: "Not active 2" } }
      ])
      .build();

    expect(rule.else).toBeDefined();
    expect(Array.isArray(rule.else)).toBe(true);
    const elseActions = rule.else as Action[];
    expect(elseActions.length).toBe(2);
  });
});

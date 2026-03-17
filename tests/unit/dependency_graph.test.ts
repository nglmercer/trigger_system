
import { describe, expect, test } from "bun:test";
import { DependencyAnalyzer } from "../../src/core/dependency-graph";
import type { DependencyAnalysisResult, DependencyGraph } from "../../src/core/dependency-graph";
import type { TriggerRule } from "../../src/types";

describe("DependencyAnalyzer (Circular Logic)", () => {
  
  test("Should detect direct cycle (A -> A)", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_A" } }
      }
    ];
    
    const cycles = DependencyAnalyzer.detectCycles(rules);
    expect(cycles.length).toBe(1);
    expect(cycles[0]).toEqual(["rule-a", "rule-a"]);
  });

  test("Should detect indirect cycle (A -> B -> A)", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_A" } }
      }
    ];

    const cycles = DependencyAnalyzer.detectCycles(rules);
    expect(cycles.length).toBe(1);
    // Ordering depends on traversal, but it should contain rule-a and rule-b
    expect(cycles[0]).toContain("rule-a");
    expect(cycles[0]).toContain("rule-b");
  });

  test("Should be clean for linear chain (A -> B -> C)", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_C" } }
      }
    ];

    const cycles = DependencyAnalyzer.detectCycles(rules);
    expect(cycles.length).toBe(0);
  });
});

describe("DependencyAnalyzer - JSON Export", () => {
  
  test("Should export graph as JSON string", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_C" } }
      }
    ];
    
    const json = DependencyAnalyzer.toJSON(rules);
    expect(typeof json).toBe("string");
    
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("graph");
    expect(parsed).toHaveProperty("cycles");
    expect(parsed).toHaveProperty("summary");
    expect(parsed).toHaveProperty("raw");
  });
  
  test("Should export compact JSON", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      }
    ];
    
    const json = DependencyAnalyzer.toJSONCompact(rules);
    const parsed = JSON.parse(json);
    expect(parsed.graph.nodes).toHaveLength(1);
  });
});

describe("DependencyAnalyzer - Build Graph", () => {
  
  test("Should build graph with full rule information", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        name: "Rule A",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        name: "Rule B",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_C" } }
      }
    ];
    
    const graph = DependencyAnalyzer.buildGraph(rules);
    
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1); // rule-a -> rule-b (only)
    
    // Check nodes have full rule data
    const nodeA = graph.nodes.find(n => n.ruleId === "rule-a");
    expect(nodeA).toBeDefined();
    expect(nodeA!.rule.name).toBe("Rule A");
    expect(nodeA!.listensTo).toContain("EVENT_A");
    expect(nodeA!.emits).toContain("EVENT_B");
    
    // Check edges have full rule information
    const edgeAtoB = graph.edges.find(e => e.sourceRuleId === "rule-a" && e.targetRuleId === "rule-b");
    expect(edgeAtoB).toBeDefined();
    expect(edgeAtoB!.emittedEvent).toBe("EVENT_B");
    expect(edgeAtoB!.sourceRule.id).toBe("rule-a");
    expect(edgeAtoB!.targetRule.id).toBe("rule-b");
  });
  
  test("Should build correct adjacency lists", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_C" } }
      }
    ];
    
    const graph = DependencyAnalyzer.buildGraph(rules);
    
    expect(graph.adjacencyList["rule-a"]).toContain("rule-b");
    // rule-b emits EVENT_C but nothing listens to it
    expect(graph.adjacencyList["rule-b"]).toHaveLength(0);
    expect(graph.reverseAdjacencyList["rule-b"]).toContain("rule-a");
  });
});

describe("DependencyAnalyzer - Complete Analysis", () => {
  
  test("Should return complete analysis result", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_C" } }
      }
    ];
    
    const result = DependencyAnalyzer.analyze(rules);
    
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.cycles).toHaveLength(0);
    expect(result.orphanedRules).toHaveLength(0); // Both have edges
    expect(result.summary.totalRules).toBe(2);
    expect(result.summary.totalEdges).toBe(1); // Only rule-a -> rule-b
  });
  
  test("Should detect cycles with full rule info", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_A" } }
      }
    ];
    
    const result = DependencyAnalyzer.analyze(rules);
    
    expect(result.cycles).toHaveLength(1);
    const cycle = result.cycles[0]!;
    expect(cycle.rules).toHaveLength(3); // rule-a -> rule-b -> rule-a
    expect(cycle.ruleIds).toContain("rule-a");
    expect(cycle.ruleIds).toContain("rule-b");
    expect(cycle.events).toContain("EVENT_B");
    expect(cycle.length).toBe(3);
  });
  
  test("Should find orphaned rules", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } } // No one listens to EVENT_B
      },
      {
        id: "rule-orphan",
        on: "EVENT_ORPHAN",
        do: { type: "LOG", params: { message: "orphan" } }
      }
    ];
    
    const result = DependencyAnalyzer.analyze(rules);
    
    // Both rules are orphaned - rule-a emits EVENT_B but nothing listens,
    // rule-orphan doesn't emit any event
    expect(result.orphanedRules).toHaveLength(2);
  });
});

describe("DependencyAnalyzer - Rule Dependencies", () => {
  
  test("Should get dependencies for specific rule", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_C" } }
      }
    ];
    
    const deps = DependencyAnalyzer.getRuleDependencies(rules, "rule-a");
    
    expect(deps).not.toBeNull();
    expect(deps!.dependsOn).toHaveLength(1);
    expect(deps!.dependsOn[0]!.id).toBe("rule-b");
    expect(deps!.dependedBy).toHaveLength(0);
  });
  
  test("Should return null for non-existent rule", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "LOG", params: { message: "test" } }
      }
    ];
    
    const deps = DependencyAnalyzer.getRuleDependencies(rules, "non-existent");
    expect(deps).toBeNull();
  });
  
  test("Should get rules listening to event", () => {
    const rules: TriggerRule[] = [
      { id: "rule-a", on: "EVENT_A", do: { type: "LOG" } },
      { id: "rule-b", on: "EVENT_A", do: { type: "LOG" } },
      { id: "rule-c", on: "EVENT_B", do: { type: "LOG" } }
    ];
    
    const listeners = DependencyAnalyzer.getRulesListeningToEvent(rules, "EVENT_A");
    expect(listeners).toHaveLength(2);
  });
  
  test("Should get rules emitting event", () => {
    const rules: TriggerRule[] = [
      { id: "rule-a", on: "EVENT_A", do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } } },
      { id: "rule-b", on: "EVENT_B", do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } } },
      { id: "rule-c", on: "EVENT_C", do: { type: "LOG" } }
    ];
    
    const emitters = DependencyAnalyzer.getRulesEmittingEvent(rules, "EVENT_B");
    expect(emitters).toHaveLength(2);
  });
});

describe("DependencyAnalyzer - Validation", () => {
  
  test("Should validate and detect cycles as errors", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_A" } }
      }
    ];
    
    const validation = DependencyAnalyzer.validate(rules);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0]).toContain("Circular dependency");
  });
  
  test("Should validate and warn about orphaned rules", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "LOG", params: { message: "test" } }
      },
      {
        id: "rule-orphan",
        on: "EVENT_ORPHAN",
        do: { type: "LOG", params: { message: "orphan" } }
      }
    ];
    
    const validation = DependencyAnalyzer.validate(rules);
    
    expect(validation.valid).toBe(true);
    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(validation.warnings[0]).toContain("Orphaned");
  });
  
  test("Should detect missing 'on' event", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "",
        do: { type: "LOG", params: { message: "test" } }
      }
    ];
    
    const validation = DependencyAnalyzer.validate(rules);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain("no 'on' event");
  });
});

describe("DependencyAnalyzer - Raw Data Export", () => {
  
  test("Should include raw rules in analysis", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      }
    ];
    
    const result = DependencyAnalyzer.analyze(rules);
    
    expect(result.raw.rules).toHaveLength(1);
    expect(result.raw.rules[0]!.id).toBe("rule-a");
  });
  
  test("Should include adjacency list in raw data", () => {
    const rules: TriggerRule[] = [
      {
        id: "rule-a",
        on: "EVENT_A",
        do: { type: "EMIT_EVENT", params: { event: "EVENT_B" } }
      },
      {
        id: "rule-b",
        on: "EVENT_B",
        do: { type: "LOG" }
      }
    ];
    
    const result = DependencyAnalyzer.analyze(rules);
    
    expect(result.raw.adjacencyList["rule-a"]).toContain("rule-b");
    expect(result.raw.eventToRules["EVENT_A"]).toContain("rule-a");
    expect(result.raw.eventToRules["EVENT_B"]).toContain("rule-b");
  });
});

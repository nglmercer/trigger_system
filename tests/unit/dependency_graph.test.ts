
import { describe, expect, test } from "bun:test";
import { DependencyAnalyzer } from "../../src/core/dependency-graph";
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

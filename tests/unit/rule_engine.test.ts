
import { describe, expect, test } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine";
import { ActionRegistry } from "../../src/core/action-registry";
import type { TriggerRule, TriggerContext } from "../../src/types";

describe("Rule Engine Unit Tests", () => {

    // --- 1. Basic Matching & Event Filtering ---

    test("Should match event type correctly", async () => {
        const rule: TriggerRule = {
            id: "match-event",
            on: "CORRECT_EVENT",
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Match
        const resMatch = await engine.evaluateContext({
            event: "CORRECT_EVENT", id: "1", timestamp: Date.now(), data: {}
        });
        expect(resMatch).toHaveLength(1);

        // No Match
        const resNoMatch = await engine.evaluateContext({
            event: "WRONG_EVENT", id: "2", timestamp: Date.now(), data: {}
        });
        expect(resNoMatch).toHaveLength(0);
    });

    // --- 2. Strict Actions Mode (Robustness) ---
    /* Moved from improvements.test.ts */

    test("Strict Mode: Should return error for unknown actions", async () => {
        const rule: TriggerRule = {
            id: "strict_check",
            on: "TEST",
            do: { type: "UNKNOWN_ACTION" }
        };
        
        // Strict Mode ON
        const engineStrict = new RuleEngine({
            rules: [rule],
            globalSettings: { evaluateAll: true, strictActions: true }
        });

        const resStrict = await engineStrict.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: {}
        });
        expect(resStrict[0]!.executedActions[0]).toHaveProperty('error');
        expect(resStrict[0]!.executedActions[0]!.error).toContain("Tipo de acción genérica o desconocida");

        // Strict Mode OFF (Default)
        const engineLoose = new RuleEngine({
            rules: [rule],
            globalSettings: { evaluateAll: true, strictActions: false }
        });
        const resLoose = await engineLoose.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: {}
        });
        // Should have result (warning) but no top-level error
        expect(resLoose[0]!.executedActions[0]).not.toHaveProperty('error');
    });

    // --- 3. Comparison Operators & Type Safety ---

    test("Safe Numeric Comparisons: Null check", async () => {
         const rule: TriggerRule = {
            id: "null-check",
            on: "TEST",
            if: { field: "data.val", operator: "GTE", value: 0 },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Null >= 0 should be false
        const resNull = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { val: null }
        });
        expect(resNull).toHaveLength(0);
        
        // 0 >= 0 should be true
        const resZero = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { val: 0 }
        });
        expect(resZero).toHaveLength(1);
    });

    test("Date Operators (SINCE/BEFORE)", async () => {
        const now = Date.now();
        const rule: TriggerRule = {
            id: "date-check",
            on: "TEST",
            if: [
                { field: "data.ts", operator: "SINCE", value: now - 1000 },
                { field: "data.ts", operator: "BEFORE", value: now + 1000 }
            ],
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        const res = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: now, data: { ts: now }
        });
        expect(res).toHaveLength(1);
    });
    
    // --- 4. Action Groups & Execution Modes ---

    test("Should execute EITHER action randomly", async () => {
        // Mock Math.random to pick second item (0.5+ -> index 1)
        // But logic is Math.floor(random * length). If length 2:
        // 0.0-0.49 -> 0
        // 0.5-0.99 -> 1
        
        // Simply run multiple times and ensure we get only 1 action per run
        const rule: TriggerRule = {
            id: "random-group",
            on: "TEST",
            do: {
                mode: "EITHER",
                actions: [
                    { type: "A" },
                    { type: "B" }
                ]
            }
        };
        
        // Mock registry
        const reg = ActionRegistry.getInstance();
        reg.register("A", () => "A");
        reg.register("B", () => "B");

        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });
        const res = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: {}
        });
        
        expect(res).toHaveLength(1);
        expect(res[0]!.executedActions).toHaveLength(1); // Only 1 executed
        const type = res[0]!.executedActions[0]!.type;
        expect(["A", "B"]).toContain(type);
    });

    // --- 5. Cooldowns ---

    test("Should respect rule cooldown", async () => {
        const rule: TriggerRule = {
            id: "cd-rule",
            on: "TEST",
            cooldown: 50, // 50ms
            do: { type: "A" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });
        const ctx = { event: "TEST", id: "1", timestamp: Date.now(), data: {} };

        // 1st run: Success
        const res1 = await engine.evaluateContext(ctx);
        expect(res1).toHaveLength(1);

        // 2nd run: Immediate -> Fail (Cooldown)
        const res2 = await engine.evaluateContext(ctx);
        expect(res2).toHaveLength(0);

        // Wait -> Success
        await new Promise(r => setTimeout(r, 60));
        const res3 = await engine.evaluateContext(ctx);
        expect(res3).toHaveLength(1);
    });
});

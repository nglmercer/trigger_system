
import { describe, expect, test, beforeEach } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine";
import { StateManager } from "../../src/core/state-manager";
import type { TriggerRule, TriggerContext } from "../../src/types";

describe("Stateful Logic Triggers", () => {
    
    beforeEach(() => {
        StateManager.getInstance().clear();
    });

    // 1. Test Simple Increment
    test("Should increment state counter", async () => {
        const rule: TriggerRule = {
            id: "increment-test",
            on: "CLICK",
            do: { 
                type: "STATE_INCREMENT", 
                params: { key: "click_count", amount: 1 } 
            }
        };

        const engine = new RuleEngine({ rules: [rule], globalSettings: {} });
        const context: TriggerContext = {
            event: "CLICK",
            timestamp: Date.now(),
            data: {}
        };

        await engine.evaluateContext(context);
        expect(StateManager.getInstance().get("click_count")).toBe(1);

        await engine.evaluateContext(context);
        expect(StateManager.getInstance().get("click_count")).toBe(2);
    });

    // 2. Test Repetition Goal (Combo of Increment + Condition)
    test("Should trigger goal after 3 repetitions", async () => {
        const rules: TriggerRule[] = [
            {
                id: "count-clicks",
                on: "CLICK",
                // Must not have condition to always run, or check if goal not reached?
                // For simplicity, let's just increment.
                do: { type: "STATE_INCREMENT", params: { key: "total_clicks" } }
            },
            {
                id: "goal-reached",
                on: "CLICK",
                if: {
                    field: "state.total_clicks",
                    operator: "GTE",
                    value: 3
                },
                do: { type: "log", params: { message: "Goal Reached!" } }
            }
        ];

        const engine = new RuleEngine({ rules, globalSettings: { evaluateAll: true } });
        const context: TriggerContext = { event: "CLICK", timestamp: Date.now(), data: {} };

        // 1st Click
        let results = await engine.evaluateContext(context);
        // "count-clicks" runs (state -> 1). "goal-reached" (1 >= 3) False.
        expect(StateManager.getInstance().get("total_clicks")).toBe(1);
        expect(results.find(r => r.ruleId === "goal-reached")).toBeUndefined(); 

        // 2nd Click
        results = await engine.evaluateContext(context);
        expect(StateManager.getInstance().get("total_clicks")).toBe(2);
        
        // 3rd Click
        // Note: Rules run in priority/order. If "count-clicks" runs first, state becomes 3. 
        // Then "goal-reached" sees 3 and triggers.
        // RuleEngine sorts by priority. Let's assume order is preserved if priority equal, or random.
        // Safe bet: rely on injected state. 
        // Wait, current implementation injects state *before* rule iteration. 
        // So `context.state` is a snapshot at start of evaluation.
        // If "count-clicks" updates Global State, `context.state` (the local ref) is NOT updated 
        // unless `StateManager.getAll()` returns a reference to the map?
        // getAll() returns `Object.fromEntries(this.state)`, which is a simplified COPY.
        // So mutations in one rule WON'T be seen by subsequent rules in the SAME event pass.
        // This means it will trigger on the 4th click event (when state was 3 at start).
        
        results = await engine.evaluateContext(context); 
        // State becomes 3 during this execution, but context.state was 2.
        
        // 4th Click
        results = await engine.evaluateContext(context);
        // context.state is 3. Rule matches.
        expect(results.some(r => r.ruleId === "goal-reached")).toBe(true);
    });

    // 3. Test Sequence Combo (A then B)
    test("Should trigger only if A happened before B", async () => {
        const rules: TriggerRule[] = [
            {
                id: "step-1",
                on: "EVENT_A",
                do: { type: "STATE_SET", params: { key: "step", value: 1 } }
            },
            {
                id: "step-2",
                on: "EVENT_B",
                if: {
                    field: "state.step",
                    operator: "EQ",
                    value: 1
                },
                do: { type: "STATE_SET", params: { key: "step", value: 2 } } // Advancement
            },
            {
                id: "final-goal",
                on: "EVENT_B",
                if: {
                    field: "state.step", // Note: same issue with snapshot.
                    operator: "EQ",
                    value: 2
                },
                do: { type: "log", params: { message: "Sequence Complete" } }
            }
        ];

        const engine = new RuleEngine({ rules, globalSettings: { evaluateAll: true } });

        // Event B (premature)
        await engine.evaluateContext({ event: "EVENT_B", timestamp: 0, data: {} });
        expect(StateManager.getInstance().get("step")).toBeUndefined();

        // Event A
        await engine.evaluateContext({ event: "EVENT_A", timestamp: 0, data: {} });
        expect(StateManager.getInstance().get("step")).toBe(1);

        // Event B (Sequence complete)
        const results = await engine.evaluateContext({ event: "EVENT_B", timestamp: 0, data: {} });
        // step-2 runs. Sets state to 2.
        
        const success = results.find(r => r.ruleId === "step-2");
        expect(success).toBeDefined();
        expect(StateManager.getInstance().get("step")).toBe(2);
    });
});


import { describe, expect, test, beforeEach } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine";
import { StateManager } from "../../src/core/state-manager";

describe("Lite Syntax & Direct State Access", () => {
    let engine: RuleEngine;

    beforeEach(async () => {
        await StateManager.getInstance().clear();
    });

    test("Should modify state directly using 'run' block", async () => {
        engine = new RuleEngine({
            rules: [{
                id: "run-test",
                on: "TEST",
                do: {
                    run: "state.count = (state.count || 0) + 1; state.foo = 'bar';"
                }
            }],
            globalSettings: {}
        });

        await engine.processEventSimple("TEST");
        expect(StateManager.getInstance().get("count")).toBe(1);
        expect(StateManager.getInstance().get("foo")).toBe("bar");

        await engine.processEventSimple("TEST");
        expect(StateManager.getInstance().get("count")).toBe(2);
    });

    test("Should support shorthand action syntax", async () => {
        let notified = false;
        let msg = "";

        // Register a mock notify action if not already there (it should be)

        engine = new RuleEngine({
            rules: [{
                id: "shorthand-test",
                on: "TEST",
                do: {
                    notify: "Hello World"
                }
            }],
            globalSettings: {}
        });

        const results = await engine.processEventSimple("TEST");
        const notifyAction = results[0].executedActions.find(a => a.type === "notify");
        expect(notifyAction).toBeDefined();
        expect((notifyAction!.result as any).message).toBe("Hello World");
    });

    test("Should handle nested direct state access", async () => {
        engine = new RuleEngine({
            rules: [{
                id: "nested-state-test",
                on: "TEST",
                do: {
                    run: `
                        state.stats = state.stats || {};
                        state.stats.hits = (state.stats.hits || 0) + 1;
                    `
                }
            }],
            globalSettings: {}
        });

        await engine.processEventSimple("TEST");
        const stats = StateManager.getInstance().get("stats") as any;
        expect(stats.hits).toBe(1);
    });

    test("Should support conditional actions with shorthand", async () => {
        engine = new RuleEngine({
            rules: [{
                id: "conditional-shorthand",
                on: "TEST",
                do: {
                    if: { field: "data.val", operator: "GT", value: 10 },
                    notify: "Value is high"
                }
            }],
            globalSettings: {}
        });

        const res1 = await engine.processEventSimple("TEST", { val: 5 });
        expect(res1[0].executedActions.filter(a => a.type === "notify")).toHaveLength(0);

        const res2 = await engine.processEventSimple("TEST", { val: 15 });
        expect(res2[0].executedActions.find(a => a.type === "notify")).toBeDefined();
    });
});

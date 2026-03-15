import { describe, expect, test, beforeEach } from "bun:test";
import { TriggerEngine } from "../../src/core/trigger-engine";
import { StateManager } from "../../src/core/state-manager";

describe("Break functionality", () => {
    let engine: TriggerEngine;

    beforeEach(() => {
        // Reset state manager
        StateManager.getInstance().clear();
        engine = new TriggerEngine([]);
    });

    test("should stop execution after BREAK in action list", async () => {
        // Create a rule with multiple actions including a BREAK
        const rule = {
            id: "test-break",
            on: "TEST_EVENT",
            do: [
                { type: "STATE_SET", params: { key: "action1", value: "executed" } },
                { type: "STATE_SET", params: { key: "action2", value: "executed" } },
                { break: true }, // This should stop execution
                { type: "STATE_SET", params: { key: "action3", value: "SHOULD_NOT_EXECUTE" } },
            ]
        };

        engine.rules = [rule];

        const results = await engine.processEvent({
            event: "TEST_EVENT",
            data: {},
            vars: {},
            timestamp: Date.now(),
            state: {}
        });

        expect(results).toHaveLength(1);
        // Action 1 and 2 should execute, action 3 should NOT
        expect(StateManager.getInstance().get("action1")).toBe("executed");
        expect(StateManager.getInstance().get("action2")).toBe("executed");
        expect(StateManager.getInstance().get("action3")).toBeUndefined();

        // Check that BREAK was recorded
        const breakAction = results[0]!.executedActions.find(a => a.type === "BREAK");
        expect(breakAction).toBeDefined();
    });

    test("should stop after first rule when evaluateAll is false", async () => {
        // Multiple rules matching the same event with evaluateAll: false
        const rules = [
            {
                id: "rule-1",
                on: "SAME_EVENT",
                do: [{ type: "STATE_SET", params: { key: "rule1", value: "executed" } }] as any
            },
            {
                id: "rule-2",
                on: "SAME_EVENT",
                do: [{ type: "STATE_SET", params: { key: "rule2", value: "executed" } }] as any
            }
        ];

        engine = new TriggerEngine({
            rules,
            globalSettings: {
                evaluateAll: false
            }
        });

        await engine.processEvent({
            event: "SAME_EVENT",
            data: {},
            vars: {},
            timestamp: Date.now(),
            state: {}
        });

        // Only first rule should execute
        expect(StateManager.getInstance().get("rule1")).toBe("executed");
        expect(StateManager.getInstance().get("rule2")).toBeUndefined();
    });

    test("BREAK should work inside action group", async () => {
        const rule = {
            id: "test-break-group",
            on: "TEST_EVENT",
            do: {
                mode: "ALL",
                actions: [
                    { type: "STATE_SET", params: { key: "group1", value: "executed" } },
                    { type: "STATE_SET", params: { key: "group2", value: "executed" } },
                    { break: true },
                    { type: "STATE_SET", params: { key: "group3", value: "SHOULD_NOT_EXECUTE" } },
                ]
            }
        };

        engine.rules = [rule];

        const results = await engine.processEvent({
            event: "TEST_EVENT",
            data: {},
            vars: {},
            timestamp: Date.now(),
            state: {}
        });

        expect(results).toHaveLength(1);
        expect(StateManager.getInstance().get("group1")).toBe("executed");
        expect(StateManager.getInstance().get("group2")).toBe("executed");
        expect(StateManager.getInstance().get("group3")).toBeUndefined();
    });
});

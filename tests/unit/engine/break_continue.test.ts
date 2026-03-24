import { describe, expect, test, beforeEach } from "bun:test";
import { TriggerEngine } from "../../../src/core/trigger-engine";

describe("Break functionality", () => {
    let engine: TriggerEngine;

    beforeEach(() => {
        // Reset state manager
        engine = new TriggerEngine([]);
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
        });

        // Only first rule should execute
    });

    test("BREAK should work inside action group", async () => {
        const rule = {
            id: "test-break-group",
            on: "TEST_EVENT",
            do: {
                mode: "ALL",
                actions: [
                    { type: "vars", params: { op: "set", key: "group1", value: "executed" } },
                    { type: "vars", params: { op: "set", key: "group2", value: "executed" } },
                    { break: true },
                    { type: "vars", params: { op: "set", key: "group3", value: "SHOULD_NOT_EXECUTE" } },
                ]
            }
        };

        engine.rules = [rule];

        const results = await engine.processEvent({
            event: "TEST_EVENT",
            data: {},
            vars: {},
            timestamp: Date.now(),
        });

        expect(results).toHaveLength(1);
    });
});

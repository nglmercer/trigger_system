
import { describe, test, expect, beforeEach } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine-new";
import { ActionRegistry } from "../../src/core/action-registry";
import { TriggerLoader } from "../../src/io/loader.node";
import { ExpressionEngine } from "../../src/core/expression-engine";
import path from "path";
import type { TriggerRule } from "../../src/types";

describe("Sequence State Passing", () => {
    let engine: RuleEngine;
    const registry = ActionRegistry.getInstance();

    beforeEach(async () => {
        registry.register("math", (action, context) => {
            const expression = action.params?.expression as string;
            return ExpressionEngine.evaluate(expression, context);
        });

        registry.register("print", (action) => {
            return action.params?.message;
        });

        // Load Rules from YAML
        const yamlPath = path.join(import.meta.dir, "../rules/examples/sequence_state.yaml");
        const rules = await TriggerLoader.loadRule(yamlPath);
        
        engine = new RuleEngine({ 
            rules, 
            globalSettings: { evaluateAll: true, debugMode: false } 
        });
    });

    test("Should pass lastResult between actions in SEQUENCE mode", async () => {
        const results = await engine.processEventSimple("test.sequence", {}, {});

        expect(results).toHaveLength(1);
        const actions = (results[0] && results[0].executedActions) || [];
        
        // 1st action: math (10 + 5) = 15
        expect(actions[0]?.type).toBe("math");
        expect(actions[0]?.result).toBe(15);

        // 2nd action: math (${lastResult} * 2) = 15 * 2 = 30
        expect(actions[1]?.type).toBe("math");
        expect(actions[1]?.result).toBe(30);

        // 3rd action: print ("The final result is ${lastResult}") = "The final result is 30"
        expect(actions[2]?.type).toBe("print");
        expect(actions[2]?.result).toBe("The final result is 30");
    });

    test("Should interpolation work with dynamic delay", async () => {
        const start = Date.now();
        
        // Define a rule with dynamic delay
        const dynamicDelayRule: TriggerRule = {
            id: "dynamic-delay",
            on: "test.delay",
            do: {
                mode: "SEQUENCE",
                actions: [
                    { type: "math", params: { expression: "50" } },
                    { type: "print", params: { message: "delayed" }, delay: "${lastResult}" as any }
                ]
            }
        };

        const engine2 = new RuleEngine({
            rules: [dynamicDelayRule],
            globalSettings: { evaluateAll: true }
        });

        await engine2.processEventSimple("test.delay", {}, {});

        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(40); 
    });

    test("Should work with global functions and Math", async () => {
        const results = await engine.processEventSimple("test.sequence", {}, {});
        // After 2nd action, lastResult is 30
        
        const ruleWithFunctions: TriggerRule = {
            id: "functions-test",
            on: "test.functions",
            do: {
                mode: "SEQUENCE",
                actions: [
                    { type: "math", params: { expression: "10.5" } },
                    { type: "print", params: { message: "Rounded: ${Math.round(lastResult)}" } }
                ]
            }
        };

        const engine2 = new RuleEngine({
            rules: [ruleWithFunctions],
            globalSettings: { evaluateAll: true }
        });

        const results2 = await engine2.processEventSimple("test.functions", {}, {});
        const actions = (results2[0] && results2[0].executedActions) || [];
        
        expect(actions[1]?.result).toBe("Rounded: 11");
    });

    test("Should work with context helpers", async () => {
        const ruleWithHelpers: TriggerRule = {
            id: "helpers-test",
            on: "test.helpers",
            do: {
                mode: "SEQUENCE",
                actions: [
                    { type: "math", params: { expression: "20" } },
                    { type: "print", params: { message: "Calculated: ${helpers.double(lastResult)}" } }
                ]
            }
        };

        const engineWithHelpers = new RuleEngine({
            rules: [ruleWithHelpers],
            globalSettings: { evaluateAll: true }
        });

        const context = {
            event: "test.helpers",
            timestamp: Date.now(),
            data: {},
            helpers: {
                double: (n: any) => n * 2
            }
        };

        const results = await engineWithHelpers.processEvent(context);
        const actions = (results[0] && results[0].executedActions) || [];
        
        expect(actions[1]?.result).toBe("Calculated: 40");
    });
});

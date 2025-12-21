
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine";
import { ActionRegistry } from "../../src/core/action-registry";
import { TriggerLoader } from "../../src/io/loader.node";
import { StateManager } from "../../src/core/state-manager";
import path from "path";

describe("DSL Equivalents Verification", () => {
    
    let engine: RuleEngine;
    const registry = ActionRegistry.getInstance();
    const stateManager = StateManager.getInstance();
    
    // Store dropped items for verification
    let droppedItems: any[] = [];

    beforeEach(async () => {
        // Clear previous state
        await stateManager.clear();
        droppedItems = [];

        // 1. Register the custom 'DROP' action used in the DSL examples
        registry.register("DROP", (action, ctx) => {
            const item = action.params?.item;
            const display = action.params?.display;
            
            droppedItems.push({
                item,
                display,
                sourceEvent: ctx.event,
                amount: ctx.data.amount
            });

            return { status: "dropped", item };
        });

        // 2. Load the specific YAML file
        const yamlPath = path.join(import.meta.dir, "../rules/examples/dsl_equivalents.yaml");
        const rules = await TriggerLoader.loadRule(yamlPath);

        // 3. Initialize Engine
        engine = new RuleEngine({ 
            rules, 
            globalSettings: { evaluateAll: true } 
        });
    });

    test("Scenario 1: Small Donation (0-10) -> Drop Stick", async () => {
        const context = {
            event: "Donation",
            id: "evt-1",
            timestamp: Date.now(),
            data: { amount: 5 } // Inside [0, 10]
        };

        const results = await engine.evaluateContext(context);
        
        expect(results).toHaveLength(1);
        expect(results[0]!.ruleId).toBe("dsl-example-1");
        
        expect(droppedItems).toHaveLength(1);
        expect(droppedItems[0]!.item).toBe("minecraft:stick");
    });

    test("Scenario 2: Medium Donation (11-20) -> Drop Apple", async () => {
        const context = {
            event: "Donation",
            id: "evt-2",
            timestamp: Date.now(),
            data: { amount: 15 } // Inside [11, 20]
        };

        const results = await engine.evaluateContext(context);

        expect(results).toHaveLength(1);
        expect(results[0]!.ruleId).toBe("dsl-example-2");
        
        expect(droppedItems).toHaveLength(1);
        expect(droppedItems[0]!.item).toBe("minecraft:apple");
    });

    test("Scenario 3: Large Donation (21-30) -> Drop Complex Diamond", async () => {
        const context = {
            event: "Donation",
            id: "evt-3",
            timestamp: Date.now(),
            data: { amount: 25 } // Inside [21, 30]
        };

        const results = await engine.evaluateContext(context);

        expect(results).toHaveLength(1);
        expect(results[0]!.ruleId).toBe("dsl-example-3");
        
        expect(droppedItems).toHaveLength(1);
        expect(droppedItems[0]!.item).toContain("diamond{display:{Name:"); // Complex NBT string
    });

    test("Scenario 4: Huge Donation (>30) -> Drop Diamond with Display Message", async () => {
        const context = {
            event: "Donation",
            id: "evt-4",
            timestamp: Date.now(),
            data: { amount: 500 } // > 30
        };

        const results = await engine.evaluateContext(context);

        expect(results).toHaveLength(1);
        expect(results[0]!.ruleId).toBe("dsl-example-4");
        
        expect(droppedItems).toHaveLength(1);
        expect(droppedItems[0]!.item).toBe("diamond");
        expect(droppedItems[0]!.display).toContain("Here, a diamond for you!");
    });

    test("Scenario 5: Invalid Donation (Negative) -> No Drop", async () => {
        const context = {
            event: "Donation",
            id: "evt-fail",
            timestamp: Date.now(),
            data: { amount: -5 } // Not covered by any range
        };

        const results = await engine.evaluateContext(context);

        expect(results).toHaveLength(0); // No rule should match
        expect(droppedItems).toHaveLength(0);
    });
});

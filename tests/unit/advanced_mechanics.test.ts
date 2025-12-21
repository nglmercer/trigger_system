
import { describe, test, expect, beforeEach } from "bun:test";
import { EventEmitter } from "events";
import { RuleEngine } from "../../src/core/rule-engine";
import { ActionRegistry } from "../../src/core/action-registry";
import type { TriggerRule } from "../../src/types";

describe("Advanced Mechanics (Cooldown & Randomness) with Emitter", () => {
    
    let eventEmitter: EventEmitter;
    const registry = ActionRegistry.getInstance();

    beforeEach(() => {
        eventEmitter = new EventEmitter();
        // Clear previous listeners if any (though new instance handle it)
    });

    // --- 1. Cooldown Verification using Emitter ---

    test("Should respect cooldown via event emission", async () => {
        const ruleId = "cooldown-test-rule";
        const actionType = "TEST_EMIT_COOLDOWN";
        const eventName = "fired_cooldown";

        // Register custom action that emits to our test emitter
        registry.register(actionType, () => {
            eventEmitter.emit(eventName);
            return { executed: true };
        });

        const rule: TriggerRule = {
            id: ruleId,
            on: "TEST_EVENT",
            cooldown: 50, // 50ms cooldown
            do: { type: actionType }
        };

        const engine = new RuleEngine({ 
            rules: [rule], 
            globalSettings: { evaluateAll: true } 
        });

        let emitCount = 0;
        eventEmitter.on(eventName, () => { emitCount++; });

        const ctx = { event: "TEST_EVENT", id: "1", timestamp: Date.now(), data: {} };

        // 1. First execution - Should emit
        await engine.evaluateContext(ctx);
        expect(emitCount).toBe(1);

        // 2. Immediate second execution - Should NOT emit (blocked by cooldown)
        await engine.evaluateContext(ctx);
        expect(emitCount).toBe(1);

        // 3. Wait for cooldown expiration
        await new Promise(resolve => setTimeout(resolve, 60));

        // 4. Third execution - Should emit again
        await engine.evaluateContext(ctx);
        expect(emitCount).toBe(2);
    });

    // --- 2. Random Execution (EITHER) Verification ---

    test("Should execute only ONE action in EITHER mode", async () => {
        const actionA = "TEST_ACTION_A";
        const actionB = "TEST_ACTION_B";
        
        let countA = 0;
        let countB = 0;

        // Register two distinct actions
        registry.register(actionA, () => {
            countA++;
            return { type: "A" };
        });
        registry.register(actionB, () => {
            countB++;
            return { type: "B" };
        });

        const rule: TriggerRule = {
            id: "random-either-rule",
            on: "TEST_EVENT",
            do: {
                mode: "EITHER",
                actions: [
                    { type: actionA },
                    { type: actionB }
                ]
            }
        };

        const engine = new RuleEngine({ 
            rules: [rule], 
            globalSettings: { evaluateAll: true } 
        });

        const ctx = { event: "TEST_EVENT", id: "1", timestamp: Date.now(), data: {} };

        // Run multiple times verify mutual exclusivity per run
        const iterations = 20;
        for (let i = 0; i < iterations; i++) {
            const currentA = countA;
            const currentB = countB;
            
            await engine.evaluateContext(ctx);
            
            const diffA = countA - currentA;
            const diffB = countB - currentB;
            
            // EXACTLY one of them should have incremented
            expect(diffA + diffB).toBe(1);
        }

        // Verify we got a mix (statistically extremely likely in 20 runs)
        // If this flakily fails, Math.random is broken or we are extremely unlucky (1 in 2^20)
        expect(countA).toBeGreaterThan(0);
        expect(countB).toBeGreaterThan(0);
    });
});

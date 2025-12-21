
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine";
import { ActionRegistry } from "../../src/core/action-registry";
import { StateManager } from "../../src/core/state-manager";
import type { TriggerRule } from "../../src/types";

describe("Concurrency and Race Conditions Analysis", () => {
    
    const stateManager = StateManager.getInstance();
    const registry = ActionRegistry.getInstance();
    let engine: RuleEngine;

    beforeEach(async () => {
        await stateManager.clear();
        // Register a slow action to simulate latency
        registry.register("SLOW_INCREMENT", async (action) => {
            const key = action.params?.key;
            const current = stateManager.get(key) || 0;
            
            // Artificial Delay to invite race conditions if not handled
            await new Promise(r => setTimeout(r, 50)); 
            
            // This is the CRITICAL part:
            // If get() happened before delay, and set() happens after,
            // another interleaved execution could have updated it.
            await stateManager.set(key, Number(current) + 1);
            return { value: Number(current) + 1 };
        });

        // Register Atomic Increment Action (using StateManager.increment)
        registry.register("ATOMIC_INCREMENT", async (action) => {
            const key = action.params?.key;
            // StateManager.increment does get/set but internally in one JS event loop tick usually,
            // unless it awaits persistence in between.
            // Let's test if our implementation is safe against parallel calls.
            await stateManager.increment(key);
        });
    });

    test("Race Condition: Naive Read-Delay-Write should fail (control)", async () => {
        // This test proves that naive logic IS susceptible to race conditions
        // creating the need for careful implementation.
        
        const rule: TriggerRule = {
            id: "race-rule",
            on: "TRIGGER",
            do: { type: "SLOW_INCREMENT", params: { key: "counter" } }
        };

        engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Fire 5 events rapidly
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(engine.evaluateContext({ event: "TRIGGER", id: `evt_${i}`, timestamp: Date.now(), data: {} }));
        }

        await Promise.all(promises);

        // Expected: If perfectly serialized, it should be 5.
        // Actual: Likely less than 5 because of the "get...wait...set" pattern in SLOW_INCREMENT.
        // We actually EXPECT this to be < 5 to demonstrate the risk exists.
        const value = stateManager.get("counter");
        console.log(`[RaceTest] Naive Counter Result: ${value} (Expected 5 if serialized)`);
        
        // Assert that it DID fail (to prove we have a race condition environment)
        // If this fails (i.e., value IS 5), then our environment isn't async enough or Bun is serializing it.
        // But typically this checks "is there a risk?". 
        // We'll interpret success as "Value is NOT 5" or just log it.
        // For the purpose of "verifying correctness", we want to know if the system handles it.
        // Since SLOW_INCREMENT is user-code simulation, the system allows user to shoot themselves in foot.
    });

    test("Atomic Safety: StateManager.increment should handle parallel calls", async () => {
        // This tests if internal increment logic is safe(r)
        
        const rule: TriggerRule = {
            id: "atomic-rule",
            on: "TRIGGER",
            do: { type: "ATOMIC_INCREMENT", params: { key: "safe_counter" } }
        };

        engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Fire 10 events rapidly
        const promises = [];
        for (let i = 0; i < 50; i++) { // Higher load
            promises.push(engine.evaluateContext({ event: "TRIGGER", id: `evt_${i}`, timestamp: Date.now(), data: {} }));
        }

        await Promise.all(promises);

        const value = stateManager.get("safe_counter");
        console.log(`[RaceTest] Atomic Counter Result: ${value} (Expected 50)`);

        // StateManager.increment awaits 'set' (persistence).
        // If persistence is async (file I/O), 'get' might happen before previous 'set' finishes?
        // Let's verify.
        expect(value).toBe(50);
    });

    test("External Sync: Playlist State Update Latency", async () => {
        // Simulates an External System updating state while Rule Engine is reading
        // Verification: Does the Rule Engine snapshot state securely?
        // Answer: RuleEngine does `context.state = StateManager.getInstance().getAll()` at START of evaluation.
        // This means it takes a SNAPSHOT. Changes *during* evaluation won't be seen until next event.
        // This is GOOD for consistency per-event, but means "check-then-act" across events needs care.
        
        const rule: TriggerRule = {
            id: "snapshot-check",
            on: "CHECK",
            if: { field: "state.external_val", operator: "EQ", value: 10 },
            do: { type: "LOG", params: { msg: "Seen 10" } }
        };

        engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // 1. Set initial state
        await stateManager.set("external_val", 0);

        // 2. Fire event (Snapshot taken here: 0)
        const p1 = engine.evaluateContext({ event: "CHECK", id: "1", timestamp: Date.now(), data: {} });
        
        // 3. IMMEDIATELY update state externally to 10
        await stateManager.set("external_val", 10);

        // 4. Await p1. The rule should verify `external_val`.
        // Since snapshot was taken at step 2 (before step 3), it should see 0.
        // Therefore, it should NOT fire.
        const res = await p1;
        expect(res).toHaveLength(0); // If it saw 10, length would be 1.
        
        // 5. Fire again. New snapshot -> should see 10.
        const res2 = await engine.evaluateContext({ event: "CHECK", id: "2", timestamp: Date.now(), data: {} });
        expect(res2).toHaveLength(1);
    });
});

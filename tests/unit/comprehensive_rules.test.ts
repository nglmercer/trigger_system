
import { describe, it, expect, beforeEach } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine";
import { TriggerLoader } from "../../src/io/loader.node";
import { StateManager } from "../../src/core/state-manager";
import path from "path";

describe("Comprehensive Rule Engine Tests", () => {
    let engine: RuleEngine;
    let stateManager: StateManager;

    beforeEach(async () => {
        // Reset state
        stateManager = StateManager.getInstance();
        stateManager.set("eq_result", false);
        stateManager.set("eq_alias_result", false);
        stateManager.set("neq_result", false);
        
        // Load rules
        const rulesPath = path.join(import.meta.dir, "../rules/examples/all_operators.yaml");
        const rules = await TriggerLoader.loadRule(rulesPath);
        
        console.log(`[Test] Loaded ${rules.length} rules from ${rulesPath}`);
        if (rules.length === 0) {
            console.error("No rules loaded! Check file path and content.");
        }

        engine = new RuleEngine({
            rules: rules,
            globalSettings: {
                evaluateAll: true, // Crucial to test all rules in one go
                debugMode: true, // Turn on debug
                strictActions: true
            }
        });
        
        // Reset state completely
        await stateManager.clear();
        stateManager.set("secret_target", "hit_me");
    });

    it("should pass numeric and equality operators", async () => {
        const context = {
            event: "TEST_EVENT",
            timestamp: Date.now(),
            data: {
                value: "test_string",
                number: 100,
            }
        };

        await engine.evaluateContext(context);

        // console.log("State after numeric test:", JSON.stringify(stateManager.getAll()));

        expect(stateManager.get("eq_result")).toBe(true);
        expect(stateManager.get("eq_alias_result")).toBe(true);
        expect(stateManager.get("neq_result")).toBe(true);
        expect(stateManager.get("gt_result")).toBe(true);
        expect(stateManager.get("gte_result")).toBe(true);
        expect(stateManager.get("lt_result")).toBe(true); 
        expect(stateManager.get("lte_result")).toBe(true);
        expect(stateManager.get("range_result")).toBe(true);
    });

    it("should pass string operators", async () => {
        const context = {
            event: "TEST_EVENT",
            timestamp: Date.now(),
            data: {
                text: "The quick brown fox",
                email: "user@example.com"
            }
        };

        await engine.evaluateContext(context);
        expect(stateManager.get("contains_result")).toBe(true);
        expect(stateManager.get("matches_result")).toBe(true);
    });

    it("should pass list operators", async () => {
        const context = {
            event: "TEST_EVENT",
            timestamp: Date.now(),
            data: {
                role: "admin"
            }
        };
        
        await engine.evaluateContext(context);
        expect(stateManager.get("in_result")).toBe(true);
        expect(stateManager.get("not_in_result")).toBe(true);
    });

    it("should pass date operators", async () => {
        const context = {
            event: "TEST_EVENT",
            timestamp: Date.now(),
            data: {
                timestamp: "2024-01-01T12:00:00Z"
            }
        };

        await engine.evaluateContext(context);
        expect(stateManager.get("after_result")).toBe(true); // 2024 > 2023
        expect(stateManager.get("before_result")).toBe(true); // 2024 < 2025
    });

    it("should pass logical grouping (AND/OR)", async () => {
        const context = {
            event: "TEST_EVENT",
            timestamp: Date.now(),
            data: {
                active: true,
                score: 20,
                status: "vip"
            }
        };

        await engine.evaluateContext(context);
        expect(stateManager.get("and_group_result")).toBe(true);
        expect(stateManager.get("or_group_result")).toBe(true);
    });

    it("should handle dynamic values from globals", async () => {
        const context = {
            event: "TEST_EVENT",
            timestamp: Date.now(),
            data: {
                target: "hit_me"
            },
            vars: {
                secret_target: "hit_me"
            }
        };
        // Global "secret_target" set in beforeEach

        await engine.evaluateContext(context);
        expect(stateManager.get("dynamic_value_result")).toBe(true);
    });

    it("should execute sequence of actions", async () => {
        const context = { event: "TEST_EVENT", timestamp: Date.now(), data: {} };
        await engine.evaluateContext(context);
        expect(stateManager.get("seq_step_1")).toBe("done");
        expect(stateManager.get("seq_step_2")).toBe("done");
    });
});

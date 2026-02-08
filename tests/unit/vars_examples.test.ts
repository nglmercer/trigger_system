/**
 * Tests for vars_examples.yaml rules
 * Tests STATE_SET, STATE_GET, STATE_INCREMENT, STATE_DELETE, and variable usage
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine";
import { StateManager } from "../../src/core/state-manager";
import { TriggerLoader } from "../../src/io/loader.node";
import * as path from "path";
import type { TriggerContext } from "../../src/types";

describe("Vars Examples Tests", () => {
    let engine: RuleEngine;

    beforeEach(async () => {
        // Clear state before each test
        StateManager.getInstance().clear();

        // Load rules from vars_examples.yaml
        const rulesPath = path.join(import.meta.dir, "../rules/examples/vars_examples.yaml");
        const rules = await TriggerLoader.loadRule(rulesPath);
        
        engine = new RuleEngine({
            rules,
            globalSettings: { evaluateAll: true }
        });
    });

    describe("vars-basic-set-get", () => {
        test("Should set and get a variable using STATE_SET and STATE_GET", async () => {
            const context: TriggerContext = {
                event: "TEST_EVENT",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            // Find the vars-basic-set-get rule result
            const basicResult = results.find(r => r.ruleId === "vars-basic-set-get");
            expect(basicResult).toBeDefined();
            expect(basicResult!.success).toBe(true);

            // Verify state was set
            expect(StateManager.getInstance().get("counter")).toBe(10);

            // Verify STATE_GET action was executed and stored in vars
            const stateGetAction = basicResult!.executedActions.find(a => a.type === "STATE_GET");
            expect(stateGetAction).toBeDefined();
            expect((stateGetAction!.result as any).value).toBe(10);

            // Verify LOG action was executed
            const logAction = basicResult!.executedActions.find(a => a.type === "LOG");
            expect(logAction).toBeDefined();
        });
    });

    describe("vars-math-operations", () => {
        test("Should perform math operations with variables", async () => {
            const context: TriggerContext = {
                event: "CALCULATE_EVENT",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            const mathResult = results.find(r => r.ruleId === "vars-math-operations");
            expect(mathResult).toBeDefined();
            expect(mathResult!.success).toBe(true);

            // Verify state values
            expect(StateManager.getInstance().get("price")).toBe(100);
            expect(StateManager.getInstance().get("taxRate")).toBe(0.15);
            
            // Total is stored as the result of expression evaluation
            // The expression ${vars.basePrice + vars.basePrice * vars.tax} evaluates to 115
            const total = StateManager.getInstance().get("total");
            // Accept either number or string form
            expect(total === 115 || total === "115").toBe(true);

            // Verify LOG action was executed
            const logAction = mathResult!.executedActions.find(a => a.type === "LOG");
            expect(logAction).toBeDefined();
            // The log message should contain the calculated total
            expect((logAction!.result as any).message).toContain("115");
        });
    });

    describe("vars-conditional-scoring", () => {
        test("Should handle conditional scoring logic", async () => {
            const context: TriggerContext = {
                event: "SCORING_EVENT",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            const scoringResult = results.find(r => r.ruleId === "vars-conditional-scoring");
            expect(scoringResult).toBeDefined();
            expect(scoringResult!.success).toBe(true);

            // Score is set to 85
            expect(StateManager.getInstance().get("score")).toBe(85);

            // Verify LOG action was executed
            const logAction = scoringResult!.executedActions.find(a => a.type === "LOG");
            expect(logAction).toBeDefined();
        });
    });

    describe("vars-increment-counter", () => {
        test("Should increment counter using STATE_INCREMENT", async () => {
            const context: TriggerContext = {
                event: "INCREMENT_EVENT",
                timestamp: Date.now(),
                data: {}
            };

            // First increment - starts at 0, then increments to 1
            let results = await engine.evaluateContext(context);
            let incrementResult = results.find(r => r.ruleId === "vars-increment-counter");
            expect(incrementResult).toBeDefined();
            // After first event: SET 0, then INCREMENT to 1
            expect(StateManager.getInstance().get("visitCount")).toBe(1);

            // Second increment - resets to 0, then increments to 1
            // (because the rule always does STATE_SET first)
            results = await engine.evaluateContext(context);
            incrementResult = results.find(r => r.ruleId === "vars-increment-counter");
            expect(StateManager.getInstance().get("visitCount")).toBe(1);

            // The rule resets counter each time, so it stays at 1
            results = await engine.evaluateContext(context);
            expect(StateManager.getInstance().get("visitCount")).toBe(1);
        });
    });

    describe("vars-state-lifecycle", () => {
        test("Should set, read, and delete state", async () => {
            const context: TriggerContext = {
                event: "LIFECYCLE_EVENT",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            const lifecycleResult = results.find(r => r.ruleId === "vars-state-lifecycle");
            expect(lifecycleResult).toBeDefined();
            expect(lifecycleResult!.success).toBe(true);

            // After lifecycle actions, state should be deleted
            expect(StateManager.getInstance().get("sessionId")).toBeUndefined();
            expect(StateManager.getInstance().get("sessionActive")).toBeUndefined();

            // Verify STATE_DELETE actions were executed
            const deleteActions = lifecycleResult!.executedActions.filter(a => a.type === "STATE_DELETE");
            expect(deleteActions).toHaveLength(2);
        });
    });

    describe("vars-complex-workflow", () => {
        test("Should execute complex workflow with conditional logic", async () => {
            const context: TriggerContext = {
                event: "WORKFLOW_EVENT",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            const workflowResult = results.find(r => r.ruleId === "vars-complex-workflow");
            expect(workflowResult).toBeDefined();
            expect(workflowResult!.success).toBe(true);

            // Verify state was set
            expect(StateManager.getInstance().get("step")).toBe(1);
            expect(StateManager.getInstance().get("maxSteps")).toBe(5);

            // Verify LOG actions were executed
            const logActions = workflowResult!.executedActions.filter(a => a.type === "LOG");
            expect(logActions.length).toBeGreaterThan(0);
        });
    });

    describe("vars-event-data", () => {
        test("Should combine event data with state variables for premium customer", async () => {
            const context: TriggerContext = {
                event: "ORDER_EVENT",
                timestamp: Date.now(),
                data: {
                    amount: 100,
                    tier: "premium"
                }
            };

            const results = await engine.evaluateContext(context);

            const orderResult = results.find(r => r.ruleId === "vars-event-data");
            expect(orderResult).toBeDefined();
            expect(orderResult!.success).toBe(true);

            // Verify state was set from event data (may be string or number)
            const orderAmount = StateManager.getInstance().get("orderAmount");
            expect(orderAmount === 100 || orderAmount === "100").toBe(true);
            
            expect(StateManager.getInstance().get("customerTier")).toBe("premium");
            expect(StateManager.getInstance().get("discount")).toBe(0.2);

            // Verify LOG actions
            const logActions = orderResult!.executedActions.filter(a => a.type === "LOG");
            expect(logActions.length).toBeGreaterThan(0);
            
            // Check for premium discount message
            const premiumLog = logActions.find(a => 
                (a.result as any)?.message?.includes("Premium")
            );
            expect(premiumLog).toBeDefined();
        });

        test("Should apply no discount for standard customer", async () => {
            // Clear state for this test
            StateManager.getInstance().clear();

            const context: TriggerContext = {
                event: "ORDER_EVENT",
                timestamp: Date.now(),
                data: {
                    amount: 100,
                    tier: "standard"
                }
            };

            const results = await engine.evaluateContext(context);

            const orderResult = results.find(r => r.ruleId === "vars-event-data");
            expect(orderResult).toBeDefined();
            expect(orderResult!.success).toBe(true);

            // Verify discount is 0 for standard customer
            expect(StateManager.getInstance().get("discount")).toBe(0.0);
            
            // Check for standard customer message
            const logActions = orderResult!.executedActions.filter(a => a.type === "LOG");
            const standardLog = logActions.find(a => 
                (a.result as any)?.message?.includes("Standard")
            );
            expect(standardLog).toBeDefined();
        });
    });

    describe("Variable interpolation in actions", () => {
        test("Should interpolate vars.currentCount in LOG message", async () => {
            const context: TriggerContext = {
                event: "TEST_EVENT",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            const basicResult = results.find(r => r.ruleId === "vars-basic-set-get");
            expect(basicResult).toBeDefined();

            // Find the LOG action and verify interpolation
            const logAction = basicResult!.executedActions.find(a => a.type === "LOG");
            expect(logAction).toBeDefined();
            
            // The message should contain the interpolated value "10"
            const message = (logAction!.result as any).message;
            expect(message).toContain("10");
        });
    });

    describe("STATE_GET stores in context.vars", () => {
        test("Should store retrieved state in context.vars for subsequent actions", async () => {
            // First set some state
            await StateManager.getInstance().set("testKey", "testValue");

            // Create a simple rule that uses STATE_GET
            const testEngine = new RuleEngine({
                rules: [{
                    id: "test-state-get-vars",
                    on: "GET_TEST",
                    do: {
                        mode: "SEQUENCE",
                        actions: [
                            { type: "STATE_GET", params: { key: "testKey", as: "myVar" } },
                            { type: "LOG", params: { message: "Value is: ${vars.myVar}" } }
                        ]
                    }
                }],
                globalSettings: {}
            });

            const context: TriggerContext = {
                event: "GET_TEST",
                timestamp: Date.now(),
                data: {}
            };

            const results = await testEngine.evaluateContext(context);
            expect(results).toHaveLength(1);
            expect(results[0]!.success).toBe(true);

            const logAction = results[0]!.executedActions.find(a => a.type === "LOG");
            expect(logAction).toBeDefined();
            expect((logAction!.result as any).message).toContain("testValue");
        });
    });

    describe("State persistence across events", () => {
        test("Should persist state between different event evaluations", async () => {
            // Set up a rule that sets state
            const testEngine = new RuleEngine({
                rules: [
                    {
                        id: "set-state",
                        on: "SET_EVENT",
                        do: { type: "STATE_SET", params: { key: "persistedValue", value: 42 } }
                    },
                    {
                        id: "read-state",
                        on: "READ_EVENT",
                        do: {
                            mode: "SEQUENCE",
                            actions: [
                                { type: "STATE_GET", params: { key: "persistedValue", as: "retrieved" } },
                                { type: "LOG", params: { message: "Retrieved: ${vars.retrieved}" } }
                            ]
                        }
                    }
                ],
                globalSettings: { evaluateAll: true }
            });

            // First event sets the state
            await testEngine.evaluateContext({
                event: "SET_EVENT",
                timestamp: Date.now(),
                data: {}
            });

            expect(StateManager.getInstance().get("persistedValue")).toBe(42);

            // Second event reads the state
            const results = await testEngine.evaluateContext({
                event: "READ_EVENT",
                timestamp: Date.now(),
                data: {}
            });

            const readResult = results.find(r => r.ruleId === "read-state");
            expect(readResult).toBeDefined();
            
            const logAction = readResult!.executedActions.find(a => a.type === "LOG");
            expect(logAction).toBeDefined();
            expect((logAction!.result as any).message).toContain("42");
        });
    });
});

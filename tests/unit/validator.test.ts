import { describe, expect, test } from "bun:test";
import { TriggerValidator } from "../../src/domain/validator";

describe("ArkType Validator Tests", () => {
    
    // --- Valid Rules ---
    
    test("Should validate a complete valid rule", () => {
        const ruleData = {
            id: "rule-1",
            name: "Basic Rule",
            description: "A simple rule for testing",
            priority: 10,
            enabled: true,
            cooldown: 500,
            tags: ["test", "demo"],
            on: "USER_LOGIN",
            if: {
                field: "data.username",
                operator: "EQ",
                value: "admin"
            },
            do: {
                type: "LOG",
                params: { message: "Admin logged in" }
            }
        };

        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.rule.id).toBe("rule-1");
            expect(result.rule.on).toBe("USER_LOGIN");
            expect(result.rule.priority).toBe(10);
        }
    });

    test("Should validate rule with ActionGroup and multiple conditions", () => {
        const ruleData = {
            id: "rule-complex",
            on: "PURCHASE",
            if: {
                operator: "AND",
                conditions: [
                    { field: "data.amount", operator: "GT", value: 100 },
                    { field: "data.currency", operator: "EQ", value: "USD" }
                ]
            },
            do: {
                mode: "SEQUENCE",
                actions: [
                    { type: "LOG", params: { msg: "High value" } },
                    { type: "EMAIL", params: { to: "sales@example.com" }, delay: 1000 }
                ]
            }
        };

        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(true);
    });

    test("Should validate array of actions shorthand", () => {
        const ruleData = {
            id: "rule-actions-array",
            on: "EVENT",
            do: [
                { type: "A" },
                { type: "B" }
            ]
        };
        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(true);
    });

    // --- Invalid Rules ---

    test("Should fail if ID is missing", () => {
        const ruleData = {
            on: "EVENT",
            do: { type: "LOG" }
        };
        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.issues.some(i => i.path === "id")).toBe(true);
        }
    });

    test("Should fail if 'on' is boolean true (YAML issue)", () => {
        const ruleData = {
            id: "yaml-error",
            on: true, // Simulate YAML boolean parsing
            do: { type: "LOG" }
        };
        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            const issue = result.issues.find(i => i.path === "on");
            expect(issue).toBeDefined();
            expect(issue!.suggestion).toContain("Quote it");
        }
    });

    test("Should fail if probability is out of range", () => {
        const ruleData = {
            id: "prob-fail",
            on: "E",
            do: {
                type: "LOG",
                probability: 1.5 // > 1
            }
        };
        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(false);
    });

    test("Should fail if recursive condition structure is wrong", () => {
        const ruleData = {
            id: "cond-fail",
            on: "E",
            if: {
                operator: "AND",
                conditions: [
                    { field: "x", operator: "BAD_OP", value: 1 } // BAD_OP
                ]
            },
            do: { type: "LOG" }
        };
        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(false);
    });

    test("Should fail if delay is negative", () => {
        const ruleData = {
            id: "delay-fail",
            on: "E",
            do: { type: "A", delay: -10 }
        };
        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(false);
    });

    test("Should fail if ID is empty", () => {
        const ruleData = {
            id: "",
            on: "E",
            do: { type: "A" }
        };
        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(false);
    });

    test("Should fail if priority is not integer", () => {
        const ruleData = {
            id: "priority-float",
            on: "E",
            priority: 10.5,
            do: { type: "A" }
        };
        const result = TriggerValidator.validate(ruleData);
        expect(result.valid).toBe(false);
    });
});

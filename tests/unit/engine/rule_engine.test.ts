
import { describe, expect, test } from "bun:test";
import { RuleEngine } from "../../../src/core/rule-engine";
import { ActionRegistry } from "../../../src/core/action-registry";
import type { TriggerRule, TriggerContext } from "../../../src/types";
import { ErrorMessages } from "../../../src/core/constants";

describe("Rule Engine Unit Tests", () => {

    // --- 1. Basic Matching & Event Filtering ---

    test("Should match event type correctly", async () => {
        const rule: TriggerRule = {
            id: "match-event",
            on: "CORRECT_EVENT",
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Match
        const resMatch = await engine.evaluateContext({
            event: "CORRECT_EVENT", id: "1", timestamp: Date.now(), data: {}
        });
        expect(resMatch).toHaveLength(1);

        // No Match
        const resNoMatch = await engine.evaluateContext({
            event: "WRONG_EVENT", id: "2", timestamp: Date.now(), data: {}
        });
        expect(resNoMatch).toHaveLength(0);
    });

    // --- 2. Strict Actions Mode (Robustness) ---
    /* Moved from improvements.test.ts */

    test("Strict Mode: Should return error for unknown actions", async () => {
        const rule: TriggerRule = {
            id: "strict_check",
            on: "TEST",
            do: { type: "UNKNOWN_ACTION" }
        };
        
        // Strict Mode ON
        const engineStrict = new RuleEngine({
            rules: [rule],
            globalSettings: { evaluateAll: true, strictActions: true }
        });

        const resStrict = await engineStrict.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: {}
        });
        expect(resStrict[0]!.executedActions[0]!.error).toContain(ErrorMessages.UNKNOWN_ACTION);

        // Strict Mode OFF (Default)
        const engineLoose = new RuleEngine({
            rules: [rule],
            globalSettings: { evaluateAll: true, strictActions: false }
        });
        const resLoose = await engineLoose.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: {}
        });
        // Should have result (warning) but no top-level error
        expect(resLoose[0]!.executedActions[0]).not.toHaveProperty('error');
    });

    // --- 3. Comparison Operators & Type Safety ---

    test("Safe Numeric Comparisons: Null check", async () => {
         const rule: TriggerRule = {
            id: "null-check",
            on: "TEST",
            if: { field: "data.val", operator: "GTE", value: 0 },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Null >= 0 should be false
        const resNull = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { val: null }
        });
        expect(resNull).toHaveLength(0);
        
        // 0 >= 0 should be true
        const resZero = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { val: 0 }
        });
        expect(resZero).toHaveLength(1);
    });

    test("Date Operators (SINCE/BEFORE)", async () => {
        const now = Date.now();
        const rule: TriggerRule = {
            id: "date-check",
            on: "TEST",
            if: [
                { field: "data.ts", operator: "SINCE", value: now - 1000 },
                { field: "data.ts", operator: "BEFORE", value: now + 1000 }
            ],
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        const res = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: now, data: { ts: now }
        });
        expect(res).toHaveLength(1);
    });

    // --- New String Operators ---

    test("NOT_CONTAINS: should match when string does not contain substring", async () => {
        const rule: TriggerRule = {
            id: "not-contains",
            on: "TEST",
            if: { field: "data.email", operator: "NOT_CONTAINS", value: "@spam.com" },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Should match (not spam)
        const resMatch = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { email: "user@example.com" }
        });
        expect(resMatch).toHaveLength(1);

        // Should not match (is spam)
        const resNoMatch = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { email: "user@spam.com" }
        });
        expect(resNoMatch).toHaveLength(0);
    });

    test("STARTS_WITH: should match when string starts with prefix", async () => {
        const rule: TriggerRule = {
            id: "starts-with",
            on: "TEST",
            if: { field: "data.url", operator: "STARTS_WITH", value: "https://" },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Should match
        const resMatch = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { url: "https://example.com" }
        });
        expect(resMatch).toHaveLength(1);

        // Should not match
        const resNoMatch = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { url: "http://example.com" }
        });
        expect(resNoMatch).toHaveLength(0);
    });

    test("ENDS_WITH: should match when string ends with suffix", async () => {
        const rule: TriggerRule = {
            id: "ends-with",
            on: "TEST",
            if: { field: "data.filename", operator: "ENDS_WITH", value: ".pdf" },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Should match
        const resMatch = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { filename: "document.pdf" }
        });
        expect(resMatch).toHaveLength(1);

        // Should not match
        const resNoMatch = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { filename: "document.docx" }
        });
        expect(resNoMatch).toHaveLength(0);
    });

    test("STARTS_WITH: should match when string starts with any of the array values", async () => {
        const rule: TriggerRule = {
            id: "starts-with-array",
            on: "TEST",
            if: { field: "data.content", operator: "STARTS_WITH", value: ["!ia", "!ai"] },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Should match - starts with !ia
        const resMatch1 = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { content: "!ia generate a story" }
        });
        expect(resMatch1).toHaveLength(1);

        // Should match - starts with !ai
        const resMatch2 = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { content: "!ai create image" }
        });
        expect(resMatch2).toHaveLength(1);

        // Should not match
        const resNoMatch = await engine.evaluateContext({
            event: "TEST", id: "3", timestamp: Date.now(), data: { content: "hello world" }
        });
        expect(resNoMatch).toHaveLength(0);
    });

    test("ENDS_WITH: should match when string ends with any of the array values", async () => {
        const rule: TriggerRule = {
            id: "ends-with-array",
            on: "TEST",
            if: { field: "data.filename", operator: "ENDS_WITH", value: [".pdf", ".doc"] },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Should match - ends with .pdf
        const resMatch1 = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { filename: "document.pdf" }
        });
        expect(resMatch1).toHaveLength(1);

        // Should match - ends with .doc
        const resMatch2 = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { filename: "report.doc" }
        });
        expect(resMatch2).toHaveLength(1);

        // Should not match
        const resNoMatch = await engine.evaluateContext({
            event: "TEST", id: "3", timestamp: Date.now(), data: { filename: "image.png" }
        });
        expect(resNoMatch).toHaveLength(0);
    });

    test("CONTAINS: should match when string contains any of the array values", async () => {
        const rule: TriggerRule = {
            id: "contains-array",
            on: "TEST",
            if: { field: "data.message", operator: "CONTAINS", value: ["hello", "hi"] },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Should match - contains hello
        const resMatch1 = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { message: "say hello to everyone" }
        });
        expect(resMatch1).toHaveLength(1);

        // Should match - contains hi
        const resMatch2 = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { message: "hi there!" }
        });
        expect(resMatch2).toHaveLength(1);

        // Should not match
        const resNoMatch = await engine.evaluateContext({
            event: "TEST", id: "3", timestamp: Date.now(), data: { message: "goodbye" }
        });
        expect(resNoMatch).toHaveLength(0);
    });

    test("NOT_CONTAINS: should match when string does not contain any of the array values", async () => {
        const rule: TriggerRule = {
            id: "not-contains-array",
            on: "TEST",
            if: { field: "data.email", operator: "NOT_CONTAINS", value: ["@spam.com", "@ads.com"] },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Should match - doesn't contain any spam domains
        const resMatch = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { email: "user@example.com" }
        });
        expect(resMatch).toHaveLength(1);

        // Should not match - contains spam domain
        const resNoMatch1 = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { email: "user@spam.com" }
        });
        expect(resNoMatch1).toHaveLength(0);

        // Should not match - contains ads domain
        const resNoMatch2 = await engine.evaluateContext({
            event: "TEST", id: "3", timestamp: Date.now(), data: { email: "user@ads.com" }
        });
        expect(resNoMatch2).toHaveLength(0);
    });

    test("IS_EMPTY: should match empty values", async () => {
        const rule: TriggerRule = {
            id: "is-empty",
            on: "TEST",
            if: { field: "data.notes", operator: "IS_EMPTY" },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Empty string
        const resEmptyStr = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { notes: "" }
        });
        expect(resEmptyStr).toHaveLength(1);

        // Empty array
        const resEmptyArr = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { notes: [] }
        });
        expect(resEmptyArr).toHaveLength(1);

        // Null
        const resNull = await engine.evaluateContext({
            event: "TEST", id: "3", timestamp: Date.now(), data: { notes: null }
        });
        expect(resNull).toHaveLength(1);

        // Non-empty string (should not match)
        const resNotEmpty = await engine.evaluateContext({
            event: "TEST", id: "4", timestamp: Date.now(), data: { notes: "some text" }
        });
        expect(resNotEmpty).toHaveLength(0);
    });

    test("IS_NULL: should match null or undefined values", async () => {
        const rule: TriggerRule = {
            id: "is-null",
            on: "TEST",
            if: { field: "data.deletedAt", operator: "IS_NULL" },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Null should match
        const resNull = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { deletedAt: null }
        });
        expect(resNull).toHaveLength(1);

        // Undefined should match (field not present)
        const resUndefined = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: {}
        });
        expect(resUndefined).toHaveLength(1);

        // Has value (should not match)
        const resHasValue = await engine.evaluateContext({
            event: "TEST", id: "3", timestamp: Date.now(), data: { deletedAt: Date.now() }
        });
        expect(resHasValue).toHaveLength(0);
    });

    test("HAS_KEY: should match when object has specified key", async () => {
        const rule: TriggerRule = {
            id: "has-key",
            on: "TEST",
            if: { field: "data.user", operator: "HAS_KEY", value: "role" },
            do: { type: "LOG" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });

        // Has key
        const resHasKey = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: { user: { name: "John", role: "admin" } }
        });
        expect(resHasKey).toHaveLength(1);

        // Does not have key
        const resNoKey = await engine.evaluateContext({
            event: "TEST", id: "2", timestamp: Date.now(), data: { user: { name: "John" } }
        });
        expect(resNoKey).toHaveLength(0);

        // Not an object
        const resNotObject = await engine.evaluateContext({
            event: "TEST", id: "3", timestamp: Date.now(), data: { user: "string" }
        });
        expect(resNotObject).toHaveLength(0);
    });

    // --- 4. Action Groups & Execution Modes ---

    test("Should execute EITHER action randomly", async () => {
        // Mock Math.random to pick second item (0.5+ -> index 1)
        // But logic is Math.floor(random * length). If length 2:
        // 0.0-0.49 -> 0
        // 0.5-0.99 -> 1
        
        // Simply run multiple times and ensure we get only 1 action per run
        const rule: TriggerRule = {
            id: "random-group",
            on: "TEST",
            do: {
                mode: "EITHER",
                actions: [
                    { type: "A" },
                    { type: "B" }
                ]
            }
        };
        
        // Mock registry
        const reg = ActionRegistry.getInstance();
        reg.register("A", () => "A");
        reg.register("B", () => "B");

        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });
        const res = await engine.evaluateContext({
            event: "TEST", id: "1", timestamp: Date.now(), data: {}
        });
        
        expect(res).toHaveLength(1);
        expect(res[0]!.executedActions).toHaveLength(1); // Only 1 executed
        const type = res[0]!.executedActions[0]!.type;
        expect(["A", "B"]).toContain(type);
    });

    // --- 5. Cooldowns ---

    test("Should respect rule cooldown", async () => {
        const rule: TriggerRule = {
            id: "cd-rule",
            on: "TEST",
            cooldown: 50, // 50ms
            do: { type: "A" }
        };
        const engine = new RuleEngine({ rules: [rule], globalSettings: { evaluateAll: true } });
        const ctx = { event: "TEST", id: "1", timestamp: Date.now(), data: {} };

        // 1st run: Success
        const res1 = await engine.evaluateContext(ctx);
        expect(res1).toHaveLength(1);

        // 2nd run: Immediate -> Fail (Cooldown)
        const res2 = await engine.evaluateContext(ctx);
        expect(res2).toHaveLength(0);

        // Wait -> Success
        await new Promise(r => setTimeout(r, 60));
        const res3 = await engine.evaluateContext(ctx);
        expect(res3).toHaveLength(1);
    });
});

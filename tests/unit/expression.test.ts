
import { describe, expect, test } from "bun:test";
import { ExpressionEngine } from "../../src/core/expression-engine";
import type { TriggerContext } from "../../src/types";

describe("Expression Engine Unit Tests", () => {
    
    // --- 1. Basic Interpolation & Access ---
    /* Covered by ExpressionEngine.getNestedValue and interpolate */

    test("Should interpolate simple variables", () => {
        const context = {
            event: "test",
            timestamp: 123456789,
            data: { name: "Alice" }
        } as any;
        
        const result = ExpressionEngine.interpolate("Hello ${data.name}", context);
        expect(result).toBe("Hello Alice");
    });

    test("Should access deeply nested properties", () => {
        const context = {
            data: { user: { profile: { age: 30 } } }
        } as any;
        
        const val = ExpressionEngine.getNestedValue("data.user.profile.age", context);
        expect(val).toBe(30);
    });

    test("Should return undefined for missing paths", () => {
        const context = { data: {} } as any;
        const val = ExpressionEngine.getNestedValue("data.user.missing", context);
        expect(val).toBeUndefined();
    });

    // --- 2. Robustness & Null Handling ---
    /* Merged from expression_robustness.test.ts */

    test("Should handle null/undefined data safely in interpolation", () => {
        const context: TriggerContext = {
            event: "TEST",
            timestamp: Date.now(),
            data: { user: null } 
        };
        const result = ExpressionEngine.interpolate("Hello ${data.user}", context);
        expect(result).toBe("Hello undefined");
    });

    test("Should handle deeply nested missing data without crashing", () => {
        const context: TriggerContext = {
            event: "TEST",
            timestamp: Date.now(),
            data: {} // Empty
        };
        const result = ExpressionEngine.interpolate("Hello ${data.user.name}", context);
        expect(result).toBe("Hello undefined");
    });

    test("Should support default values using || syntax", () => {
         const context: TriggerContext = {
            event: "TEST",
            timestamp: Date.now(),
            data: { existing: "Values" }
        };
        
        // This relies on the engine's capability to evaluate the inner expression as JS
        // if simple lookup fails or if explicit structure allows it.
        const result = ExpressionEngine.interpolate("${data.existing || 'Default'}", context);
        expect(result).toBe("Values");
        
        const result2 = ExpressionEngine.interpolate("${data.missing || 'Default'}", context);
        expect(result2).toBe("Default");
    });

    // --- 3. Math & Logic Evaluation ---

    test("Should evaluate expressions with math", () => {
        const context = {
            event: "test",
            timestamp: 0,
            data: { a: 10, b: 5 }
        } as any;

        const result = ExpressionEngine.evaluate("data.a + data.b", context);
        expect(result).toBe(15);
    });

    test("Should handle Math functions", () => {
        const context = { data: { val: 16 } } as any;
        const result = ExpressionEngine.evaluate("Math.sqrt(data.val)", context);
        expect(result).toBe(4);
    });

    test("Should safely return NaN for invalid math operations", () => {
        const result = ExpressionEngine.evaluate("10 / 'apple'", {} as any);
        expect(result).toBeNaN();
    });
    
    // --- 4. Advanced Cases ---

    test("Should handle arrays in evaluation", () => {
         const context = { data: { tags: ["a", "b"] } } as any;
         // e.g. checking length
         const result = ExpressionEngine.evaluate("data.tags.length", context);
         expect(result).toBe(2);
    });
});


import { describe, expect, test } from "bun:test";
import { getDiagnosticsForText } from "../../src/lsp/diagnostics";

describe("LSP Diagnostics", () => {
    
    test("Should report nothing for valid YAML with valid rule", async () => {
        const yaml = `
id: test-rule
on: TEST_EVENT
do: { type: "log" }
        `;
        const diag = await getDiagnosticsForText(yaml);
        expect(diag).toHaveLength(0);
    });

    test("Should report syntax error for invalid YAML", async () => {
        const yaml = `
id: test-rule
on: TEST_EVENT
do: { type: "log" 
# Missing closing brace
        `;
        const diag = await getDiagnosticsForText(yaml);
        expect(diag.length).toBeGreaterThan(0);
        // YAML parser error might be generic like "Unexpected token" or specific
        expect(diag[0]!.message.length).toBeGreaterThan(0);
    });

    test("Should report validation error for missing required field", async () => {
        const yaml = `
id: test-rule
# Missing 'on'
do: { type: "log" }
        `;
        const diag = await getDiagnosticsForText(yaml);
        expect(diag.length).toBeGreaterThan(0);
        expect(diag[0]!.message).toContain("must be a string");
        expect(diag[0]!.message).toContain("on");
    });
    
    test("Should locate error range correctly (CST check)", async () => {
        const yaml = `
id: test-rule
on: TEST_EVENT
do:
  type: log
  probability: 5 
# Probability must be <= 1
        `;
        const diag = await getDiagnosticsForText(yaml);
        expect(diag.length).toBeGreaterThan(0);
        
        // Probability error
        const probError = diag.find(d => d.message.includes("probability"));
        expect(probError).toBeDefined();
        // Check line number (0-indexed). "probability: 5" is on line 5 (index 4)
        expect(probError?.range.start.line).toBe(4); 
    });
});

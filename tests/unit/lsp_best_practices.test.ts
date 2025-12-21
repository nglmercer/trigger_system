import { describe, test, expect } from "bun:test";
import { getDiagnosticsForText } from "../../src/lsp/diagnostics";

describe("LSP Best Practices Hints", () => {
    test("Should suggest list format for multi-document YAML", async () => {
        const multiDocYaml = `id: rule-1
on: EVENT_A
do:
  type: LOG
  
---
id: rule-2
on: EVENT_B
do:
  type: LOG`;

        const diagnostics = await getDiagnosticsForText(multiDocYaml);
        
        // Should have at least one info diagnostic about multi-document
        const hint = diagnostics.find(d => 
            d.source === 'trigger-best-practices' && 
            d.message.includes('Multi-document YAML')
        );
        
        expect(hint).toBeDefined();
        expect(hint?.severity).toBe(3); // DiagnosticSeverity.Information
        expect(hint?.message).toContain('list format');
    });

    test("Should NOT show hint for list format YAML", async () => {
        const listYaml = `- id: rule-1
  on: EVENT_A
  do:
    type: LOG
    
- id: rule-2
  on: EVENT_B
  do:
    type: LOG`;

        const diagnostics = await getDiagnosticsForText(listYaml);
        
        // Should NOT have best-practices diagnostic
        const hint = diagnostics.find(d => d.source === 'trigger-best-practices');
        
        expect(hint).toBeUndefined();
    });

    test("Should NOT show hint for single rule (no multi-document)", async () => {
        const singleYaml = `id: rule-1
on: EVENT_A
do:
  type: LOG`;

        const diagnostics = await getDiagnosticsForText(singleYaml);
        
        // Should NOT have best-practices diagnostic
        const hint = diagnostics.find(d => d.source === 'trigger-best-practices');
        
        expect(hint).toBeUndefined();
    });
    
    test("Should ignore initial --- document marker", async () => {
        const yamlWithInitialMarker = `---
id: rule-1
on: EVENT_A
do:
  type: LOG`;

        const diagnostics = await getDiagnosticsForText(yamlWithInitialMarker);
        
        // Should NOT have best-practices diagnostic (it's just one document with initial marker)
        const hint = diagnostics.find(d => d.source === 'trigger-best-practices');
        
        expect(hint).toBeUndefined();
    });
});

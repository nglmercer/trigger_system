/**
 * Test for multi-rule file management
 * Verifies that multiple rules from the same file are grouped correctly
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { RuleRegistry, RulePersistence } from "../../../src/io/loader";
import * as path from "path";
import * as fs from "fs";

describe("Multi-Rule File Management", () => {
    let registry: RuleRegistry;
    const rulesDir = path.resolve(import.meta.dir, "../../rules");
    const multiRuleFile = path.join(rulesDir, "multi-rules-example.yaml");

    beforeEach(() => {
        registry = new RuleRegistry();
    });

    test("Should load multiple rules from a single file", async () => {
        // Load rules from the multi-rule file
        const loadedRules = await RulePersistence.loadFile(multiRuleFile);
        
        // Verify we loaded multiple rules
        expect(loadedRules.length).toBeGreaterThan(1);
        console.log(`Loaded ${loadedRules.length} rules from multi-rule file`);
        
        // Verify each rule has an ID
        loadedRules.forEach(rule => {
            expect(rule.id).toBeDefined();
        });
    });

    test("Should group rules by source file when registering", async () => {
        // Load rules from the multi-rule file
        const loadedRules = await RulePersistence.loadFile(multiRuleFile);
        
        // Register rules with the source file path
        registry.registerAll(loadedRules, multiRuleFile);
        
        // Verify file entry exists
        const fileEntry = registry.getFileEntry(multiRuleFile);
        expect(fileEntry).toBeDefined();
        expect(fileEntry!.filePath).toBe(multiRuleFile);
        
        // Verify all rules are in the same file entry
        expect(fileEntry!.rules.length).toBe(loadedRules.length);
        
        // Verify it's marked as a multi-rule file
        expect(registry.isMultiRuleFile(multiRuleFile)).toBe(true);
        
        console.log(`File entry has ${fileEntry!.rules.length} rules`);
        console.log(`Rule IDs: ${fileEntry!.rules.map(r => r.id).join(", ")}`);
    });

    test("Should track each rule's file path correctly", async () => {
        // Load rules from the multi-rule file
        const loadedRules = await RulePersistence.loadFile(multiRuleFile);
        
        // Register rules with the source file path
        registry.registerAll(loadedRules, multiRuleFile);
        
        // Verify each rule's file path is set correctly
        for (const rule of loadedRules) {
            const entry = registry.getEntry(rule.id!);
            expect(entry).toBeDefined();
            expect(entry!.filePath).toBe(multiRuleFile);
            console.log(`Rule ${rule.id} has file path: ${entry!.filePath}`);
        }
    });

    test("Should update rule and track file modification", async () => {
        // Load and register rules
        const loadedRules = await RulePersistence.loadFile(multiRuleFile);
        registry.registerAll(loadedRules, multiRuleFile);
        
        // Update a rule
        expect(loadedRules.length).toBeGreaterThan(0);
        const ruleToUpdate = loadedRules[0]!;
        expect(ruleToUpdate.id).toBeDefined();
        
        const updatedRule = registry.update(ruleToUpdate.id!, {
            name: "Updated Name",
            enabled: false
        });
        
        expect(updatedRule.name).toBe("Updated Name");
        expect(updatedRule.enabled).toBe(false);
        
        // Verify the rule entry is marked as modified
        const entry = registry.getEntry(ruleToUpdate.id!);
        expect(entry).toBeDefined();
        expect(entry!.modified).toBe(true);
        
        console.log(`Updated rule: ${updatedRule.id}`);
    });

    test("Should get all rules from a specific file", async () => {
        // Load and register rules
        const loadedRules = await RulePersistence.loadFile(multiRuleFile);
        registry.registerAll(loadedRules, multiRuleFile);
        
        // Get all rules from the file
        const rulesInFile = registry.getRulesByFile(multiRuleFile);
        
        expect(rulesInFile.length).toBe(loadedRules.length);
        expect(rulesInFile.length).toBeGreaterThan(1);
        
        console.log(`Retrieved ${rulesInFile.length} rules from file`);
    });

    test("Should save all rules from a multi-rule file", async () => {
        // Load and register rules
        const loadedRules = await RulePersistence.loadFile(multiRuleFile);
        registry.registerAll(loadedRules, multiRuleFile);
        
        // Update a rule
        expect(loadedRules.length).toBeGreaterThan(0);
        const firstRule = loadedRules[0]!;
        expect(firstRule.id).toBeDefined();
        registry.update(firstRule.id!, { name: "Modified" });
        
        // Get all rules from the file
        const rulesToSave = registry.getRulesByFile(multiRuleFile);
        
        // Save to a temporary file
        const tempFile = path.join(rulesDir, "temp-multi-rule-test.yaml");
        await RulePersistence.saveRulesToFile(rulesToSave, tempFile);
        
        // Verify the file was created
        expect(fs.existsSync(tempFile)).toBe(true);
        
        // Load the saved file and verify it has all rules
        const savedRules = await RulePersistence.loadFile(tempFile);
        expect(savedRules.length).toBe(rulesToSave.length);
        
        // Cleanup
        fs.unlinkSync(tempFile);
        
        console.log(`Saved and verified ${savedRules.length} rules`);
    });

    test("Should handle rules without source file path", async () => {
        // Create rules without a source file
        const rules = [
            {
                id: "rule-1",
                name: "Rule 1",
                on: "event1",
                do: [{ type: "log", params: { message: "test" } }]
            },
            {
                id: "rule-2",
                name: "Rule 2",
                on: "event2",
                do: [{ type: "log", params: { message: "test" } }]
            }
        ];
        
        // Register without source file path
        registry.registerAll(rules);
        
        // Verify rules are registered
        expect(registry.size()).toBe(2);
        expect(registry.has("rule-1")).toBe(true);
        expect(registry.has("rule-2")).toBe(true);
        
        // Verify no file entry is created
        expect(registry.fileCount()).toBe(0);
        
        console.log("Rules registered without file path");
    });

    test("Should merge rules when registering to existing file", async () => {
        // Load initial rules
        const initialRules = await RulePersistence.loadFile(multiRuleFile);
        registry.registerAll(initialRules, multiRuleFile);
        
        // Create a new rule to add to the same file
        const newRule = {
            id: "new-rule",
            name: "New Rule",
            on: "new.event",
            do: [{ type: "log", params: { message: "new" } }]
        };
        
        // Register the new rule to the same file
        registry.registerAll([newRule], multiRuleFile);
        
        // Verify the file now has all rules
        const fileEntry = registry.getFileEntry(multiRuleFile);
        expect(fileEntry!.rules.length).toBe(initialRules.length + 1);
        
        // Verify the new rule is in the registry
        expect(registry.has("new-rule")).toBe(true);
        
        console.log(`File now has ${fileEntry!.rules.length} rules after merge`);
    });
});
import { describe, expect, test, beforeAll } from "bun:test";
import { TriggerLoader } from "../../src/io/loader.node";
import * as path from "path";

describe("TriggerLoader Error Handling", () => {
    const incorrectDir = path.join(import.meta.dir, "../incorrect");

    test("Should correctly identify and reject invalid schema rules", async () => {
        const filePath = path.join(incorrectDir, "invalid_schema.yaml");
        const rules = await TriggerLoader.loadRule(filePath);
        
        // All rules in this file are invalid, so expecting 0 valid rules returned
        expect(rules).toHaveLength(0);
    });

    test("Should reject rules with invalid data types", async () => {
        const filePath = path.join(incorrectDir, "invalid_types.yaml");
        const rules = await TriggerLoader.loadRule(filePath);
        
        expect(rules).toHaveLength(0);
    });

    test("Should throw/fail gracefully on bad YAML syntax", async () => {
        const filePath = path.join(incorrectDir, "bad_syntax.yaml");
        let error;
        try {
            await TriggerLoader.loadRule(filePath);
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
    });

    test("loadRulesFromDir should skip invalid files but load valid ones (if any)", async () => {
        // This directory only contains bad files
        const rules = await TriggerLoader.loadRulesFromDir(incorrectDir);
        expect(rules).toHaveLength(0);
    });
});

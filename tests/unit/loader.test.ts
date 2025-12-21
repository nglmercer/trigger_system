
import { describe, expect, test } from "bun:test";
import { TriggerLoader } from "../../src/io/loader.node";
import * as path from "path";
import * as fs from "fs";

describe("TriggerLoader Unit Test", () => {
    
    test("Should load rules from directory", async () => {
        const rulesDir = path.resolve(import.meta.dir, "../rules");
        console.log("Checking dir:", rulesDir);
        
        if (!fs.existsSync(rulesDir)) {
            throw new Error(`Rules dir does not exist: ${rulesDir}`);
        }

        const samplePath = path.resolve(rulesDir, "examples/sample.yaml");
        console.log("Loading specific file:", samplePath);
        const specificRules = await TriggerLoader.loadRule(samplePath);
        console.log("Specific Loaded:", specificRules.length);
        expect(specificRules.length).toBeGreaterThan(0);

        const rules = await TriggerLoader.loadRulesFromDir(rulesDir);
        console.log("Loaded rules:", rules.length);
        
        expect(rules.length).toBeGreaterThan(0);
        
        const ruleIds = rules.map(r => r.id);
        console.log("Rule IDs:", ruleIds);
        expect(ruleIds).toContain("admin-login");
    });
});

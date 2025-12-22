
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

    test("Should watch for changes", async () => {
        const tempDir = path.resolve(import.meta.dir, "temp_watch_test");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        try {
            let updateCount = 0;
            let loadedRules: any[] = [];

            // Helper to wait for update
            const waitForUpdate = () => new Promise<void>(resolve => {
                const check = setInterval(() => {
                    if (updateCount > 0) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
            });

            const watcher = TriggerLoader.watchRules(tempDir, (rules) => {
                console.log("Watcher callback triggered with", rules.length, "rules");
                loadedRules = rules;
                updateCount++;
            });

            // 1. Add a file
            const rule1 = `
id: "watch-rule-1"
on: "TEST"
do:
  type: "log"
`;
            updateCount = 0;
            console.log("Writing rule file...");
            fs.writeFileSync(path.join(tempDir, "rule.yaml"), rule1);
            
            // Wait for watcher (give it 2s max)
            const start = Date.now();
            while(updateCount === 0 && Date.now() - start < 2000) {
                await new Promise(r => setTimeout(r, 100));
            }

            expect(updateCount).toBeGreaterThan(0);
            expect(loadedRules.length).toBe(1);
            expect(loadedRules[0].id).toBe("watch-rule-1");

            watcher.close();

        } finally {
            // Cleanup
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        }
    });
});

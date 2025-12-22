
import { TriggerLoader } from "../src/io/loader.node";
import { RuleEngine } from "../src/core/rule-engine";
import * as fs from "fs";
import * as path from "path";

/**
 * Example 2.4: TriggerLoader Watch Mode
 * 
 * Demonstrates how to specificially use the Node.js TriggerLoader
 * to watch a directory for changes and automatically reload rules.
 */
async function main() {
    console.log("🎬 Starting Loader Watch Example...");

    // 1. Setup a temporary rules directory
    const tempRulesDir = path.resolve(process.cwd(), "temp_rules_watch");
    if (fs.existsSync(tempRulesDir)) {
        fs.rmSync(tempRulesDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempRulesDir);
    console.log(`📂 Created temp directory: ${tempRulesDir}`);

    // 2. Initialize Engine
    const engine = new RuleEngine({ rules: [], globalSettings: { debugMode: true } });
    console.log("⚙️  Engine initialized (empty)");

    // 3. Start Watching
    console.log("👀 Starting watcher...");
    
    // TriggerLoader.watchRules returns a FSWatcher (or undefined if failed)
    // The callback receives the FRESH list of all rules in the directory
    const watcher = TriggerLoader.watchRules(tempRulesDir, (newRules) => {
        console.log(`\n🔔 [Wait Callback] Rules Updated! Count: ${newRules.length}`);
        
        // Update the engine with new rules
        engine.updateRules(newRules);
        
        // Log current rules
        const ruleIds = engine.getRules().map(r => r.id);
        console.log(`   Current Rule IDs: ${ruleIds.join(", ")}`);
    });

    // 4. Create a new rule file
    console.log("\n📝 Writing 'rule1.yaml'...");
    const rule1 = `
id: "rule-1"
on: "TEST_EVENT"
do:
  type: "log"
  params:
    message: "Rule 1 Triggered"
`;
    fs.writeFileSync(path.join(tempRulesDir, "rule1.yaml"), rule1);

    // Give watcher a moment to pick it up
    await new Promise(r => setTimeout(r, 1000));

    // 5. Modify the rule file
    console.log("\n📝 Modifying 'rule1.yaml' (adding rule-2)...");
    const rule2 = `
- id: "rule-1"
  on: "TEST_EVENT"
  do:
    type: "log"
    params:
      message: "Rule 1 Triggered"

- id: "rule-2"
  on: "TEST_EVENT"
  do:
    type: "log"
    params:
      message: "Rule 2 Triggered"
`;
    fs.writeFileSync(path.join(tempRulesDir, "rule1.yaml"), rule2);

    // Give watcher a moment
    await new Promise(r => setTimeout(r, 1000));

    // 6. Test execution
    console.log("\n🔥 Firing TEST_EVENT...");
    await engine.processEvent("TEST_EVENT", {});

    // Cleanup
    console.log("\n🧹 Cleanup...");
    watcher.close();
    fs.rmSync(tempRulesDir, { recursive: true, force: true });
    console.log("✨ Done.");
}

main().catch(console.error);

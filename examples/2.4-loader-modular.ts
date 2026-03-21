/**
 * Example 2.4: Modular Loader Usage
 *
 * Demonstrates how to use the modular classes (RuleRegistry, RulePersistence,
 * RuleQuery, RuleWatcher) for full CRUD operations on rules.
 *
 * This example shows:
 * - Using default paths
 * - Adding, updating, deleting rules in memory
 * - Saving changes to files
 * - Querying rules by various criteria
 * - Watching for file changes
 * - **NEW: Managing multiple rules per file**
 */

import { RuleRegistry, RulePersistence, RuleQuery, RuleWatcher } from "../src/io/loader";
import type { TriggerRule } from "../src/types";
import * as path from "path";

async function main() {
    console.log("🎬 Starting Modular Loader Example...\n");

    // 1. Initialize Registry with default directory
    const registry = new RuleRegistry();
    const defaultDir = registry.getDefaultDir();
    console.log(`📂 Default rules directory: ${defaultDir}\n`);

    // ============================================================================
    // PART 1: Load and manage rules from a multi-rule file
    // ============================================================================
    console.log("📄 PART 1: Loading rules from multi-rule file...\n");

    const multiRuleFile = path.join(defaultDir, "multi-rules-example.yaml");
    
    // Load all rules from the multi-rule file
    console.log(`   Loading rules from: ${multiRuleFile}`);
    const loadedRules = await RulePersistence.loadFile(multiRuleFile);
    console.log(`   Loaded ${loadedRules.length} rules from file`);
    
    // Register all rules - pass the actual source file path so they're grouped correctly
    registry.registerAll(loadedRules, multiRuleFile);
    
    // Show file grouping
    console.log("\n   📁 File grouping:");
    const fileEntry = registry.getFileEntry(multiRuleFile);
    if (fileEntry) {
        console.log(`   File: ${fileEntry.filePath}`);
        console.log(`   Rules in file: ${fileEntry.rules.length}`);
        console.log(`   Rule IDs: ${fileEntry.rules.map(r => r.id).join(", ")}`);
        console.log(`   Is multi-rule file: ${registry.isMultiRuleFile(multiRuleFile)}`);
    }

    // ============================================================================
    // PART 2: CRUD Operations with multi-rule file awareness
    // ============================================================================
    console.log("\n✏️  PART 2: CRUD Operations (file-aware):\n");

    // UPDATE - Modify a rule in the multi-rule file
    console.log("   [UPDATE] Modifying rule in multi-rule file...");
    const updated = registry.update("user-login", {
        name: "User Login Rule (Updated)",
        enabled: false
    });
    console.log(`   Updated rule: ${updated.id}`);
    console.log(`   New name: ${updated.name}`);
    console.log(`   Enabled: ${updated.enabled}`);

    // Check if file is modified
    const modifiedFile = registry.getFileEntry(multiRuleFile);
    console.log(`   File modified: ${modifiedFile?.modified}`);

    // SAVE - Save ALL rules from the file (not just the modified one)
    console.log("\n   [SAVE] Saving all rules from multi-rule file...");
    const rulesToSave = registry.getRulesByFile(multiRuleFile);
    console.log(`   Saving ${rulesToSave.length} rules to file`);
    await RulePersistence.saveRulesToFile(rulesToSave, multiRuleFile);
    registry.markFileAsSaved(multiRuleFile);
    console.log(`   Saved to: ${multiRuleFile}`);

    // ADD - Add a new rule to the registry (separate file)
    console.log("\n   [ADD] Creating new rule (separate file)...");
    const newRule: TriggerRule = {
        id: "new-notification",
        name: "New Notification Rule",
        on: "notification.new",
        enabled: true,
        tags: ["notification"],
        do: [{ type: "log", params: { message: "New notification" } }]
    };
    registry.add(newRule);
    console.log(`   Added rule: ${newRule.id}`);
    console.log(`   Total rules: ${registry.size()}`);
    console.log(`   Total files: ${registry.fileCount()}`);

    // DELETE - Remove a rule from multi-rule file
    console.log("\n   [DELETE] Removing rule from multi-rule file...");
    const removed = registry.remove("admin-action");
    console.log(`   Removed rule: admin-action (success: ${removed})`);
    
    // Save updated file after deletion
    const remainingRules = registry.getRulesByFile(multiRuleFile);
    if (remainingRules.length > 0) {
        await RulePersistence.saveRulesToFile(remainingRules, multiRuleFile);
        registry.markFileAsSaved(multiRuleFile);
        console.log(`   Updated file with ${remainingRules.length} rules`);
    }

    // ============================================================================
    // PART 3: Query examples using RuleQuery
    // ============================================================================
    console.log("\n🔍 PART 3: Query Examples:\n");
    
    // Find by tag
    const authRules = RuleQuery.findByTag(registry.values(), "auth");
    console.log(`   Rules with tag 'auth': ${authRules.map(r => r.id).join(", ")}`);

    // Find by event
    const loginRules = RuleQuery.findByEvent(registry.values(), "user.login");
    console.log(`   Rules for event 'user.login': ${loginRules.map(r => r.id).join(", ")}`);

    // Find by name (partial match)
    const logoutRules = RuleQuery.findByName(registry.values(), "logout");
    console.log(`   Rules with 'logout' in name: ${logoutRules.map(r => r.id).join(", ")}`);
    
    // Group by tag
    const byTag = RuleQuery.groupByTag(registry.values());
    console.log(`   Rules grouped by tag: ${Array.from(byTag.keys()).join(", ")}`);

    // Group by event
    const byEvent = RuleQuery.groupByEvent(registry.values());
    console.log(`   Rules grouped by event: ${Array.from(byEvent.keys()).join(", ")}`);

    // ============================================================================
    // PART 4: File-aware operations
    // ============================================================================
    console.log("\n📁 PART 4: File-aware Operations:\n");

    // Show all file entries
    console.log("   All file entries:");
    for (const fileEntry of registry.fileEntries()) {
        console.log(`   - ${fileEntry.filePath}`);
        console.log(`     Rules: ${fileEntry.rules.length}`);
        console.log(`     Modified: ${fileEntry.modified}`);
        console.log(`     Rule IDs: ${fileEntry.rules.map(r => r.id).join(", ")}`);
    }

    // Show rules by file
    console.log("\n   Rules by file:");
    for (const fileEntry of registry.fileEntries()) {
        const rules = registry.getRulesByFile(fileEntry.filePath);
        console.log(`   ${fileEntry.filePath}: ${rules.map(r => r.id).join(", ")}`);
    }

    // ============================================================================
    // PART 5: Final state
    // ============================================================================
    console.log("\n📊 PART 5: Final Registry State:\n");
    console.log(`   Total rules: ${registry.size()}`);
    console.log(`   Total files: ${registry.fileCount()}`);
    console.log(`   Default dir: ${registry.getDefaultDir()}`);
    console.log(`   Has modified: ${registry.hasModified()}`);
    
    console.log("\n   Rules:");
    for (const rule of registry.getAll()) {
        const entry = registry.getEntry(rule.id!);
        const filePath = entry?.filePath || "N/A";
        const isMulti = filePath !== "N/A" && registry.isMultiRuleFile(filePath);
        console.log(`   - ${rule.id}: ${rule.name}`);
        console.log(`     enabled: ${rule.enabled}`);
        console.log(`     file: ${filePath}`);
        console.log(`     multi-rule file: ${isMulti}`);
    }

    // ============================================================================
    // PART 6: Watch for changes using RuleWatcher
    // ============================================================================
    console.log("\n👀 PART 6: Starting file watcher...");
    const watcher = new RuleWatcher();
    
    watcher.start(
        registry.getDefaultDir(),
        RulePersistence.loadFromDir,
        (rules) => {
            console.log(`\n   🔔 File change detected! Rules: ${rules.length}`);
        }
    );

    console.log(`   Watching: ${watcher.getWatchPath()}`);
    console.log(`   Is watching: ${watcher.isWatching()}`);

    // Wait a bit then stop
    await new Promise(r => setTimeout(r, 2000));

    // ============================================================================
    // PART 7: Cleanup
    // ============================================================================
    console.log("\n🧹 PART 7: Cleanup...");
    watcher.stop();
    console.log(`   Is watching after stop: ${watcher.isWatching()}`);
    console.log("\n✨ Done.");
}

main().catch(console.error);

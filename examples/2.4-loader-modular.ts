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
 */

import { RuleRegistry, RulePersistence, RuleQuery, RuleWatcher } from "../src/io/loader";
import type { TriggerRule } from "../src/types";

async function main() {
    console.log("🎬 Starting Modular Loader Example...\n");

    // 1. Initialize Registry with default directory
    const registry = new RuleRegistry();
    const defaultDir = registry.getDefaultDir();
    console.log(`📂 Default rules directory: ${defaultDir}\n`);

    // 2. Add rules directly (in-memory)
    console.log("✏️  CRUD Operations:");

    // ADD - Create new rules
    console.log("\n   [ADD] Creating new rules...");
    
    const rule1: TriggerRule = {
        id: "user-login",
        name: "User Login Rule",
        on: "user.login",
        enabled: true,
        tags: ["auth", "security"],
        do: [{ type: "log", params: { message: "User logged in" } }]
    };
    registry.add(rule1);

    const rule2: TriggerRule = {
        id: "user-logout", 
        name: "User Logout Rule",
        on: "user.logout",
        enabled: true,
        tags: ["auth"],
        do: [{ type: "log", params: { message: "User logged out" } }]
    };
    registry.add(rule2);

    const rule3: TriggerRule = {
        id: "admin-action",
        name: "Admin Action Rule",
        on: "admin.action",
        enabled: false,
        tags: ["admin", "security"],
        do: [{ type: "log", params: { message: "Admin action" } }]
    };
    registry.add(rule3);

    console.log(`   Added 3 rules (total: ${registry.size()})`);
    console.log(`   Default dir: ${registry.getDefaultDir()}`);

    // UPDATE - Modify existing rule
    console.log("\n   [UPDATE] Modifying rule...");
    const updated = registry.update("user-login", { 
        name: "User Login Rule (Updated)",
        enabled: false 
    });
    console.log(`   Updated rule: ${updated.id}, enabled: ${updated.enabled}, name: ${updated.name}`);

    // SAVE - Save rule to file
    console.log("\n   [SAVE] Saving rule to file...");
    const entry = registry.getEntry("user-login");
    if (entry) {
        const filePath = entry.filePath || `${registry.getDefaultDir()}/user-login.yaml`;
        await RulePersistence.saveRule(updated, filePath);
        console.log(`   Saved to: ${filePath}`);
        registry.markAsSaved("user-login", filePath);
    }

    // DELETE - Remove a rule
    console.log("\n   [DELETE] Removing rule...");
    const removed = registry.remove("admin-action");
    console.log(`   Removed rule: admin-action (success: ${removed})`);

    // 3. Query examples using RuleQuery
    console.log("\n🔍 Query Examples:");
    
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
    console.log(`   Rules grouped by event: ${Array.from(byEvent.keys()).join(", ")}\n`);

    // 4. Final state
    console.log("📊 Final Registry State:");
    console.log(`   Total rules: ${registry.size()}`);
    console.log(`   Default dir: ${registry.getDefaultDir()}`);
    console.log(`   Modified: ${registry.hasModified()}`);
    
    for (const rule of registry.getAll()) {
        const entry = registry.getEntry(rule.id!);
        console.log(`   - ${rule.id}: ${rule.name}`);
        console.log(`     enabled: ${rule.enabled}, filePath: ${entry?.filePath || "N/A"}`);
    }

    // 5. Watch for changes using RuleWatcher
    console.log("\n👀 Starting file watcher...");
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

    // 6. Cleanup
    console.log("\n🧹 Cleanup...");
    watcher.stop();
    console.log(`   Is watching after stop: ${watcher.isWatching()}`);
    console.log("✨ Done.");
}

main().catch(console.error);

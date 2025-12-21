
import { describe, expect, test } from "bun:test";
import { PluginManager } from "../../src/core/plugin-manager";
import { ActionRegistry } from "../../src/core/action-registry";
import { RuleEngine } from "../../src/core/rule-engine";

describe("Plugin System", () => {
    
    test("Should register plugin actions with namespacing", async () => {
        const pm = PluginManager.getInstance();
        const registry = ActionRegistry.getInstance();
        
        let executed = false;
        
        pm.registerPlugin({
            name: "test-plugin",
            version: "1.0.0",
            actions: {
                "hello": (action, context) => {
                    executed = true;
                    return "world";
                }
            }
        });

        // Check if action is registered as "test-plugin:hello"
        const handler = registry.get("test-plugin:hello");
        expect(handler).toBeDefined();

        // Execute it via Engine
        const engine = new RuleEngine({ rules: [], globalSettings: {} });
        
        // We can manually invoke the handler or use engine if we add a rule
        // New RuleEngine logic fetches from registry during execution
        
        const result = await handler!({ type: "test-plugin:hello" }, { event: "TEST", timestamp: 0, data: {} });
        expect(executed).toBe(true);
        expect(result).toBe("world");
    });
});

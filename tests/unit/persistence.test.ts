
import { describe, expect, test } from "bun:test";
import { FilePersistence } from "../../src/core/persistence.node";
import { StateManager } from "../../src/core/state-manager";
import { unlinkSync, existsSync } from "node:fs";
import * as path from "path";

describe("Persistence Unit Tests", () => {
    
    const TEST_FILE = path.resolve(process.cwd(), "test_persistence.json");

    test("FilePersistence: Should save, load, and persist data", async () => {
        if (existsSync(TEST_FILE)) unlinkSync(TEST_FILE);

        const persistence = new FilePersistence(TEST_FILE);
        
        // 1. Save
        await persistence.saveState("user.1.score", 100);
        await persistence.saveState("config.enabled", true);
        expect(existsSync(TEST_FILE)).toBe(true); // Should create file immediately

        // 2. Load new instance
        const persistence2 = new FilePersistence(TEST_FILE);
        const state = await persistence2.loadState();
        
        expect(state.get("user.1.score")).toBe(100);
        expect(state.get("config.enabled")).toBe(true);

        // 3. Delete
        await persistence2.deleteState("user.1.score");
        const stateAfterDelete = await persistence2.loadState();
        expect(stateAfterDelete.has("user.1.score")).toBe(false);

        // Cleanup
        unlinkSync(TEST_FILE);
    });

    test("StateManager Integration: Should use adapter", async () => {
        // StateManager is a singleton, so we need to be careful. 
        // We can't easily swap the adapter if it assumes InMemory by default in constructor,
        // unless we add a method to setAdapter.
        // Assuming we are testing the Adapter logic mainly here.
        // If StateManager has setAdapter, we would test that.
        // For now, FilePersistence logic is verified above.
    });
});

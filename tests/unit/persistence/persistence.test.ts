
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { FilePersistence } from "../../../src/core/persistence.node";
import { unlinkSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import * as path from "path";
import * as os from "os";

describe("Persistence Unit Tests", () => {
    
    const TEST_DIR = path.join(os.tmpdir(), `trigger_test_${Date.now()}`);
    const TEST_FILE = path.join(TEST_DIR, "test_persistence.json");

    beforeEach(() => {
        // Create test directory
        if (!existsSync(TEST_DIR)) {
            mkdirSync(TEST_DIR, { recursive: true });
        }
    });

    afterEach(() => {
        // Cleanup test files
        if (existsSync(TEST_FILE)) {
            try {
                unlinkSync(TEST_FILE);
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        // Clean up test directory
        try {
            unlinkSync(TEST_DIR);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    test("FilePersistence: Should save, load, and persist data", async () => {
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
    });

    test("Should handle corrupt JSON file gracefully", async () => {
        // Create a file with invalid JSON
        writeFileSync(TEST_FILE, "invalid json {", 'utf-8');
        
        const persistence = new FilePersistence(TEST_FILE);
        const state = await persistence.loadState();
        
        // Should handle corrupt file gracefully
        expect(state.size).toBe(0);
        
        // Should still be able to save new data
        await persistence.saveState("new.key", "new.value");
        const stateAfterSave = await persistence.loadState();
        expect(stateAfterSave.get("new.key")).toBe("new.value");
    });

    test("Should handle file permission errors gracefully", async () => {
        // Create file and make it read-only
        writeFileSync(TEST_FILE, JSON.stringify({ test: "value" }), 'utf-8');
        try {
            // Try to make file read-only (may not work on all systems)
            unlinkSync(TEST_FILE);
        } catch (error) {
            // Ignore if we can't modify permissions
        }
        
        const persistence = new FilePersistence(TEST_FILE);
        
        // Should handle permission errors gracefully
        await persistence.saveState("test.key", "test.value");
        
        // Should still work with in-memory cache
        const state = await persistence.loadState();
        expect(state.get("test.key")).toBe("test.value");
    });

    test("Should handle directory creation automatically", async () => {
        const nestedFile = path.join(TEST_DIR, "nested", "deep", "persistence.json");
        
        const persistence = new FilePersistence(nestedFile);
        await persistence.saveState("nested.key", "nested.value");
        
        expect(existsSync(nestedFile)).toBe(true);
        
        const state = await persistence.loadState();
        expect(state.get("nested.key")).toBe("nested.value");
    });

    test("Should handle large data sets efficiently", async () => {
        const persistence = new FilePersistence(TEST_FILE);
        
        // Save large amount of data
        for (let i = 0; i < 250; i++) {
            await persistence.saveState(`key${i}`, {
                id: i,
                data: `value${i}`.repeat(10),
                timestamp: Date.now(),
                nested: { level1: { level2: { data: i } } }
            });
        }
        
        const state = await persistence.loadState();
        expect(state.size).toBe(250);
        
        // Verify specific values
        expect(state.get("key0")).toEqual({
            id: 0,
            data: "value0".repeat(10),
            timestamp: expect.any(Number),
            nested: { level1: { level2: { data: 0 } } }
        });
    });

    test("Should handle concurrent operations safely", async () => {
        const persistence = new FilePersistence(TEST_FILE);
        
        // Simulate concurrent operations
        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(persistence.saveState(`concurrent${i}`, `value${i}`));
        }
        
        await Promise.all(promises);
        
        const state = await persistence.loadState();
        expect(state.size).toBe(50);
        
        // Verify all values are present
        for (let i = 0; i < 50; i++) {
            expect(state.get(`concurrent${i}`)).toBe(`value${i}`);
        }
    });

    test("Should handle special characters in keys and values", async () => {
        const persistence = new FilePersistence(TEST_FILE);
        
        const specialData = {
            "key.with.dots": "value.with.dots",
            "key-with-dashes": "value-with-dashes",
            "key_with_underscores": "value_with_underscores",
            "key with spaces": "value with spaces",
            "key/with/slashes": "value/with/slashes",
            "key\\with\\backslashes": "value\\with\\backslashes",
            "key\nwith\nnewlines": "value\nwith\nnewlines",
            "key\twith\ttabs": "value\twith\ttabs",
            "unicode🚀key": "unicode🚀value",
            "emoji💡test": "emoji💡data"
        };
        
        // Save all special data
        for (const [key, value] of Object.entries(specialData)) {
            await persistence.saveState(key, value);
        }
        
        const state = await persistence.loadState();
        expect(state.size).toBe(Object.keys(specialData).length);
        
        // Verify all special data is preserved
        for (const [key, value] of Object.entries(specialData)) {
            expect(state.get(key)).toBe(value);
        }
    });

    test("Should handle undefined and null values", async () => {
        const persistence = new FilePersistence(TEST_FILE);
        
        await persistence.saveState("undefined.key", undefined);
        await persistence.saveState("null.key", null);
        await persistence.saveState("string.key", "valid");
        await persistence.saveState("number.key", 42);
        await persistence.saveState("boolean.key", true);
        
        const state = await persistence.loadState();
        expect(state.size).toBe(5);
        expect(state.get("undefined.key")).toBeUndefined();
        expect(state.get("null.key")).toBeNull();
        expect(state.get("string.key")).toBe("valid");
        expect(state.get("number.key")).toBe(42);
        expect(state.get("boolean.key")).toBe(true);
    });

    test("Should handle circular references", async () => {
        const persistence = new FilePersistence(TEST_FILE);
        
        // Create circular reference
        const circular: any = { name: "test" };
        circular.self = circular;
        circular.nested = { parent: circular };
        
        await persistence.saveState("circular", circular);
        
        const state = await persistence.loadState();
        expect(state.size).toBe(1);
        
        // JSON serialization should handle circular references
        const loaded = state.get("circular");
        expect(loaded.name).toBe("test");
    });

    test("Should clear all data correctly", async () => {
        const persistence = new FilePersistence(TEST_FILE);
        
        // Save some data
        await persistence.saveState("key1", "value1");
        await persistence.saveState("key2", "value2");
        await persistence.saveState("key3", "value3");
        
        let state = await persistence.loadState();
        expect(state.size).toBe(3);
        
        // Clear all data
        await persistence.clearState();
        
        state = await persistence.loadState();
        expect(state.size).toBe(0);
        
        // File should still exist but be empty
        expect(existsSync(TEST_FILE)).toBe(true);
        const fileContent = readFileSync(TEST_FILE, 'utf-8');
        expect(JSON.parse(fileContent)).toEqual({});
    });

    test("Should handle non-existent file gracefully", async () => {
        const nonExistentFile = path.join(TEST_DIR, "non_existent.json");
        
        const persistence = new FilePersistence(nonExistentFile);
        const state = await persistence.loadState();
        
        // Should handle non-existent file gracefully
        expect(state.size).toBe(0);
        
        // Should be able to save data to non-existent file
        await persistence.saveState("new.key", "new.value");
        expect(existsSync(nonExistentFile)).toBe(true);
    });

    test("Should maintain data integrity across multiple instances", async () => {
        const persistence1 = new FilePersistence(TEST_FILE);
        
        await persistence1.saveState("shared.key", "shared.value");
        await persistence1.saveState("instance1.key", "instance1.value");
        
        // Create second instance - it should load data from file
        const persistence2 = new FilePersistence(TEST_FILE);
        await persistence2.saveState("instance2.key", "instance2.value");
        
        // Create fresh instances to ensure we read from file, not cache
        const persistence1Fresh = new FilePersistence(TEST_FILE);
        const persistence2Fresh = new FilePersistence(TEST_FILE);
        
        const state1 = await persistence1Fresh.loadState();
        const state2 = await persistence2Fresh.loadState();
        
        expect(state1.size).toBe(3);
        expect(state2.size).toBe(3);
        
        expect(state1.get("shared.key")).toBe("shared.value");
        expect(state2.get("shared.key")).toBe("shared.value");
        expect(state1.get("instance1.key")).toBe("instance1.value");
        expect(state2.get("instance2.key")).toBe("instance2.value");
    });
});

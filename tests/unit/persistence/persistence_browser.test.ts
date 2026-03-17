import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { BrowserPersistence } from "../../../src/core/persistence-browser";

// Mock localStorage for testing
const mockLocalStorage = new Map<string, string>();

// Mock window object
const mockWindow = {
    localStorage: {
        getItem: (key: string) => mockLocalStorage.get(key) || null,
        setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
        removeItem: (key: string) => mockLocalStorage.delete(key),
        clear: () => mockLocalStorage.clear(),
        get length() { return mockLocalStorage.size; },
        key: (index: number) => Array.from(mockLocalStorage.keys())[index] || null,
    }
} as any;

describe("BrowserPersistence - Enhanced Tests", () => {
    beforeEach(() => {
        // Mock global window
        (globalThis as any).window = mockWindow;
        mockLocalStorage.clear();
    });

    afterEach(() => {
        mockLocalStorage.clear();
    });

    test("Should handle localStorage unavailability gracefully",async () => {
        // Mock window without localStorage
        (globalThis as any).window = {};
        
        const persistence = new BrowserPersistence("test:");
        
        // Should not crash and should work with in-memory fallback
        await persistence.saveState("test.key", "test.value");
        const value = await persistence.loadState();
        expect(value.get("test.key")).toBe("test.value");
    });

    test("Should handle JSON parse errors gracefully", async () => {
        // Mock localStorage with invalid JSON
        mockLocalStorage.set("test:state", "invalid json {");
        
        const persistence = new BrowserPersistence("test:");
        
        // Should handle parse errors gracefully - using public method through reflection
        await (persistence as any).ensureLoaded();
        
        // Cache should be empty after parse error
        const state = await persistence.loadState();
        expect(state.size).toBe(0);
    });

    test("Should handle localStorage write errors gracefully", async () => {
        // Mock localStorage to throw on setItem
        const originalSetItem = mockWindow.localStorage.setItem;
        mockWindow.localStorage.setItem = () => {
            throw new Error("Storage quota exceeded");
        };
        
        const persistence = new BrowserPersistence("test:");
        
        // Should handle write errors gracefully
        await persistence.saveState("test.key", "test.value");
        
        // Restore original method
        mockWindow.localStorage.setItem = originalSetItem;
    });

    test("Should handle localStorage read errors gracefully", async () => {
        // Mock localStorage to throw on getItem
        const originalGetItem = mockWindow.localStorage.getItem;
        mockWindow.localStorage.getItem = () => {
            throw new Error("Storage access denied");
        };
        
        const persistence = new BrowserPersistence("test:");
        
        // Should handle read errors gracefully
        await persistence.ensureLoaded();
        
        // Restore original method
        mockWindow.localStorage.getItem = originalGetItem;
    });

    test("Should handle localStorage remove errors gracefully", async () => {
        // Mock localStorage to throw on removeItem
        const originalRemoveItem = mockWindow.localStorage.removeItem;
        mockWindow.localStorage.removeItem = () => {
            throw new Error("Storage access denied");
        };
        
        const persistence = new BrowserPersistence("test:");
        
        // Should handle remove errors gracefully
        await persistence.deleteState("test.key");
        
        // Restore original method
        mockWindow.localStorage.removeItem = originalRemoveItem;
    });

    test("Should handle localStorage clear errors gracefully", async () => {
        // Mock localStorage to throw on clear
        const originalClear = mockWindow.localStorage.clear;
        mockWindow.localStorage.clear = () => {
            throw new Error("Storage access denied");
        };
        
        const persistence = new BrowserPersistence("test:");
        
        // Should handle clear errors gracefully
        await persistence.clearState();
        
        // Restore original method
        mockWindow.localStorage.clear = originalClear;
    });

    test("Should work with custom prefix", async () => {
        const persistence = new BrowserPersistence("custom:");
        
        await persistence.saveState("key1", "value1");
        await persistence.saveState("key2", "value2");
        
        // Should use custom prefix for all keys
        expect(mockLocalStorage.get("custom:state")).toBeTruthy();
        const savedData = JSON.parse(mockLocalStorage.get("custom:state")!);
        expect(savedData.key1).toBe("value1");
        expect(savedData.key2).toBe("value2");
    });

    test("Should handle empty localStorage", async () => {
        // Mock empty localStorage
        mockLocalStorage.clear();
        
        const persistence = new BrowserPersistence("test:");
        
        // Should handle empty storage gracefully
        await persistence.ensureLoaded();
        const state = await persistence.loadState();
        expect(state.size).toBe(0);
    });

    test("Should handle large data sets", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Save large amount of data
        for (let i = 0; i < 100; i++) {
            await persistence.saveState(`key${i}`, `value${i}`);
        }
        
        const state = await persistence.loadState();
        expect(state.size).toBe(100);
        
        // Verify all values are correct
        for (let i = 0; i < 100; i++) {
            expect(state.get(`key${i}`)).toBe(`value${i}`);
        }
    });

    test("Should handle concurrent operations", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Simulate concurrent operations
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(persistence.saveState(`key${i}`, `value${i}`));
        }
        
        await Promise.all(promises);
        
        const state = await persistence.loadState();
        expect(state.size).toBe(10);
    });

    test("Should handle key collisions", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Save data with potential key conflicts
        await persistence.saveState("user.data", { name: "John", score: 100 });
        await persistence.saveState("user_settings.data", { theme: "dark" });
        
        const state = await persistence.loadState();
        expect(state.size).toBe(2);
        expect(state.get("user.data")).toEqual({ name: "John", score: 100 });
        expect(state.get("user_settings.data")).toEqual({ theme: "dark" });
    });

    test("Should handle special characters in keys", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Test with special characters
        const specialKeys = ["key.with.dots", "key-with-dashes", "key_with_underscores", "key with spaces"];
        const specialValues = ["value1", "value2", "value3", "value4"];
        
        for (let i = 0; i < specialKeys.length; i++) {
            await persistence.saveState(specialKeys[i]!, specialValues[i]);
        }
        
        const state = await persistence.loadState();
        expect(state.size).toBe(specialKeys.length);
        
        for (let i = 0; i < specialKeys.length; i++) {
            expect(state.get(specialKeys[i]!)).toBe(specialValues[i]);
        }
    });

    test("Should handle undefined and null values", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Test undefined and null values
        await persistence.saveState("undefined.key", undefined);
        await persistence.saveState("null.key", null);
        await persistence.saveState("string.key", "valid");
        
        const state = await persistence.loadState();
        expect(state.size).toBe(3);
        expect(state.get("undefined.key")).toBeUndefined();
        expect(state.get("null.key")).toBeNull();
        expect(state.get("string.key")).toBe("valid");
    });

    test("Should handle circular references", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Create circular reference
        const circular: any = {};
        circular.self = circular;
        
        await persistence.saveState("circular", circular);
        
        // Should handle circular references without infinite loops
        const state = await persistence.loadState();
        expect(state.size).toBe(1);
        expect(state.get("circular")).toBe(circular);
    });

    test("Should maintain data integrity across multiple operations", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Perform multiple operations
        await persistence.saveState("test1", { value: 1, nested: { data: "test" } });
        await persistence.saveState("test2", [1, 2, 3]);
        
        // Delete and reload
        await persistence.deleteState("test1");
        const state = await persistence.loadState();
        
        expect(state.size).toBe(1);
        expect(state.get("test2")).toEqual([1, 2, 3]);
    });

    test("Should handle localStorage quota exceeded", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Mock quota exceeded error
        const originalSetItem = mockWindow.localStorage.setItem;
        let callCount = 0;
        mockWindow.localStorage.setItem = () => {
            callCount++;
            if (callCount > 5) {
                throw new Error("QuotaExceededError");
            }
        };
        
        // Try to save multiple items
        for (let i = 0; i < 10; i++) {
            try {
                await persistence.saveState(`key${i}`, `value${i}`.repeat(100));
            } catch (error) {
                // Should handle quota errors gracefully
                expect(error).toBeDefined();
                break;
            }
        }
        
        // Restore original method
        mockWindow.localStorage.setItem = originalSetItem;
    });

    test("Should provide consistent API", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Test all methods exist and return expected types
        expect(typeof persistence.loadState).toBe("function");
        expect(typeof persistence.saveState).toBe("function");
        expect(typeof persistence.deleteState).toBe("function");
        expect(typeof persistence.clearState).toBe("function");
        
        // Test they return promises
        const loadPromise = persistence.loadState();
        const savePromise = persistence.saveState("test", "value");
        const deletePromise = persistence.deleteState("test");
        const clearPromise = persistence.clearState();
        
        expect(loadPromise).toBeInstanceOf(Promise);
        expect(savePromise).toBeInstanceOf(Promise);
        expect(deletePromise).toBeInstanceOf(Promise);
        expect(clearPromise).toBeInstanceOf(Promise);
    });

    test("Should handle rapid successive operations", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Perform rapid operations
        for (let i = 0; i < 100; i++) {
            await persistence.saveState(`rapid${i}`, `value${i}`);
        }
        
        for (let i = 0; i < 100; i++) {
            await persistence.deleteState(`rapid${i}`);
        }
        
        const state = await persistence.loadState();
        expect(state.size).toBe(0);
    });

    test("Should handle memory pressure with large objects", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Create large objects
        const largeObjects = [];
        for (let i = 0; i < 10; i++) {
            const largeObj = {
                id: i,
                data: new Array(1000).fill(`data${i}`),
                nested: {
                    level1: {
                        level2: {
                            level3: new Array(100).fill(`deep${i}`)
                        }
                    }
                }
            };
            largeObjects.push(largeObj);
            await persistence.saveState(`large${i}`, largeObj);
        }
        
        const state = await persistence.loadState();
        expect(state.size).toBe(10);
        
        // Verify data integrity
        for (let i = 0; i < 10; i++) {
            const loaded = state.get(`large${i}`);
            expect(loaded.id).toBe(i);
            expect(loaded.data.length).toBe(1000);
            expect(loaded.nested.level1.level2.level3.length).toBe(100);
        }
    });

    test("Should handle localStorage size limits gracefully", async () => {
        const persistence = new BrowserPersistence("test:");
        
        // Mock localStorage with size limit
        const originalSetItem = mockWindow.localStorage.setItem;
        let totalSize = 0;
        const maxSize = 5000; // 5KB limit
        
        mockWindow.localStorage.setItem = (key: string, value: string) => {
            totalSize += value.length;
            if (totalSize > maxSize) {
                throw new Error("QuotaExceededError");
            }
            return originalSetItem(key, value);
        };
        
        // Save some data first
        await persistence.saveState("initial", "data");
        expect(mockLocalStorage.has("test:state")).toBe(true);
        
        // Try to save data that will exceed quota
        try {
            await persistence.saveState("large", "x".repeat(maxSize));
        } catch (error) {
            // Expected to throw due to quota exceeded
        }
        
        // Should still have the initial data
        const state = await persistence.loadState();
        expect(state.has("initial")).toBe(true);
        
        // Restore original method
        mockWindow.localStorage.setItem = originalSetItem;
    });

    test("Should handle browser privacy mode scenarios", async () => {
        // Mock localStorage that throws on all operations
        const originalMethods = {
            getItem: mockWindow.localStorage.getItem,
            setItem: mockWindow.localStorage.setItem,
            removeItem: mockWindow.localStorage.removeItem,
            clear: mockWindow.localStorage.clear
        };
        
        // Simulate privacy mode where localStorage is blocked
        mockWindow.localStorage.getItem = () => {
            throw new Error("SecurityError: The operation is insecure.");
        };
        mockWindow.localStorage.setItem = () => {
            throw new Error("SecurityError: The operation is insecure.");
        };
        mockWindow.localStorage.removeItem = () => {
            throw new Error("SecurityError: The operation is insecure.");
        };
        mockWindow.localStorage.clear = () => {
            throw new Error("SecurityError: The operation is insecure.");
        };
        
        const persistence = new BrowserPersistence("test:");
        
        // Should fallback to in-memory storage
        await persistence.saveState("privacy.key", "privacy.value");
        const state = await persistence.loadState();
        expect(state.get("privacy.key")).toBe("privacy.value");
        
        await persistence.deleteState("privacy.key");
        const stateAfterDelete = await persistence.loadState();
        expect(stateAfterDelete.has("privacy.key")).toBe(false);
        
        // Restore original methods
        Object.assign(mockWindow.localStorage, originalMethods);
    });

    test("Should handle data type edge cases", async () => {
        const persistence = new BrowserPersistence("test:");
        
        const edgeCases = {
            "empty_string": "",
            "zero": 0,
            "false": false,
            "negative_number": -42,
            "float_number": 3.14159,
            "empty_array": [],
            "empty_object": {},
            "array_with_null": [1, null, 3],
            "object_with_undefined": { a: 1, b: undefined, c: 3 },
            "date_object": new Date(),
            "regex_object": /test/gi,
            "function_value": () => "test",
            "symbol_value": Symbol("test"),
            "bigint_value": BigInt(12345678901234567890n)
        };
        
        // Save all edge cases
        for (const [key, value] of Object.entries(edgeCases)) {
            await persistence.saveState(key, value);
        }
        
        const state = await persistence.loadState();
        expect(state.size).toBe(Object.keys(edgeCases).length);
        
        // Verify values (some will be transformed by JSON serialization)
        expect(state.get("empty_string")).toBe("");
        expect(state.get("zero")).toBe(0);
        expect(state.get("false")).toBe(false);
        expect(state.get("negative_number")).toBe(-42);
        expect(state.get("float_number")).toBe(3.14159);
        expect(state.get("empty_array")).toEqual([]);
        expect(state.get("empty_object")).toEqual({});
        expect(state.get("array_with_null")).toEqual([1, null, 3]);
        // Functions, symbols, and BigInts will be transformed or omitted
    });

    test("Should maintain performance with many keys", async () => {
        const persistence = new BrowserPersistence("test:");
        
        const startTime = performance.now();
        
        // Save many keys
        for (let i = 0; i < 1000; i++) {
            await persistence.saveState(`perf_key_${i}`, `perf_value_${i}`);
        }
        
        const saveTime = performance.now();
        
        // Load all keys
        const state = await persistence.loadState();
        
        const loadTime = performance.now();
        
        // Access many keys
        for (let i = 0; i < 1000; i++) {
            state.get(`perf_key_${i}`);
        }
        
        const accessTime = performance.now();
        
        expect(state.size).toBe(1000);
        
        // Performance should be reasonable (these are loose bounds)
        expect(saveTime - startTime).toBeLessThan(5000); // 5 seconds
        expect(loadTime - saveTime).toBeLessThan(1000); // 1 second
        expect(accessTime - loadTime).toBeLessThan(100); // 100ms
    });
});

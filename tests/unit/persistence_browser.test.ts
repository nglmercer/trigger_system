
import { describe, expect, test, beforeAll } from "bun:test";
import { BrowserPersistence } from "../../src/core/persistence-browser";

// Mock global window and localStorage
const mockStorage = new Map<string, string>();
const mockWindow = {
    localStorage: {
        getItem: (key: string) => mockStorage.get(key) || null,
        setItem: (key: string, val: string) => mockStorage.set(key, val),
        removeItem: (key: string) => mockStorage.delete(key),
        clear: () => mockStorage.clear()
    }
};

describe("Browser Persistence", () => {
    
    // Inject mock window global
    beforeAll(() => {
        // @ts-ignore
        global.window = mockWindow;
    });

    test("Should detect availability and store data", async () => {
        const bp = new BrowserPersistence("test_app:");
        
        await bp.saveState("theme", "dark");
        
        // Verify internal cache
        const state = await bp.loadState();
        expect(state.get("theme")).toBe("dark");

        // Verify underlying storage
        const raw = mockStorage.get("test_app:state");
        expect(raw).toBeDefined();
        if (raw) {
            const json = JSON.parse(raw);
            expect(json.theme).toBe("dark");
        }
    });

    test("Should persist data across instances", async () => {
        // Create new instance, it should read from the same mockStorage
        const bp2 = new BrowserPersistence("test_app:");
        const state = await bp2.loadState();
        
        expect(state.get("theme")).toBe("dark");
    });
});

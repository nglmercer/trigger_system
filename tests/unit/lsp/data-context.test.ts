import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { DataContext, globalDataContext, loadDataFromImports } from "../../../src/lsp/data-context";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";

describe("DataContext", () => {
    const testDir = "./test-data-context";
    const jsonFile = join(testDir, "test.json");
    const yamlFile = join(testDir, "test.yaml");
    
    beforeEach(() => {
        mkdirSync(testDir, { recursive: true });
        globalDataContext.clear();
    });
    
    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
        globalDataContext.clear();
    });

    test("Should load JSON file correctly", () => {
        const testData = {
            user: { name: "test", age: 25 },
            config: { debug: true }
        };
        writeFileSync(jsonFile, JSON.stringify(testData));
        
        const context = new DataContext();
        context.loadFromFile(jsonFile);
        
        expect(context.getValue<string>("user.name")).toBe("test");
        expect(context.getValue<number>("user.age")).toBe(25);
        expect(context.getValue<boolean>("config.debug")).toBe(true);
    });

    test("Should load YAML file correctly", () => {
        const yamlContent = `
user:
  name: test
  age: 25
config:
  debug: true
        `;
        writeFileSync(yamlFile, yamlContent);
        
        const context = new DataContext();
        context.loadFromFile(yamlFile);
        
        expect(context.getValue<string>("user.name")).toBe("test");
        expect(context.getValue<number>("user.age")).toBe(25);
        expect(context.getValue<boolean>("config.debug")).toBe(true);
    });

    test("Should handle file caching", () => {
        const testData = { version: 1 };
        writeFileSync(jsonFile, JSON.stringify(testData));
        
        const context = new DataContext();
        context.loadFromFile(jsonFile);
        
        // Modify file
        const newTestData = { version: 2 };
        writeFileSync(jsonFile, JSON.stringify(newTestData));
        
        // Should still return cached version
        expect(context.getValue<number>("version")).toBe(1);
    });

    test("Should reload when file is modified", async () => {
        const testData = { version: 1 };
        writeFileSync(jsonFile, JSON.stringify(testData));
        
        const context = new DataContext();
        context.loadFromFile(jsonFile);
        
        // Wait a bit to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const newTestData = { version: 2 };
        writeFileSync(jsonFile, JSON.stringify(newTestData));
        
        context.loadFromFile(jsonFile);
        expect(context.getValue<number>("version")).toBe(2);
    });

    test("Should load from object", () => {
        const data = {
            users: ["alice", "bob"],
            settings: { theme: "dark" }
        };
        
        const context = new DataContext();
        context.loadFromObject(data);
        
        expect(context.getValue<string[]>("users")).toEqual(["alice", "bob"]);
        expect(context.getValue<string>("settings.theme")).toBe("dark");
    });

    test("Should get fields at path", () => {
        const data = {
            user: { name: "test", email: "test@example.com" },
            config: { debug: true, port: 3000 }
        };
        
        const context = new DataContext();
        context.loadFromObject(data);
        
        const userFields = context.getFields("user");
        expect(userFields).toHaveLength(2);
        expect(userFields.find(f => f.name === "name")?.value).toBe("test");
        
        const topFields = context.getFields();
        expect(topFields).toHaveLength(2);
        expect(topFields.map(f => f.name)).toEqual(["user", "config"]);
    });

    test("Should return empty array for non-object paths", () => {
        const data = {
            user: { name: "test" },
            count: 42
        };
        
        const context = new DataContext();
        context.loadFromObject(data);
        
        // Path to primitive value should return empty array
        const nameFields = context.getFields("user.name");
        expect(nameFields).toEqual([]);
        
        const countFields = context.getFields("count");
        expect(countFields).toEqual([]);
    });

    test("Should check path existence", () => {
        const data = { user: { name: "test" } };
        
        const context = new DataContext();
        context.loadFromObject(data);
        
        expect(context.hasPath("user.name")).toBe(true);
        expect(context.hasPath("user.email")).toBe(false);
        expect(context.hasPath("")).toBe(true); // Root path
    });

    test("Should format values correctly", () => {
        const context = new DataContext();
        
        expect(context.getFormattedValue(null)).toBe("null");
        expect(context.getFormattedValue(undefined)).toBe("undefined");
        expect(context.getFormattedValue("string")).toBe('"string"');
        expect(context.getFormattedValue(42)).toBe("42");
        expect(context.getFormattedValue({ key: "value" })).toBe('{\n  "key": "value"\n}');
    });

    test("Should handle invalid files gracefully", () => {
        const invalidJson = "{ invalid json }";
        writeFileSync(jsonFile, invalidJson);
        
        const context = new DataContext();
        context.loadFromFile(jsonFile);
        
        expect(context.getValue("anything")).toBeUndefined();
    });

    test("Should clear data", () => {
        const context = new DataContext();
        context.loadFromObject({ test: "value" });
        
        expect(context.getValue<string>("test")).toBe("value");
        
        context.clear();
        expect(context.getValue<string>("test")).toBeUndefined();
    });
});

describe("Global Data Context", () => {
    test("Should load data from imports", () => {
        const testDir = "./test-global-context";
        const importFile = join(testDir, "import.json");
        
        try {
            mkdirSync(testDir, { recursive: true });
            const importData = { users: ["alice", "bob"] };
            writeFileSync(importFile, JSON.stringify(importData));
            
            const imports = [
                { alias: "data", path: importFile }
            ];
            
            loadDataFromImports(imports);
            
            expect(globalDataContext.getValue<string[]>("data.users")).toEqual(["alice", "bob"]);
        } finally {
            if (existsSync(testDir)) {
                rmSync(testDir, { recursive: true, force: true });
            }
            globalDataContext.clear();
        }
    });

    test("Should handle multiple imports", () => {
        const testDir = "./test-multi-imports";
        const file1 = join(testDir, "file1.json");
        const file2 = join(testDir, "file2.json");
        
        try {
            mkdirSync(testDir, { recursive: true });
            writeFileSync(file1, JSON.stringify({ config: { debug: true } }));
            writeFileSync(file2, JSON.stringify({ users: ["alice"] }));
            
            const imports = [
                { alias: "config", path: file1 },
                { alias: "data", path: file2 }
            ];
            
            loadDataFromImports(imports);
            
            expect(globalDataContext.getValue<boolean>("config.config.debug")).toBe(true);
            expect(globalDataContext.getValue<string[]>("data.users")).toEqual(["alice"]);
        } finally {
            if (existsSync(testDir)) {
                rmSync(testDir, { recursive: true, force: true });
            }
            globalDataContext.clear();
        }
    });

    test("Should handle import errors gracefully", () => {
        globalDataContext.clear(); // Clear before test
        
        const imports = [
            { alias: "missing", path: "./nonexistent.json" }
        ];
        
        expect(() => loadDataFromImports(imports)).not.toThrow();
        // When import fails, it creates an empty object under the alias
        expect(globalDataContext.getValue<Record<string, any>>("missing")).toEqual({});
    });
});

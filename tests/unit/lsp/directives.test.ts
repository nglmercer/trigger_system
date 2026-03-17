import { describe, expect, test } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import { 
    parseDirectives, 
    isDiagnosticSuppressed, 
    processRangeDirectives, 
    getImportDirectives,
    type Directive 
} from "../../../src/lsp/directives";

describe("Directives Parser", () => {
    test("Should parse disable-lint directive", () => {
        const content = `
# @disable-lint
id: test-rule
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(1);
        expect(directives[0]!.type).toBe("disable-lint");
        expect(directives[0]!.line).toBe(1);
    });

    test("Should parse enable-lint directive", () => {
        const content = `
# @enable-lint
id: test-rule
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(1);
        expect(directives[0]!.type).toBe("enable-lint");
        expect(directives[0]!.line).toBe(1);
    });

    test("Should parse disable-next-line directive", () => {
        const content = `
# @disable-next-line
invalid: line
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(1);
        expect(directives[0]!.type).toBe("disable-next-line");
        expect(directives[0]!.affectedLines).toEqual([2]);
    });

    test("Should parse disable-line directive", () => {
        const content = `
# @disable-line
invalid: line
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(1);
        expect(directives[0]!.type).toBe("disable-line");
        expect(directives[0]!.affectedLines).toEqual([1]);
    });

    test("Should parse disable-rule directive", () => {
        const content = `
# @disable-rule trigger-validator, yaml-parser
invalid: line
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(1);
        expect(directives[0]!.type).toBe("disable-rule");
        expect(directives[0]!.rules).toEqual(["trigger-validator", "yaml-parser"]);
        expect(directives[0]!.affectedLines).toEqual([2]);
    });

    test("Should parse enable-rule directive", () => {
        const content = `
# @enable-rule trigger-validator
invalid: line
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(1);
        expect(directives[0]!.type).toBe("enable-rule");
        expect(directives[0]!.rules).toEqual(["trigger-validator"]);
    });

    test("Should parse import directive", () => {
        const content = `
# @import data from './config.json'
id: test-rule
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(1);
        expect(directives[0]!.type).toBe("import");
        expect(directives[0]!.importAlias).toBe("data");
        expect(directives[0]!.importPath).toBe("./config.json");
    });

    test("Should parse multiple directives", () => {
        const content = `
# @disable-lint
# @import config from './config.json'
# @disable-next-line
id: test-rule
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(3);
        expect(directives[0]!.type).toBe("disable-lint");
        expect(directives[1]!.type).toBe("import");
        expect(directives[2]!.type).toBe("disable-next-line");
    });

    test("Should ignore non-directive comments", () => {
        const content = `
# Regular comment
id: test-rule
# Another comment
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(0);
    });

    test("Should handle malformed directives gracefully", () => {
        const content = `
# @invalid-directive
# @import (missing alias and path)
id: test-rule
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const directives = parseDirectives(doc);
        
        expect(directives).toHaveLength(0);
    });
});

describe("Diagnostic Suppression", () => {
    test("Should suppress with disable-lint", () => {
        const directives: Directive[] = [
            { type: "disable-lint", line: 0, affectedLines: [1, 2, 3] }
        ];
        
        expect(isDiagnosticSuppressed(1, directives)).toBe(true);
        expect(isDiagnosticSuppressed(2, directives)).toBe(true);
        expect(isDiagnosticSuppressed(4, directives)).toBe(false);
    });

    test("Should suppress with disable-next-line", () => {
        const directives: Directive[] = [
            { type: "disable-next-line", line: 0, affectedLines: [1] }
        ];
        
        expect(isDiagnosticSuppressed(1, directives)).toBe(true);
        expect(isDiagnosticSuppressed(2, directives)).toBe(false);
    });

    test("Should suppress with disable-line", () => {
        const directives: Directive[] = [
            { type: "disable-line", line: 1, affectedLines: [1] }
        ];
        
        expect(isDiagnosticSuppressed(1, directives)).toBe(true);
        expect(isDiagnosticSuppressed(2, directives)).toBe(false);
    });

    test("Should suppress specific rules", () => {
        const directives: Directive[] = [
            { 
                type: "disable-rule", 
                line: 0, 
                rules: ["trigger-validator"], 
                affectedLines: [1] 
            }
        ];
        
        expect(isDiagnosticSuppressed(1, directives, "trigger-validator")).toBe(true);
        expect(isDiagnosticSuppressed(1, directives, "yaml-parser")).toBe(false);
        expect(isDiagnosticSuppressed(2, directives, "trigger-validator")).toBe(false);
    });

    test("Should handle partial rule matching", () => {
        const directives: Directive[] = [
            { 
                type: "disable-rule", 
                line: 0, 
                rules: ["validator"], 
                affectedLines: [1] 
            }
        ];
        
        expect(isDiagnosticSuppressed(1, directives, "trigger-validator")).toBe(true);
        expect(isDiagnosticSuppressed(1, directives, "validator")).toBe(true);
    });
});

describe("Range Directives Processing", () => {
    test("Should process disable-lint to enable-lint range", () => {
        const directives: Directive[] = [
            { type: "disable-lint", line: 0, affectedLines: [] },
            { type: "enable-lint", line: 3, affectedLines: [] }
        ];
        
        const processed = processRangeDirectives(directives);
        
        expect(processed[0]!.affectedLines).toEqual([0, 1, 2]);
        expect(processed[1]!.affectedLines).toEqual([]);
    });

    test("Should handle multiple disable-enable pairs", () => {
        const directives: Directive[] = [
            { type: "disable-lint", line: 0, affectedLines: [] },
            { type: "enable-lint", line: 2, affectedLines: [] },
            { type: "disable-lint", line: 4, affectedLines: [] },
            { type: "enable-lint", line: 6, affectedLines: [] }
        ];
        
        const processed = processRangeDirectives(directives);
        
        expect(processed[0]!.affectedLines).toEqual([0, 1]);
        expect(processed[2]!.affectedLines).toEqual([4, 5]);
    });

    test("Should handle standalone directives", () => {
        const directives: Directive[] = [
            { type: "disable-next-line", line: 0, affectedLines: [1] },
            { type: "import", line: 2, importAlias: "data", importPath: "./config.json", affectedLines: [] }
        ];
        
        const processed = processRangeDirectives(directives);
        
        expect(processed).toEqual(directives);
    });
});

describe("Import Directives Extraction", () => {
    test("Should extract import directives", () => {
        const content = `
# @import config from './config.json'
# @import data from './data.yaml'
id: test-rule
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const imports = getImportDirectives(doc, "file:///test");
        
        expect(imports).toHaveLength(2);
        expect(imports[0]).toEqual({ alias: "config", path: "/config.json" });
        expect(imports[1]).toEqual({ alias: "data", path: "/data.yaml" });
    });

    test("Should handle relative paths", () => {
        const content = `
# @import config from '../config.json'
id: test-rule
        `;
        const doc = TextDocument.create("file:///home/user/project/test.yaml", "yaml", 1, content);
        const imports = getImportDirectives(doc, "file:///home/user/project/test.yaml");
        
        expect(imports).toHaveLength(1);
        expect(imports[0]).toEqual({ alias: "config", path: "/home/user/config.json" });
    });

    test("Should ignore malformed import directives", () => {
        const content = `
# @import config
# @import from './config.json'
# @import config from
id: test-rule
        `;
        const doc = TextDocument.create("file:///test", "yaml", 1, content);
        const imports = getImportDirectives(doc, "file:///test");
        
        expect(imports).toHaveLength(0);
    });
});

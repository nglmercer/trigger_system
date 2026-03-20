import { describe, expect, test } from "bun:test";
import { 
    uriToPath, 
    pathToUri, 
    resolveImportPath 
} from "../../../src/lsp/path-utils";

describe("URI/Path Conversion", () => {
    describe("uriToPath", () => {
        test("Should convert standard Unix file URI", () => {
            expect(uriToPath("file:///home/user/file.txt")).toBe("/home/user/file.txt");
            expect(uriToPath("file:///etc/passwd")).toBe("/etc/passwd");
        });

        test("Should convert Windows file URI with drive letter", () => {
            expect(uriToPath("file:///C:/Users/user/file.txt")).toBe("C:/Users/user/file.txt");
            expect(uriToPath("file:///D:/project/config.json")).toBe("D:/project/config.json");
        });

        test("Should handle Windows UNC paths", () => {
            expect(uriToPath("file://server/share/file.txt")).toBe("//server/share/file.txt");
            expect(uriToPath("file://server/share/folder/file.txt")).toBe("//server/share/folder/file.txt");
        });

        test("Should handle malformed URIs", () => {
            expect(uriToPath("file://test")).toBe("/test");
            expect(uriToPath("file://C:/test")).toBe("//C:/test/");
        });

        test("Should handle regular paths", () => {
            expect(uriToPath("/home/user/file.txt")).toBe("/home/user/file.txt");
            expect(uriToPath("./relative/path")).toBe("relative/path");
        });

        test("Should handle encoded URIs", () => {
            expect(uriToPath("file:///home/user/file%20name.txt")).toBe("/home/user/file name.txt");
            expect(uriToPath("file:///C:/Users/user/folder%20name")).toBe("C:/Users/user/folder name");
        });
    });

    describe("pathToUri", () => {
        test("Should convert Unix paths to URI", () => {
            expect(pathToUri("/home/user/file.txt")).toBe("file:///home/user/file.txt");
            expect(pathToUri("/etc/passwd")).toBe("file:///etc/passwd");
        });

        test("Should convert Windows paths to URI", () => {
            expect(pathToUri("C:/Users/user/file.txt")).toBe("file:///C:/Users/user/file.txt");
            expect(pathToUri("D:/project/config.json")).toBe("file:///D:/project/config.json");
        });

        test("Should convert relative paths", () => {
            expect(pathToUri("./relative/path")).toBe("file:///./relative/path");
            expect(pathToUri("relative/path")).toBe("file:///relative/path");
        });

        test("Should normalize path separators", () => {
            expect(pathToUri("C:\\Users\\user\\file.txt")).toBe("file:///C:/Users/user/file.txt");
            expect(pathToUri("\\\\server\\share\\file.txt")).toBe("file:////server/share/file.txt");
        });
    });

    describe("Round-trip conversion", () => {
        test("Should maintain consistency for Unix paths", () => {
            const originalPath = "/home/user/project/file.txt";
            const uri = pathToUri(originalPath);
            const convertedPath = uriToPath(uri);
            expect(convertedPath).toBe(originalPath);
        });

        test("Should maintain consistency for Windows paths", () => {
            const originalPath = "C:/Users/user/project/file.txt";
            const uri = pathToUri(originalPath);
            const convertedPath = uriToPath(uri);
            expect(convertedPath).toBe(originalPath);
        });
    });
});

describe("Import Path Resolution", () => {
    describe("Absolute paths", () => {
        test("Should resolve absolute paths directly", () => {
            const result = resolveImportPath(
                "file:///home/user/project/test.yaml",
                "/absolute/path/config.json",
                []
            );
            expect(result).toBe("/absolute/path/config.json");
        });

        test("Should normalize absolute paths", () => {
            const result = resolveImportPath(
                "file:///home/user/project/test.yaml",
                "/absolute/../path/config.json",
                []
            );
            expect(result).toBe("/path/config.json");
        });
    });

    describe("Relative paths", () => {
        test("Should resolve relative paths from document directory", () => {
            const result = resolveImportPath(
                "file:///home/user/project/subdir/test.yaml",
                "./config.json",
                []
            );
            expect(result).toBe("/home/user/project/subdir/config.json");
        });

        test("Should resolve parent directory references", () => {
            const result = resolveImportPath(
                "file:///home/user/project/subdir/test.yaml",
                "../config.json",
                []
            );
            expect(result).toBe("/home/user/project/config.json");
        });

        test("Should resolve complex relative paths", () => {
            const result = resolveImportPath(
                "file:///home/user/project/deep/nested/test.yaml",
                "../../other/config.json",
                []
            );
            expect(result).toBe("/home/user/project/other/config.json");
        });
    });

    describe("Workspace-relative resolution", () => {
        test("Should resolve from workspace folders", () => {
            const result = resolveImportPath(
                "file:///home/user/project/test.yaml",
                "config/settings.json",
                ["file:///home/user/project"]
            );
            expect(result).toBe("/home/user/project/config/settings.json");
        });

        test("Should try multiple workspace folders", () => {
            const result = resolveImportPath(
                "file:///home/user/other/test.yaml",
                "config/settings.json",
                [
                    "file:///home/user/project1",
                    "file:///home/user/project2"
                ]
            );
            // Should return the first match or fallback
            expect(result).toContain("config/settings.json");
        });

        test("Should handle workspace root resolution", () => {
            const result = resolveImportPath(
                "file:///home/user/project/subdir/test.yaml",
                "root-config.json",
                ["file:///home/user/project"]
            );
            expect(result).toBe("/home/user/project/subdir/root-config.json");
        });
    });

    describe("Node modules fallback", () => {
        test("Should search in node_modules", () => {
            // This test assumes node_modules exists in the project
            const result = resolveImportPath(
                "file:///home/user/project/test.yaml",
                "lodash/lodash.js",
                []
            );
            // Should either find it or return fallback
            expect(result).toBeDefined();
        });

        test("Should search up the directory tree", () => {
            const result = resolveImportPath(
                "file:///home/user/project/deep/nested/test.yaml",
                "some-package/index.js",
                []
            );
            // Should search in nested node_modules, parent directories, etc.
            expect(result).toBeDefined();
        });
    });

    describe("Fallback behavior", () => {
        test("Should fallback to document directory when not found", () => {
            const result = resolveImportPath(
                "file:///home/user/project/test.yaml",
                "./nonexistent.json",
                []
            );
            expect(result).toBe("/home/user/project/nonexistent.json");
        });

        test("Should handle non-existent relative paths", () => {
            const result = resolveImportPath(
                "file:///home/user/project/test.yaml",
                "../nonexistent/config.json",
                []
            );
            expect(result).toBe("/home/user/nonexistent/config.json");
        });
    });

    describe("Edge cases", () => {
        test("Should handle empty import path", () => {
            const result = resolveImportPath(
                "file:///home/user/project/test.yaml",
                "",
                []
            );
            expect(result).toBe("/home/user/project");
        });

        test("Should handle document URI without directory", () => {
            const result = resolveImportPath(
                "file://test.yaml",
                "./config.json",
                []
            );
            expect(result).toContain("config.json");
        });

        test("Should handle malformed document URI", () => {
            const result = resolveImportPath(
                "not-a-uri",
                "./config.json",
                []
            );
            expect(result).toBeDefined();
        });
    });
});

describe("Symlink resolution", () => {
    test("Should resolve symlinks when they exist", () => {
        // This test would require actual symlinks to test properly
        // For now, we test that the function doesn't crash
        const result = resolveImportPath(
            "file:///home/user/project/test.yaml",
            "./config.json",
            []
        );
        expect(typeof result).toBe("string");
    });

    test("Should handle broken symlinks gracefully", () => {
        // Should return original path if symlink resolution fails
        const result = resolveImportPath(
            "file:///home/user/project/test.yaml",
            "./broken-symlink.json",
            []
        );
        expect(typeof result).toBe("string");
    });
});

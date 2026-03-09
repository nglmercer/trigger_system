import { describe, test, expect } from "bun:test";
import { TriggerUtils } from "../../src/utils/utils";
import { uriToPath, pathToUri, resolveImportPath } from "../../src/lsp/path-utils";
import type { TriggerContext } from "../../src/types";

describe("TriggerUtils Tests", () => {
  const mockContext: TriggerContext = {
    event: "TEST",
    id: "1",
    timestamp: Date.now(),
    data: {
      user: {
        name: "John",
        age: 30,
        tags: ["admin", "premium"]
      },
      score: 85,
      items: ["a", "b", "c"]
    },
    vars: {
      envVal: "test"
    }
  };

  describe("getNestedValue", () => {
    test("should get nested value from data object", () => {
      expect(TriggerUtils.getNestedValue("data.user.name", mockContext)).toBe("John");
      expect(TriggerUtils.getNestedValue("data.user.age", mockContext)).toBe(30);
    });

    test("should get value from vars", () => {
      expect(TriggerUtils.getNestedValue("vars.envVal", mockContext)).toBe("test");
    });

    test("should return undefined for non-existent path", () => {
      expect(TriggerUtils.getNestedValue("data.nonexistent", mockContext)).toBeUndefined();
      expect(TriggerUtils.getNestedValue("data.user.nothing", mockContext)).toBeUndefined();
    });

    test("should handle array access", () => {
      expect(TriggerUtils.getNestedValue("data.items.0", mockContext)).toBe("a");
      expect(TriggerUtils.getNestedValue("data.user.tags.0", mockContext)).toBe("admin");
    });
  });

  describe("interpolate", () => {
    test("should interpolate data values", () => {
      const result = TriggerUtils.interpolate("Hello ${data.user.name}!", mockContext);
      expect(result).toBe("Hello John!");
    });

    test("should interpolate vars values", () => {
      const result = TriggerUtils.interpolate("Env: ${vars.envVal}", mockContext);
      expect(result).toBe("Env: test");
    });

    test("should keep unmatched expressions as-is", () => {
      const result = TriggerUtils.interpolate("Hello ${data.missing}", mockContext);
      expect(result).toBe("Hello ${data.missing}");
    });

    test("should handle non-string template", () => {
        //@ts-expect-error - testing non-string template
      expect(TriggerUtils.interpolate(123 as any, mockContext)).toBe(123);
      expect(TriggerUtils.interpolate(null as any, mockContext)).toBeNull();
    });

    test("should handle multiple interpolations", () => {
      const result = TriggerUtils.interpolate(
        "${data.user.name} is ${data.user.age} years old",
        mockContext
      );
      expect(result).toBe("John is 30 years old");
    });
  });

  describe("compare", () => {
    test("should compare with EQ", () => {
      expect(TriggerUtils.compare("test", "EQ", "test")).toBe(true);
      expect(TriggerUtils.compare("test", "EQ", "other")).toBe(false);
      expect(TriggerUtils.compare(5, "EQ", "5")).toBe(true); // loose equality
    });

    test("should compare with NEQ", () => {
      expect(TriggerUtils.compare("test", "NEQ", "other")).toBe(true);
      expect(TriggerUtils.compare("test", "NEQ", "test")).toBe(false);
    });

    test("should compare with GT/GTE/LT/LTE", () => {
      expect(TriggerUtils.compare(10, "GT", 5)).toBe(true);
      expect(TriggerUtils.compare(10, "GTE", 10)).toBe(true);
      expect(TriggerUtils.compare(5, "LT", 10)).toBe(true);
      expect(TriggerUtils.compare(5, "LTE", 5)).toBe(true);
    });

    test("should compare with IN/NOT_IN", () => {
      expect(TriggerUtils.compare("a", "IN", ["a", "b", "c"])).toBe(true);
      expect(TriggerUtils.compare("x", "IN", ["a", "b", "c"])).toBe(false);
      expect(TriggerUtils.compare("x", "NOT_IN", ["a", "b", "c"])).toBe(true);
      expect(TriggerUtils.compare("a", "NOT_IN", ["a", "b", "c"])).toBe(false);
    });

    test("should compare with CONTAINS/NOT_CONTAINS", () => {
      expect(TriggerUtils.compare("hello world", "CONTAINS", "world")).toBe(true);
      expect(TriggerUtils.compare("hello world", "CONTAINS", "xyz")).toBe(false);
      expect(TriggerUtils.compare("hello world", "NOT_CONTAINS", "xyz")).toBe(true);
      expect(TriggerUtils.compare(["a", "b"], "CONTAINS", "a")).toBe(true);
      expect(TriggerUtils.compare(["a", "b"], "CONTAINS", "c")).toBe(false);
    });

    test("should compare with STARTS_WITH/ENDS_WITH", () => {
      expect(TriggerUtils.compare("hello", "STARTS_WITH", "hel")).toBe(true);
      expect(TriggerUtils.compare("hello", "STARTS_WITH", "xyz")).toBe(false);
      expect(TriggerUtils.compare("hello", "ENDS_WITH", "lo")).toBe(true);
      expect(TriggerUtils.compare("hello", "ENDS_WITH", "xyz")).toBe(false);
    });

    test("should compare with IS_EMPTY", () => {
      expect(TriggerUtils.compare("", "IS_EMPTY", undefined)).toBe(true);
      expect(TriggerUtils.compare([], "IS_EMPTY", undefined)).toBe(true);
      expect(TriggerUtils.compare({}, "IS_EMPTY", undefined)).toBe(true);
      expect(TriggerUtils.compare("hello", "IS_EMPTY", undefined)).toBe(false);
      expect(TriggerUtils.compare([1,2], "IS_EMPTY", undefined)).toBe(false);
    });

    test("should compare with IS_NULL/IS_NONE", () => {
      expect(TriggerUtils.compare(null, "IS_NULL", undefined)).toBe(true);
      expect(TriggerUtils.compare(undefined, "IS_NONE", undefined)).toBe(true);
      expect(TriggerUtils.compare("test", "IS_NULL", undefined)).toBe(false);
    });

    test("should compare with HAS_KEY", () => {
      expect(TriggerUtils.compare({ a: 1 }, "HAS_KEY", "a")).toBe(true);
      expect(TriggerUtils.compare({ a: 1 }, "HAS_KEY", "b")).toBe(false);
      expect(TriggerUtils.compare("string", "HAS_KEY", "a")).toBe(false);
    });

    test("should compare with MATCHES", () => {
      expect(TriggerUtils.compare("hello", "MATCHES", "hel.*")).toBe(true);
      expect(TriggerUtils.compare("hello", "MATCHES", "^hel")).toBe(true);
      expect(TriggerUtils.compare("hello", "MATCHES", "xyz")).toBe(false);
    });

    test("should compare with RANGE", () => {
      expect(TriggerUtils.compare(5, "RANGE", [1, 10])).toBe(true);
      expect(TriggerUtils.compare(0, "RANGE", [1, 10])).toBe(false);
      expect(TriggerUtils.compare(15, "RANGE", [1, 10])).toBe(false);
      expect(TriggerUtils.compare("5", "RANGE", [1, 10])).toBe(true); // string conversion
    });

    test("should handle unknown operator", () => {
      expect(TriggerUtils.compare("test", "UNKNOWN" as any, "value")).toBe(false);
    });
  });
});

describe("Path Utils Tests", () => {
  describe("uriToPath", () => {
    test("should convert Unix file URI to path", () => {
      expect(uriToPath("file:///etc/passwd")).toBe("/etc/passwd");
    });

    test("should convert Windows file URI to path", () => {
      const result = uriToPath("file:///C:/Users/test");
      expect(result).toMatch(/Users[\\\/]test/i);
    });

    test("should handle malformed URI", () => {
      // On Linux, normalize converts to \test
      const result = uriToPath("file://test");
      expect(result).toMatch(/^(\\.test|\.\/test)$/);
    });

    test("should handle Windows UNC paths", () => {
      const result = uriToPath("file://server/share/file.txt");
      expect(result).toContain("server");
    });

    test("should handle regular paths (non-URI)", () => {
      expect(uriToPath("/some/path")).toBe("/some/path");
    });
  });

  describe("pathToUri", () => {
    test("should convert Unix path to URI", () => {
      expect(pathToUri("/etc/passwd")).toBe("file:///etc/passwd");
    });

    test("should convert Windows path to URI", () => {
      const result = pathToUri("C:\\Users\\test");
      expect(result).toBe("file:///C:/Users/test");
    });

    test("should handle relative paths", () => {
      const result = pathToUri("./file.txt");
      expect(result).toContain("file.txt");
    });
  });

  describe("resolveImportPath", () => {
    test("should resolve absolute paths", () => {
      const result = resolveImportPath("file:///test/doc.yaml", "/absolute/path.yaml", []);
      expect(result).toBe("/absolute/path.yaml");
    });

    test("should resolve relative paths", () => {
      const result = resolveImportPath(
        "file:///tmp/test.yaml", 
        "./other.yaml",
        []
      );
      expect(result).toContain("other.yaml");
    });

    test("should resolve workspace-relative paths", () => {
      const result = resolveImportPath(
        "file:///project/src/file.yaml",
        "data.json",
        ["file:///project"]
      );
      expect(result).toContain("data.json");
    });
  });
});

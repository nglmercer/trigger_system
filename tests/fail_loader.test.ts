import { describe, expect, test } from "bun:test";
import { TriggerLoader } from "../src/node";
import * as path from "path";

describe("TriggerLoader Error Handling", () => {
    const incorrectDir = path.join(import.meta.dir, "./incorrect");
    test("Should throw/fail gracefully on bad YAML syntax", async () => {
        const filePath = path.join(incorrectDir, "bad_syntax.yaml");
        const errors:Record<string, any>[] = [];
        const result = await TriggerLoader.loadRule(filePath,(error)=>{
            errors.push(error as Record<string, any>);
        });
        console.log(errors[0]!.message)
        expect(errors).toHaveLength(1);
        expect(result).toHaveLength(0);
    });

    test("loadRulesFromDir should skip invalid files but load valid ones (if any)", async () => {
        // This directory only contains bad files
        const rules = await TriggerLoader.loadRulesFromDir(incorrectDir);
        expect(rules).toHaveLength(1);
    });
});


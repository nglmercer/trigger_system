
import { describe, expect, test } from "bun:test";
import { TriggerEngine } from "../../src/core/engine";
import { ContextAdapter } from "../../src/core/context-adapter";
import { StateManager } from "../../src/core/state-manager";
import type { TriggerRule } from "../../src/types";

describe("Global Scope & StateManager Access", () => {
    
    test("Should access standard globals (e.g. Math, Date)", async () => {
        const engine = new TriggerEngine();
        engine.registerAction("LOG", async (params) => {
            return params.msg; 
        });
        
        // Rule using accessible globals
        const rule: TriggerRule = {
            id: "global-test",
            on: "TEST_EVENT",
            if: {
                field: "data.value",
                operator: "GT",
                value: "${Math.max(1, 5)}" // Should evaluate to 5
            },
            do: {
                type: "LOG",
                params: {
                    msg: "Date is ${new Date().getFullYear()}"
                }
            }
        };

        // Hack to inject rule
        (engine as any).rules = [rule];

        const context = ContextAdapter.create("TEST_EVENT", { value: 6 });
        const results = await engine.processEvent(context);

        expect(results).toHaveLength(1);
        expect(results[0]!.success).toBe(true);
        expect(results[0]!.executedActions[0]!.result).toBeDefined(); // LOG usually returns undefined, but checks execution
    });

    test("Should access explicitly injected globals (StateManager)", async () => {
        const engine = new TriggerEngine();
        
        // Capture logs to verify output
        const logs: string[] = [];
        engine.registerAction("LOG", async (params) => { 
            logs.push(String(params.msg));
            return params.msg; 
        });

        const stateManager = StateManager.getInstance();
        await stateManager.set("test_counter", 10);
        await stateManager.set("global_status", "ACTIVE");

        // Rule accessing StateManager via globals
        const ruleUsingGlobals: TriggerRule = {
             id: "state-test-globals",
             on: "TEST_EVENT",
             if: {
                 // Condition: Check if counter in StateManager is 10
                 field: "data.value",
                 operator: "EQ",
                 value: "${vars.StateManager.get('test_counter')}"
             },
             do: {
                 type: "LOG",
                 params: {
                     // Action: Interpolate values from StateManager
                     msg: "Counter: ${vars.StateManager.get('test_counter')}, Status: ${vars.StateManager.get('global_status')}"
                 }
             }
         };
         
         (engine as any).rules = [ruleUsingGlobals];

         // Inject StateManager into context globals when creating context
         const context = ContextAdapter.create("TEST_EVENT", { value: 10 }, { StateManager: stateManager });
         
         const results = await engine.processEvent(context);
         
         expect(results).toHaveLength(1);
         expect(results[0]!.success).toBe(true);

         // Verify that values were correctly retrieved and interpolated
         expect(logs.length).toBe(1);
         expect(logs[0]).toBe("Counter: 10, Status: ACTIVE");
    });

    test("Should expose an Emitter globally and trigger events from rules", async () => {
        const engine = new TriggerEngine();
        const EventEmitter = await import("node:events");
        const globalEmitter = new EventEmitter.default();
        
        let receivedMessage = "";
        globalEmitter.on("ping", (payload) => {
            receivedMessage = payload;
            console.log("Received message:", payload);
        });

        const rule: TriggerRule = {
            id: "emitter-test",
            on: "TEST_EVENT",
            // Usage in condition: verify we can call side-effects (Not recommended for pure conditions, but possible)
            // Or usually used in Actions. 
            // Here we verify we can call it in a LOG params interpolation, which executes the emit.
            do: {
                type: "LOG",
                params: {
                    // This expression invokes the emit method. 
                    // Note: ensure 'emit' returns something string-friendly or is ignored?
                    // emit returns true if had listeners.
                    msg: "Emitted: ${vars.emitter.emit('ping', 'hello from rule')}"
                }
            }
        };

        // Mock LOG to run the interpolation
        engine.registerAction("LOG", async (params) => { return params.msg; });

        (engine as any).rules = [rule];

        const context = ContextAdapter.create(
            "TEST_EVENT", 
            {}, 
            { emitter: globalEmitter }
        );

        await engine.processEvent(context);


        expect(receivedMessage).toBe("hello from rule");
    });

    test("Should evaluate expressions and function calls in 'field' property", async () => {
        const engine = new TriggerEngine();
        engine.registerAction("LOG", async (params) => { return params.msg; });

        const utils = {
            trim: (s: string) => s.trim()
        };

        const rule: TriggerRule = {
            id: "field-expr-test",
            on: "TEST_EVENT",
            if: {
                // Testing complex expression in field
                field: "vars.utils.trim(data.comment).toLowerCase()",
                operator: "EQ",
                value: "hello"
            },
            do: {
                type: "LOG",
                params: { msg: "Matched" }
            }
        };

        (engine as any).rules = [rule];

        const context = ContextAdapter.create(
            "TEST_EVENT", 
            { comment: "  HELLO  " }, 
            { utils }
        );

        const results = await engine.processEvent(context);
        expect(results).toHaveLength(1);
        expect(results[0]!.success).toBe(true);
    });

    test("Should evaluate global regex in 'field' property", async () => {
        const engine = new TriggerEngine();
        engine.registerAction("LOG", async (params) => { return params.msg; });

        const rule: TriggerRule = {
            id: "field-regex-test",
            on: "TEST_EVENT",
            if: {
                field: "vars.spamRegex.test(data.comment)",
                operator: "EQ",
                value: true
            },
            do: {
                type: "LOG",
                params: { msg: "Spam detected" }
            }
        };

        (engine as any).rules = [rule];

        const context = ContextAdapter.create(
            "TEST_EVENT", 
            { comment: "This is a badword." }, 
            { spamRegex: /badword/i }
        );

        const results = await engine.processEvent(context);
        expect(results).toHaveLength(1);
    });
});

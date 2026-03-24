/**
 * HTTP Methods Tests for http_methods.yaml
 * Tests FORWARD action with GET, POST, PUT, PATCH, DELETE methods
 * Uses bun serve for real HTTP requests testing
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { RuleEngine } from "../../src/core/rule-engine";
import { ActionRegistry } from "../../src/core/action-registry";
import { TriggerLoader } from "../../src/io/loader.node";
import type { TriggerRule, TriggerContext } from "../../src/types";
import path from "path";

describe("HTTP Methods (FORWARD Action) Tests with bun serve", () => {
    let engine: RuleEngine;
    const registry = ActionRegistry.getInstance();

    // Server instance
    let server: ReturnType<typeof import("bun").serve>;
    
    // Track requests made to the server
    let serverRequests: Array<{
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: any;
    }> = [];

    beforeEach(async () => {
        serverRequests = [];

        // Start a local HTTP server using bun serve
        server = Bun.serve({
            port: 0, // Random available port
            fetch(req) {
                const url = new URL(req.url, `http://localhost:${server.port}`);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const headers: Record<string, string> = {};
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                for (const [key, value] of (req.headers as any)) {
                    headers[key] = value;
                }
                serverRequests.push({
                    url: url.pathname + url.search,
                    method: req.method,
                    headers: headers,
                });
                
                // For POST/PUT/PATCH, also capture body
                if (["POST", "PUT", "PATCH"].includes(req.method)) {
                    return req.json().then(body => {
                        serverRequests[serverRequests.length - 1]!.body = body;
                        return Response.json({ success: true, received: body });
                    });
                }
                
                return Response.json({ success: true });
            },
        });
    });

    afterEach(() => {
        // Stop the server
        if (server) {
            server.stop();
        }
    });

    describe("GET Methods", () => {
        test("Should execute basic GET request", async () => {
            const rule: TriggerRule = {
                id: "fetch-get-users",
                on: "API_GET_USERS",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:" + server.port + "/users",
                        method: "GET"
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_GET_USERS",
                id: "test-1",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            // Debug: print result to see what's happening
            console.log("GET result:", JSON.stringify(results[0]?.executedActions[0]?.result));
            expect(results[0]!.success).toBe(true);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("GET");
            expect(serverRequests[0]!.url).toBe("/users");
        });

        test("Should execute GET with dynamic URL parameters", async () => {
            const rule: TriggerRule = {
                id: "fetch-get-user-by-id",
                on: "API_GET_USER",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:" + server.port + "/users/${data.userId}",
                        method: "GET"
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_GET_USER",
                id: "test-2",
                timestamp: Date.now(),
                data: { userId: 42 }
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.url).toBe("/users/42");
        });

        test("Should execute GET with custom headers", async () => {
            const rule: TriggerRule = {
                id: "fetch-get-with-auth",
                on: "API_GET_PROTECTED",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:" + server.port + "/protected",
                        method: "GET",
                        headers: {
                            Authorization: "Bearer my-token",
                            "X-Custom-Header": "custom-value"
                        }
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_GET_PROTECTED",
                id: "test-3",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.headers["authorization"]).toBe("Bearer my-token");
            expect(serverRequests[0]!.headers["x-custom-header"]).toBe("custom-value");
        });
    });

    describe("POST Methods", () => {
        test("Should execute POST with automatic body from context data", async () => {
            const rule: TriggerRule = {
                id: "fetch-post-create-user",
                on: "API_CREATE_USER",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:" + server.port + "/users",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_CREATE_USER",
                id: "test-4",
                timestamp: Date.now(),
                data: { name: "John Doe", email: "john@example.com" }
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("POST");
            expect(serverRequests[0]!.body).toEqual({ name: "John Doe", email: "john@example.com" });
        });

        test("Should execute POST and verify body is context data", async () => {
            // Note: Current FORWARD implementation uses context.data as body
            const rule: TriggerRule = {
                id: "fetch-post-custom-body",
                on: "API_SUBMIT_FORM",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:" + server.port + "/posts",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_SUBMIT_FORM",
                id: "test-5",
                timestamp: Date.now(),
                data: { title: "Hello World", content: "This is a post", userId: 1 }
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.body).toEqual({
                title: "Hello World",
                content: "This is a post",
                userId: 1
            });
        });
    });

    describe("PUT Method (Full Update)", () => {
        test("Should execute PUT request for full update", async () => {
            const rule: TriggerRule = {
                id: "fetch-put-update-user",
                on: "API_UPDATE_USER",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:" + server.port + "/users/${data.userId}",
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_UPDATE_USER",
                id: "test-6",
                timestamp: Date.now(),
                data: {
                    userId: 5,
                    name: "Jane Doe",
                    email: "jane@example.com",
                    username: "janedoe"
                }
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("PUT");
            expect(serverRequests[0]!.url).toBe("/users/5");
            expect(serverRequests[0]!.body).toEqual({
                userId: 5,
                name: "Jane Doe",
                email: "jane@example.com",
                username: "janedoe"
            });
        });
    });

    describe("PATCH Method (Partial Update)", () => {
        test("Should execute PATCH request for partial update", async () => {
            const rule: TriggerRule = {
                id: "fetch-patch-partial-update",
                on: "API_PATCH_USER",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:" + server.port + "/users/${data.userId}",
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_PATCH_USER",
                id: "test-7",
                timestamp: Date.now(),
                data: { userId: 10, email: "newemail@example.com" }
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("PATCH");
            expect(serverRequests[0]!.body).toEqual({ userId: 10, email: "newemail@example.com" });
        });
    });

    describe("DELETE Methods", () => {
        test("Should execute basic DELETE request", async () => {
            const rule: TriggerRule = {
                id: "fetch-delete-user",
                on: "API_DELETE_USER",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:" + server.port + "/users/${data.userId}",
                        method: "DELETE"
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_DELETE_USER",
                id: "test-8",
                timestamp: Date.now(),
                data: { userId: 15 }
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("DELETE");
            expect(serverRequests[0]!.url).toBe("/users/15");
        });

        test("Should execute DELETE with conditional (only when confirm is true)", async () => {
            const rules: TriggerRule[] = [
                {
                    id: "fetch-delete-conditional",
                    on: "API_SOFT_DELETE",
                    if: {
                        field: "data.confirm",
                        operator: "EQ",
                        value: true
                    },
                    do: {
                        type: "forward",
                        params: {
                            url: "http://localhost:" + server.port + "/users/${data.userId}",
                            method: "DELETE",
                            headers: {
                                "X-Soft-Delete": "true"
                            }
                        }
                    }
                }
            ];

            engine = new RuleEngine({
                rules: rules,
                globalSettings: { evaluateAll: true }
            });

            // Test 1: confirm is true - should execute DELETE
            const context1: TriggerContext = {
                event: "API_SOFT_DELETE",
                id: "test-9a",
                timestamp: Date.now(),
                data: { userId: 20, confirm: true }
            };

            let results = await engine.evaluateContext(context1);
            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("DELETE");
            expect(serverRequests[0]!.headers["x-soft-delete"]).toBe("true");

            // Reset requests
            serverRequests = [];

            // Test 2: confirm is false - should NOT execute DELETE
            const context2: TriggerContext = {
                event: "API_SOFT_DELETE",
                id: "test-9b",
                timestamp: Date.now(),
                data: { userId: 21, confirm: false }
            };

            results = await engine.evaluateContext(context2);
            expect(results).toHaveLength(0);
            expect(serverRequests).toHaveLength(0);
        });
    });

    describe("Conditional HTTP Methods (Dynamic Method Selection)", () => {
        test("Should execute different methods based on action field", async () => {
            const baseUrl = "http://localhost:" + server.port;
            const rules: TriggerRule[] = [
                {
                    id: "conditional-method-create",
                    on: "API_DYNAMIC_METHOD",
                    if: {
                        field: "data.action",
                        operator: "EQ",
                        value: "create"
                    },
                    do: {
                        type: "forward",
                        params: {
                            url: baseUrl + "/posts",
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    }
                },
                {
                    id: "conditional-method-update",
                    on: "API_DYNAMIC_METHOD",
                    if: {
                        field: "data.action",
                        operator: "EQ",
                        value: "update"
                    },
                    do: {
                        type: "forward",
                        params: {
                            url: baseUrl + "/posts/${data.id}",
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    }
                },
                {
                    id: "conditional-method-delete",
                    on: "API_DYNAMIC_METHOD",
                    if: {
                        field: "data.action",
                        operator: "EQ",
                        value: "delete"
                    },
                    do: {
                        type: "forward",
                        params: {
                            url: baseUrl + "/posts/${data.id}",
                            method: "DELETE"
                        }
                    }
                }
            ];

            engine = new RuleEngine({
                rules: rules,
                globalSettings: { evaluateAll: true }
            });

            // Test create action
            const createContext: TriggerContext = {
                event: "API_DYNAMIC_METHOD",
                id: "test-10a",
                timestamp: Date.now(),
                data: { action: "create", payload: { title: "New Post" } }
            };

            let results = await engine.evaluateContext(createContext);
            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("POST");

            // Reset and test update
            serverRequests = [];
            const updateContext: TriggerContext = {
                event: "API_DYNAMIC_METHOD",
                id: "test-10b",
                timestamp: Date.now(),
                data: { action: "update", id: 5, payload: { title: "Updated Post" } }
            };

            results = await engine.evaluateContext(updateContext);
            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("PUT");
            expect(serverRequests[0]!.url).toBe("/posts/5");

            // Reset and test delete
            serverRequests = [];
            const deleteContext: TriggerContext = {
                event: "API_DYNAMIC_METHOD",
                id: "test-10c",
                timestamp: Date.now(),
                data: { action: "delete", id: 10 }
            };

            results = await engine.evaluateContext(deleteContext);
            expect(results).toHaveLength(1);
            expect(serverRequests).toHaveLength(1);
            expect(serverRequests[0]!.method).toBe("DELETE");
        });
    });

    describe("Full CRUD Sequence (Action Group with SEQUENCE mode)", () => {
        test("Should execute full CRUD sequence", async () => {
            const baseUrl = "http://localhost:" + server.port;
            const rule: TriggerRule = {
                id: "full-crud-example",
                on: "API_FULL_CRUD",
                do: {
                    mode: "SEQUENCE",
                    actions: [
                        // Step 1: Create (POST)
                        {
                            type: "forward",
                            params: {
                                url: baseUrl + "/posts",
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                }
                            }
                        },
                        // Step 2: Update (PUT)
                        {
                            type: "forward",
                            params: {
                                url: baseUrl + "/posts/1",
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json"
                                }
                            }
                        },
                        // Step 3: Delete
                        {
                            type: "forward",
                            params: {
                                url: baseUrl + "/posts/1",
                                method: "DELETE"
                            }
                        }
                    ]
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_FULL_CRUD",
                id: "test-11",
                timestamp: Date.now(),
                data: { title: "My Post", body: "Post content" }
            };

            const results = await engine.evaluateContext(context);

            expect(results).toHaveLength(1);
            expect(results[0]!.executedActions).toHaveLength(3);

            // Verify all three HTTP calls were made
            expect(serverRequests).toHaveLength(3);

            // First call: POST (Create)
            expect(serverRequests[0]!.method).toBe("POST");
            expect(serverRequests[0]!.body).toEqual({
                title: "My Post",
                body: "Post content"
            });

            // Second call: PUT (Update)
            expect(serverRequests[1]!.method).toBe("PUT");
            expect(serverRequests[1]!.body).toEqual({
                title: "My Post",
                body: "Post content"
            });

            // Third call: DELETE
            expect(serverRequests[2]!.method).toBe("DELETE");
        });
    });

    describe("Error Handling", () => {
        test("Should handle connection errors gracefully", async () => {
            const rule: TriggerRule = {
                id: "fetch-error-handling",
                on: "API_ERROR_TEST",
                do: {
                    type: "forward",
                    params: {
                        url: "http://localhost:1/api", // Invalid port
                        method: "GET"
                    }
                }
            };

            engine = new RuleEngine({
                rules: [rule],
                globalSettings: { evaluateAll: true }
            });

            const context: TriggerContext = {
                event: "API_ERROR_TEST",
                id: "test-12",
                timestamp: Date.now(),
                data: {}
            };

            const results = await engine.evaluateContext(context);

            // The rule should execute but return an error in the result
            expect(results).toHaveLength(1);
            const forwardAction = results[0]!.executedActions[0];
            expect(forwardAction).toBeDefined();
            expect(forwardAction!.result).toHaveProperty("error");
        });
    });

    describe("YAML Integration Test", () => {
        test("Should load rules from http_methods.yaml and validate structure", async () => {
            // Load rules from the YAML file to verify they're valid
            const yamlPath = path.join(import.meta.dir, "../rules/examples/http_methods.yaml");
            const rules = await TriggerLoader.loadRule(yamlPath);

            // Verify rules loaded correctly
            expect(rules.length).toBeGreaterThan(0);

            // Verify key rules exist in the YAML
            const ruleIds = rules.map(r => r.id);
            expect(ruleIds).toContain("fetch-get-users");
            expect(ruleIds).toContain("fetch-post-create-user");
            expect(ruleIds).toContain("fetch-delete-user");
            expect(ruleIds).toContain("full-crud-example");

            // Verify some rules have correct structure
            const getRule = rules.find(r => r.id === "fetch-get-users");
            expect(getRule).toBeDefined();
            const doAny = getRule!.do as any;
            expect(doAny.type).toBe("FORWARD");
            expect(doAny.params.method).toBe("GET");

            // Verify sequence action group exists
            const crudRule = rules.find(r => r.id === "full-crud-example");
            expect(crudRule).toBeDefined();
            const crudDo = crudRule!.do as any;
            expect(crudDo.mode).toBe("SEQUENCE");
            expect(crudDo.actions).toHaveLength(4); // POST, LOG, PUT, DELETE
        });
    });
});

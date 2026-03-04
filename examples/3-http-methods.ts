/**
 * Example 3: HTTP Methods with Fetch
 * 
 * Demonstrates how to use all HTTP methods (GET, POST, PUT, DELETE, PATCH)
 * using the RuleEngine's built-in FORWARD action.
 * 
 * This example shows:
 * 1. Basic HTTP methods (GET, POST, PUT, PATCH, DELETE)
 * 2. Custom headers and authentication
 * 3. Dynamic URL interpolation with template variables
 * 4. Conditional requests based on data
 * 5. Response handling
 * 6. Full CRUD sequence
 */

import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";

// Enable global observation
setupExampleObserver();

// Mock API base URL for demonstration
const API_BASE = "https://jsonplaceholder.typicode.com";

async function runExample() {
  console.log("\n=== Running Example 3: HTTP Methods with Fetch ===\n");

  // Create engine with rules for each HTTP method
  const engine = new RuleEngine({
    rules: [
      // === GET Request ===
      {
        id: "fetch-get-users",
        on: "API_GET_USERS",
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/users",
            method: "GET"
          }
        }
      },
      // GET with query parameters (dynamic)
      {
        id: "fetch-get-user-by-id",
        on: "API_GET_USER",
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/users/${data.userId}",
            method: "GET"
          }
        }
      },
      // GET with headers
      {
        id: "fetch-get-with-auth",
        on: "API_GET_PROTECTED",
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/posts/1",
            method: "GET",
            headers: {
              "Authorization": "Bearer ${vars.apiToken}",
              "X-Custom-Header": "custom-value"
            }
          }
        }
      },

      // === POST Request ===
      {
        id: "fetch-post-create-user",
        on: "API_CREATE_USER",
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/users",
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            }
            // body is automatically set to context.data
          }
        }
      },
      // POST with custom body
      {
        id: "fetch-post-custom-body",
        on: "API_SUBMIT_FORM",
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/posts",
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: {
              title: "data.title",
              body: "data.content",
              userId: "data.userId"
            }
          }
        }
      },

      // === PUT Request (Full Update) ===
      {
        id: "fetch-put-update-user",
        on: "API_UPDATE_USER",
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/users/${data.userId}",
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: {
              id: "data.userId",
              name: "data.name",
              email: "data.email",
              username: "data.username"
            }
          }
        }
      },

      // === PATCH Request (Partial Update) ===
      {
        id: "fetch-patch-partial-update",
        on: "API_PATCH_USER",
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/users/${data.userId}",
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: {
              email: "data.email"
            }
          }
        }
      },

      // === DELETE Request ===
      {
        id: "fetch-delete-user",
        on: "API_DELETE_USER",
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/users/${data.userId}",
            method: "DELETE"
          }
        }
      },
      // DELETE with conditional
      {
        id: "fetch-delete-conditional",
        on: "API_SOFT_DELETE",
        if: {
          field: "data.confirm",
          operator: "==",
          value: true
        },
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/users/${data.userId}",
            method: "DELETE",
            headers: {
              "X-Soft-Delete": "true"
            }
          }
        }
      },

      // === Advanced: Multiple Methods in Sequence (Full CRUD) ===
      {
        id: "full-crud-example",
        on: "API_FULL_CRUD",
        do: {
          mode: "SEQUENCE",
          actions: [
            {
              // Step 1: Create
              type: "FORWARD",
              params: {
                url: API_BASE + "/posts",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: { title: "data.title", body: "data.body", userId: 1 }
              }
            },
            {
              // Step 2: Log that creation happened
              type: "LOG",
              params: { message: "Created post, now fetching..." }
            },
            {
              // Step 3: Update (PUT)
              type: "FORWARD",
              params: {
                url: API_BASE + "/posts/1",
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: { id: 1, title: "data.title", body: "data.body", userId: 1 }
              }
            },
            {
              // Step 4: Delete
              type: "FORWARD",
              params: {
                url: API_BASE + "/posts/1",
                method: "DELETE"
              }
            }
          ]
        }
      },

      // === Conditional HTTP Methods ===
      {
        id: "conditional-method-create",
        on: "API_DYNAMIC_METHOD",
        if: {
          field: "data.action",
          operator: "==",
          value: "create"
        },
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/posts",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "data.payload"
          }
        }
      },
      {
        id: "conditional-method-update",
        on: "API_DYNAMIC_METHOD",
        if: {
          field: "data.action",
          operator: "==",
          value: "update"
        },
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/posts/${data.id}",
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: "data.payload"
          }
        }
      },
      {
        id: "conditional-method-delete",
        on: "API_DYNAMIC_METHOD",
        if: {
          field: "data.action",
          operator: "==",
          value: "delete"
        },
        do: {
          type: "FORWARD",
          params: {
            url: API_BASE + "/posts/${data.id}",
            method: "DELETE"
          }
        }
      }
    ],
    globalSettings: { debugMode: true }
  });

  // Test each HTTP method
  console.log("\n--- Testing GET Methods ---\n");
  
  console.log("1. GET /users (fetch all users)");
  await engine.processEvent({
    event: "API_GET_USERS",
    timestamp: Date.now(),
    data: {},
    vars: { apiToken: "demo-token-123" }
  });

  console.log("\n2. GET /users/:id (fetch specific user)");
  await engine.processEvent({
    event: "API_GET_USER",
    timestamp: Date.now(),
    data: { userId: 5 },
    vars: { apiToken: "demo-token-123" }
  });

  console.log("\n3. GET with custom headers");
  await engine.processEvent({
    event: "API_GET_PROTECTED",
    timestamp: Date.now(),
    data: {},
    vars: { apiToken: "my-secret-token" }
  });

  console.log("\n--- Testing POST Methods ---\n");

  console.log("4. POST /users (create user)");
  await engine.processEvent({
    event: "API_CREATE_USER",
    timestamp: Date.now(),
    data: {
      name: "John Doe",
      email: "john@example.com",
      username: "johndoe"
    }
  });

  console.log("\n5. POST /posts (submit form)");
  await engine.processEvent({
    event: "API_SUBMIT_FORM",
    timestamp: Date.now(),
    data: {
      title: "My Post Title",
      content: "This is the post content...",
      userId: 1
    }
  });

  console.log("\n--- Testing PUT Method ---\n");

  console.log("6. PUT /users/:id (full update)");
  await engine.processEvent({
    event: "API_UPDATE_USER",
    timestamp: Date.now(),
    data: {
      userId: 1,
      name: "John Updated",
      email: "john.updated@example.com",
      username: "johnupdated"
    }
  });

  console.log("\n--- Testing PATCH Method ---\n");

  console.log("7. PATCH /users/:id (partial update)");
  await engine.processEvent({
    event: "API_PATCH_USER",
    timestamp: Date.now(),
    data: {
      userId: 1,
      email: "new.email@example.com"
    }
  });

  console.log("\n--- Testing DELETE Methods ---\n");

  console.log("8. DELETE /users/:id");
  await engine.processEvent({
    event: "API_DELETE_USER",
    timestamp: Date.now(),
    data: { userId: 123 }
  });

  console.log("\n9. DELETE with confirmation (will execute - confirm is true)");
  await engine.processEvent({
    event: "API_SOFT_DELETE",
    timestamp: Date.now(),
    data: { userId: 456, confirm: true }
  });

  console.log("\n10. DELETE with confirmation (will NOT execute - confirm is false)");
  await engine.processEvent({
    event: "API_SOFT_DELETE",
    timestamp: Date.now(),
    data: { userId: 789, confirm: false }
  });

  console.log("\n--- Testing Dynamic Method Selection ---\n");

  console.log("11. Dynamic: action = 'create'");
  await engine.processEvent({
    event: "API_DYNAMIC_METHOD",
    timestamp: Date.now(),
    data: {
      action: "create",
      payload: { title: "New Post" }
    }
  });

  console.log("\n12. Dynamic: action = 'update'");
  await engine.processEvent({
    event: "API_DYNAMIC_METHOD",
    timestamp: Date.now(),
    data: {
      action: "update",
      id: 10,
      payload: { title: "Updated Post" }
    }
  });

  console.log("\n13. Dynamic: action = 'delete'");
  await engine.processEvent({
    event: "API_DYNAMIC_METHOD",
    timestamp: Date.now(),
    data: {
      action: "delete",
      id: 10
    }
  });

  console.log("\n=== Example 3 Complete ===");
  console.log("All HTTP methods (GET, POST, PUT, PATCH, DELETE) have been demonstrated.");
}

runExample().catch(console.error);

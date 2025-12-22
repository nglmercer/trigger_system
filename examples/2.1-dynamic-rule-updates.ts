import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";
import { triggerEmitter, EngineEvent } from "../src/node";
import type { RuleUpdateData } from "../src/types";

// Enable global observation
setupExampleObserver();

// Track rule updates
let ruleUpdateCount = 0;
triggerEmitter.on('rules:updated', (data: RuleUpdateData) => {
  ruleUpdateCount++;
  console.log(`[EVENT] Rules Updated: 📝 ${data.count} rules modified (Update #${ruleUpdateCount})`);
});

async function runExample() {
  console.log("\n=== Running Example 2.1: Dynamic Rule Updates ===");
  
  // Initial rules
  const engine = new RuleEngine({
    rules: [
      {
        id: "welcome-v1",
        on: "USER_LOGIN",
        if: { field: "data.isNew", operator: "==", value: true },
        do: { type: "LOG", params: { message: "Welcome v1: Hello ${data.username}!" } }
      }
    ],
    globalSettings: { debugMode: true }
  });

  console.log("\n1. Testing initial rule...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "john_doe", isNew: true }
  });

  // Update rules dynamically
  console.log("\n2. Updating rules dynamically...");
  engine.updateRules([
    {
      id: "welcome-v2",
      on: "USER_LOGIN",
      if: { field: "data.isNew", operator: "==", value: true },
      do: { type: "LOG", params: { message: "Welcome v2: Greetings ${data.username}, enjoy our new features!" } }
    },
    {
      id: "returning-user",
      on: "USER_LOGIN",
      if: { field: "data.isNew", operator: "==", value: false },
      do: { type: "LOG", params: { message: "Welcome back ${data.username}!" } }
    }
  ]);

  // Emit custom event for rule update
  triggerEmitter.emit('rules:updated', { count: 2 });

  console.log("\n3. Testing updated rules with new user...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "jane_smith", isNew: true }
  });

  console.log("\n4. Testing updated rules with returning user...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "john_doe", isNew: false }
  });

  // Another update - modify conditions
  console.log("\n5. Updating rules with new conditions...");
  engine.updateRules([
    {
      id: "premium-welcome",
      on: "USER_LOGIN",
      if: {
        operator: "AND",
        conditions: [
          { field: "data.isNew", operator: "==", value: true },
          { field: "data.subscription", operator: "==", value: "premium" }
        ]
      },
      do: { type: "LOG", params: { message: "Premium Welcome: ${data.username}, your VIP experience awaits!" } }
    },
    {
      id: "basic-welcome",
      on: "USER_LOGIN",
      if: {
        operator: "AND",
        conditions: [
          { field: "data.isNew", operator: "==", value: true },
          { field: "data.subscription", operator: "==", value: "basic" }
        ]
      },
      do: { type: "LOG", params: { message: "Basic Welcome: Hello ${data.username}, welcome aboard!" } }
    }
  ]);

  // Emit custom event for rule update
  triggerEmitter.emit('rules:updated', { count: 2 });

  console.log("\n6. Testing premium user...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "premium_user", isNew: true, subscription: "premium" }
  });

  console.log("\n7. Testing basic user...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "basic_user", isNew: true, subscription: "basic" }
  });

  console.log(`\n📊 Summary: Rules were updated ${ruleUpdateCount} times during this example`);
}

runExample().catch(console.error);
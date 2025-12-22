import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";

// Enable global observation
setupExampleObserver();

async function runExample() {
  const engine = new RuleEngine({
    rules: [
      {
        id: "onboarding-sequence",
        on: "USER_VERIFIED",
        do: {
          mode: "SEQUENCE",
          actions: [
            { type: "LOG", params: { message: "Step 1: Account Ready" } },
            { type: "LOG", params: { message: "Step 2: Sending Welcome Email" }, delay: 500 },
            { type: "LOG", params: { message: "Step 3: Setup Complete" }, delay: 500 }
          ]
        }
      },
      {
        id: "random-reward",
        on: "LOOT_BOX_OPEN",
        do: {
          mode: "EITHER",
          actions: [
            { type: "LOG", params: { item: "Common Sword" }, probability: 0.7 },
            { type: "LOG", params: { item: "Rare Shield" }, probability: 0.25 },
            { type: "LOG", params: { item: "Legendary Axe" }, probability: 0.05 }
          ]
        }
      }
    ],
    globalSettings: { debugMode: true }
  });

  console.log("\n--- Running Example 1.4: Action Groups ---");
  
  console.log("Triggering onboarding sequence (SEQUENCE mode)...");
  await engine.processEvent({
    event:"USER_VERIFIED", 
    data: {},
    timestamp: Date.now()
  });

  console.log("\nOpening 3 loot boxes (EITHER mode)...");
  await engine.processEvent({
    event:"LOOT_BOX_OPEN",data: {},timestamp: Date.now()
  });
  await engine.processEvent({
    event:"LOOT_BOX_OPEN",data: {},timestamp: Date.now()
  });
  await engine.processEvent({
    event:"LOOT_BOX_OPEN",data: {},timestamp: Date.now()
  });
}
/*
export interface TriggerContext {
  event: string;
  // Valid timestamps
  timestamp: number;
  // The data payload of the event
  data: Record<string, any>;
  id?: string;
  // Global variables (env vars, server state)
  globals?: Record<string, any>;
  // Dynamic State (counters, flags, goals)
  state?: Record<string, any>;
  // Helper for computing derived values
  helpers?: Record<string, Function>;
}

*/
runExample().catch(console.error);

import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";

// Enable global observation
setupExampleObserver();

async function runExample() {
  const engine = new RuleEngine({
    rules: [
      {
        id: "discount-rule",
        on: "PURCHASE",
        if: {
          operator: "AND",
          conditions: [
            { field: "data.amount", operator: ">", value: 100 },
            { field: "data.category", operator: "EQ", value: "electronics" }
          ]
        },
        do: {
          type: "APPLY_DISCOUNT",
          params: { percentage: 10 }
        }
      }
    ],
    globalSettings: { debugMode: true }
  });

  console.log("\n--- Running Example 1.1: Multiple Conditions ---");
  
  console.log("Processing qualifying purchase...");
  await engine.processEvent("PURCHASE", { amount: 150, category: "electronics" });

  console.log("Processing non-qualifying purchase (wrong category)...");
  await engine.processEvent("PURCHASE", { amount: 150, category: "books" });
}

runExample().catch(console.error);

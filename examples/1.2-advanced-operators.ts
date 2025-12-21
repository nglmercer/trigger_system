import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";

// Enable global observation
setupExampleObserver();

async function runExample() {
  const engine = new RuleEngine({
    rules: [
      {
        id: "location-check",
        on: "PAGE_VIEW",
        if: {
          field: "data.country",
          operator: "IN",
          value: ["US", "CA", "UK"]
        },
        do: { type: "SHOW_BANNER", params: { campaign: "summer-sale" } }
      },
      {
        id: "email-validation",
        on: "SIGNUP",
        if: {
          field: "data.email",
          operator: "MATCHES",
          value: "^[\\w-\\.]+@gmail\\.com$"
        },
        do: { type: "TAG_USER", params: { tag: "gmail-user" } }
      }
    ],
    globalSettings: { debugMode: true }
  });

  console.log("\n--- Running Example 1.2: Advanced Operators ---");
  
  console.log("Checking IN operator (US)...");
  await engine.processEvent("PAGE_VIEW", { country: "US" });

  console.log("Checking MATCHES operator (valid gmail)...");
  await engine.processEvent("SIGNUP", { email: "test@gmail.com" });
}

runExample().catch(console.error);

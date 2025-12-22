import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";

// Enable global observation
setupExampleObserver();

async function runExample() {

  const engine = new RuleEngine({
    rules: [
      {
        id: "welcome-rule",
        on: "USER_LOGIN",
        if: {
          field: "data.isNew",
          operator: "==",
          value: true
        },
        do: {
          type: "LOG",
          params: {
            message: "Welcome to the system, ${data.username}!"
          }
        }
      }
    ],
    globalSettings: { debugMode: true }
  });

  console.log("--- Running Example 1: Basic Rule ---");
  
  // Trigger the event
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: {
      username: "john_doe",
      isNew: true
    }
  });
}

runExample().catch(console.error);

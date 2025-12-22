import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";

// Enable global observation
setupExampleObserver();

async function runExample() {
  const engine = new RuleEngine({
    rules: [
      {
        id: "click-milestone",
        on: "BUTTON_CLICK",
        // Increment counter on every click
        do: [
          {
            type: "STATE_INCREMENT",
            params: { key: "clicks", amount: 1 }
          }
        ]
      },
      {
        id: "reward-rule",
        on: "BUTTON_CLICK",
        // Trigger only when counter reaches 5
        if: {
          field: "state.clicks",
          operator: "==",
          value: 5
        },
        do: {
          type: "LOG",
          params: { message: "Congratulations! 5 clicks reached!" }
        }
      }
    ],
    globalSettings: { debugMode: true }
  });

  console.log("\n--- Running Example 1.3: Stateful Counter ---");
  
  for (let i = 1; i <= 5; i++) {
    console.log(`Click #${i}`);
    await engine.processEvent({
      event:"BUTTON_CLICK", 
      data: {},
      timestamp: Date.now()
    });
  }
}

runExample().catch(console.error);

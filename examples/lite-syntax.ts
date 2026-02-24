import { RuleEngine } from "../src/node";

async function runExample() {
  const engine = new RuleEngine({
    rules: [
      {
        id: "event-processor",
        on: "user.login",
        do: [
          {
            name: "Update state directly",
            run: `
              state.counters = state.counters || {};
              state.counters.logins = (state.counters.logins || 0) + 1;
              state.last_login = new Date().toISOString();
            `
          },
          {
            if: { field: "state.counters.logins % 5", operator: "EQ", value: 0 },
            notify: "Reached a milestone: ${state.counters.logins} logins!"
          }
        ]
      }
    ],
    globalSettings: { debugMode: true }
  });

  console.log("\n--- Running Lite Syntax Example ---");

  for (let i = 1; i <= 5; i++) {
      console.log(`\nTriggering login ${i}...`);
      await engine.processEventSimple("user.login", { user_id: "user1" });
  }
}

runExample().catch(console.error);

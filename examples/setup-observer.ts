import { triggerEmitter, EngineEvent } from "../src/node";

/**
 * Shared utility to observe engine events in all examples
 */
export function setupExampleObserver() {
  triggerEmitter.on(EngineEvent.ENGINE_START, ({ rulesCount, context }) => {
    console.log(`\n[EVENT] Engine Started: Evaluating ${rulesCount} rules for event "${context.event}"`);
  });

  triggerEmitter.on(EngineEvent.RULE_MATCH, ({ rule }) => {
    console.log(`[EVENT] Rule Matched: ✅ "${rule.id}"`);
  });

  triggerEmitter.on(EngineEvent.ACTION_SUCCESS, ({ action, result }) => {
    console.log(`[EVENT] Action Success: 🚀 "${action.type}"`);
    if (result && Object.keys(result).length > 0) {
        // console.log(`       Result:`, result);
    }
  });

  triggerEmitter.on(EngineEvent.ACTION_ERROR, ({ action, error }) => {
    console.log(`[EVENT] Action Error: ❌ "${action.type}" - ${error}`);
  });

  triggerEmitter.on(EngineEvent.ENGINE_DONE, ({ results }) => {
    console.log(`[EVENT] Engine Done: ${results.length} rules triggered.\n`);
  });
}


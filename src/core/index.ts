export * from "./constants";
export * from "./expression-engine";
export * from "./event-queue";
export * from "./persistence";
// export * from "./persistence.node"; // Node Only - moved to node.ts entry point
export * from "./persistence-browser";

// New architecture: Base Engine + Extensions
export type { ITriggerEngine, EngineActionHandler } from "./base-engine";
export { TriggerEngine } from "./trigger-engine"; // Motor base platform-agnostic
export { RuleEngine } from "./rule-engine"; // Motor extendido con observabilidad y estado

// Legacy exports for backward compatibility
export * from "./action-registry";

// Export with alias for gradual migration
export { TriggerEngine as Engine } from "./trigger-engine";

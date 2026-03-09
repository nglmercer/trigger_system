export * from "./constants";
export * from "./expression-engine";
export * from "./event-queue";
export * from "./persistence";
// export * from "./persistence.node"; // Node Only - moved to node.ts entry point
export * from "./persistence-browser";

// New architecture: Base Engine + Extensions
export type { ITriggerEngine, EngineActionHandler } from "./base-engine";
export { TriggerEngine } from "./trigger-engine"; // Motor base platform-agnostic
export { RuleEngine } from "./rule-engine-new"; // Motor extendido con observabilidad y estado

// Legacy exports for backward compatibility
export * from "./action-registry";
export * from "./context-adapter";
export * from "./state-manager";

// Export with alias for gradual migration
export { TriggerEngine as Engine } from "./trigger-engine";
export { RuleEngine as AdvancedRuleEngine } from "./rule-engine-new";

// Export legacy engines for temporary compatibility
export * from "./rule-engine";
export * from "./engine";

export * from "./expression-engine";
export * from "./event-queue";
export * from "./persistence";
// export * from "./persistence.node"; // Node Only - moved to node.ts entry point
export * from "./persistence-browser";

// Nueva arquitectura: Base Engine + Extensions
export type { ITriggerEngine, EngineActionHandler } from "./base-engine";
export { TriggerEngine } from "./trigger-engine"; // Motor base platform-agnostic
export { RuleEngine } from "./rule-engine-new"; // Motor extendido con observabilidad y estado

// Legacy exports para compatibilidad hacia atrás
export * from "./action-registry";
export * from "./context-adapter";
export * from "./state-manager";

// Exportar con alias para migración gradual
export { TriggerEngine as Engine } from "./trigger-engine";
export { RuleEngine as AdvancedRuleEngine } from "./rule-engine-new";

// Exportar motores antiguos para compatibilidad temporal
export * from "./rule-engine";
export * from "./engine";

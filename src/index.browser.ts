
// Browser Entry Point
// Exports universal logic, excluding FileSystem IO specific modules (TriggerLoader, FilePersistence)

export * from "./core";
export * from "./domain";
// Avoid duplicate export of EngineActionHandler - it's already exported from core
export type { RuleMetadata, ComparisonOperator, ConditionValue, Condition, ConditionGroup, RuleCondition, ActionParams, ActionParamValue, Action, ExecutionMode, ActionGroup, TriggerRule, TriggerContext, ExecutedAction, TriggerResult, GlobalSettings, RuleEngineConfig, RuleUpdateData, RuleAddedData, RuleRemovedData, RuleParseErrorData, RuleEventData, TriggerCondition, TriggerAction, TriggerConditionGroup } from "./types";
export * from "./utils/utils";

// Explicitly export Browser Persistence as default for this entry
export { BrowserPersistence } from "./core/persistence-browser";

// Exclude TriggerLoader and FilePersistence from this bundle

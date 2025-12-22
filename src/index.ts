
// PLATFORM AGNOSTIC CORE
// Use this entry point for Browser or shared environments.
// Do NOT import 'fs', 'path', or other Node modules here directly.

export * from "./core";
// Do NOT export persistence.node.ts here
// Do NOT export loader.node.ts here

export * from "./domain";
// Avoid duplicate export of EngineActionHandler - it's already exported from core
export type { RuleMetadata, ComparisonOperator, ConditionValue, Condition, ConditionGroup, RuleCondition, ActionParams, ActionParamValue, Action, ExecutionMode, ActionGroup, TriggerRule, TriggerContext, ExecutedAction, TriggerResult, GlobalSettings, RuleEngineConfig, RuleUpdateData, RuleAddedData, RuleRemovedData, RuleParseErrorData, RuleEventData, TriggerCondition, TriggerAction, TriggerConditionGroup } from "./types";
export * from "./utils/utils";
export * from "./utils/emitter";
export * from "./sdk";


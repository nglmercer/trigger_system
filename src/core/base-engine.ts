/**
 * Base Engine Interface - Defines the common interface for all engines
 * Platform-agnostic and extensible
 */
import type {
  TriggerRule,
  TriggerContext,
  TriggerResult,
  Action,
  ActionGroup,
  RuleCondition,
  RuleEngineConfig,
  ActionParams
} from "../types";

export type EngineActionHandler = (params: ActionParams, context: TriggerContext) => Promise<unknown> | unknown;

/**
 * Base interface that all engines must implement
 */
export interface ITriggerEngine {
  // Properties
  readonly rules: TriggerRule[];
  
  // Main methods
  processEvent(context: TriggerContext): Promise<TriggerResult[]>;
  processEvent(eventType: string, data?: Record<string, unknown>, vars?: Record<string, unknown>): Promise<TriggerResult[]>;
  
  // Action management
  registerAction(type: string, handler: EngineActionHandler): void;
  
  // Rule management
  updateRules(newRules: TriggerRule[]): void;
  getRules(): TriggerRule[];
  
  // Utilities
  readonly config?: RuleEngineConfig;
}
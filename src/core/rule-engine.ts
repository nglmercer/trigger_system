/**
 * RuleEngine - Extension of TriggerEngine with advanced features
 * Adds observability, persistent state, and integrated ActionRegistry
 */

import type {
  TriggerRule,
  TriggerContext,
  TriggerResult,
  RuleEngineConfig,
  Action,
  ActionGroup,
  ExecutedAction,
  ActionParams,
  HelperFunction
} from "../types";

import { TriggerEngine } from "./trigger-engine";
import { ActionRegistry } from "./action-registry";
import { triggerEmitter, EngineEvent } from "../utils/emitter";
import { DebugMessages } from "./constants";

export class RuleEngine extends TriggerEngine {
  private actionRegistry: ActionRegistry;

  constructor(config: RuleEngineConfig) {
    // Call parent constructor with configuration
    super(config);
 
    // Initialize additional components and ensure default registrations
    this.actionRegistry = ActionRegistry.getInstance(true);
  }

  /**
   * Evaluates all rules against the provided context
   * This is the main entry point for evaluating rules with state management
   */
  async evaluateContext(context: TriggerContext): Promise<TriggerResult[]> {
    // Inject vars proxy representing unified variables, state, and helpers

    // Initialize environment if not present
    if (!context.env) {
      context.env = {};
    }

    if (this._config?.globalSettings?.debugMode) {
      console.log(DebugMessages.RULE_ENGINE_EVALUATING(this._rules.length, context.event));
    }

    triggerEmitter.emit(EngineEvent.ENGINE_START, { context, rulesCount: this._rules.length });

    // Use parent processEvent logic
    const results = await this.processEvent(context);

    triggerEmitter.emit(EngineEvent.ENGINE_DONE, { results, context });

    return results;
  }

  /**
   * Processes an event with full context (overrides parent method)
   * Adds observability and state management
   * Can accept either a full TriggerContext or a string event type with data/vars
   */
  override async processEvent(
    contextOrType: TriggerContext | string, 
    data: Record<string, unknown> = {}, 
    vars: Record<string, unknown> = {}
  ): Promise<TriggerResult[]> {
    // Handle string overload
    if (typeof contextOrType === 'string') {
      const context: TriggerContext = {
        event: contextOrType,
        data: data,
        vars: vars,
        timestamp: Date.now(),
      };
            
      return this.processEvent(context);
    }

    const context = contextOrType;

    // Emit init event
    triggerEmitter.emit(EngineEvent.ENGINE_START, {
      context,
      rulesCount: this._rules.length
    });

    if (this._config?.globalSettings?.debugMode) {
      console.log(DebugMessages.RULE_ENGINE_EVALUATING(this._rules.length, context.event));
    }

    // Use parent processEvent logic
    const results = await super.processEvent(context);

    // Emit completion event
    triggerEmitter.emit(EngineEvent.ENGINE_DONE, { results, context });

    return results;
  }
  
  get ActionRegistry(): ActionRegistry {
    return this.actionRegistry;
  }
}

// Alias for compatibility
export { RuleEngine as AdvancedEngine };

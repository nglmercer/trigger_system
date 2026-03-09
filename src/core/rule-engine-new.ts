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
  ActionParams
} from "../types";

import { TriggerEngine } from "./trigger-engine";
import { ActionRegistry } from "./action-registry";
import { StateManager } from "./state-manager";
import { triggerEmitter, EngineEvent } from "../utils/emitter";
import { EngineUtils } from "./engine-utils";
import { DebugMessages } from "./constants";

export class RuleEngine extends TriggerEngine {
  private actionRegistry: ActionRegistry;
  private stateManager: StateManager;

  constructor(config: RuleEngineConfig) {
    // Call parent constructor with configuration
    super(config);
 
    // Initialize additional components and ensure default registrations
    this.actionRegistry = ActionRegistry.getInstance(true);
    this.stateManager = StateManager.getInstance();
  }

  /**
   * Processes an event with full context (overrides parent method)
   * Adds observability and state management
   */
  override async processEvent(context: TriggerContext): Promise<TriggerResult[]> {
    // Inject state from manager
    context.state = this.stateManager.getLiveProxy();

    // Apply state configuration if it exists
    if (this._config?.stateConfig) {
        await this.stateManager.applyConfig(this._config.stateConfig);
    }

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

  /**
   * Overrides getStateContext to use StateManager
   */
  protected override getStateContext(): Record<string, any> {
    return this.stateManager.getLiveProxy();
  }
}

// Alias for compatibility
export { RuleEngine as AdvancedEngine };

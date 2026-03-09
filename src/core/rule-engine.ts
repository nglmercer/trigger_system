import type {
  TriggerRule,
  TriggerCondition,
  ConditionGroup,
  RuleCondition,
  Action,
  ActionGroup,
  TriggerContext,
  TriggerResult,
  RuleEngineConfig,
} from "../types";
import { TriggerEngine } from "./trigger-engine";
import { ActionRegistry } from "./action-registry";
import { StateManager } from "./state-manager";
import { triggerEmitter, EngineEvent } from "../utils/emitter";
import { EngineUtils } from "./engine-utils";
import { DebugMessages } from "./constants";

export class RuleEngine extends TriggerEngine {
  private actionRegistry: ActionRegistry;

  constructor(config: RuleEngineConfig) {
    super(config);
    // Explicitly initialize registry with defaults
    this.actionRegistry = ActionRegistry.getInstance(true);
  }

  /**
   * Evaluates all rules against the provided context
   */
  async evaluateContext(context: TriggerContext): Promise<TriggerResult[]> {
    // Inject current state proxy into context for direct manipulation
    if (!context.state) {
      context.state = StateManager.getInstance().getLiveProxy();
    }

    // Apply state configuration if present
    if (this._config?.stateConfig) {
        await StateManager.getInstance().applyConfig(this._config.stateConfig);
    }

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
   * Override processEvent to match evaluateContext semantics if called directly
   */
  override async processEvent(contextOrType: TriggerContext | string, data: Record<string, unknown> = {}, vars: Record<string, unknown> = {}): Promise<TriggerResult[]> {
    if (typeof contextOrType === 'string') {
        const context: TriggerContext = {
            event: contextOrType,
            data: data,
            vars: vars,
            timestamp: Date.now(),
            state: StateManager.getInstance().getLiveProxy()
        };
        return this.processEvent(context);
    }
    return super.processEvent(contextOrType);
  }

  /**
   * Overrides getStateContext to use StateManager
   */
  protected override getStateContext(): Record<string, any> {
    return StateManager.getInstance().getLiveProxy();
  }
}

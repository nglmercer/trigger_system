/**
 * TriggerEngine - Base platform-agnostic engine
 * Provides basic rule processing functionality
 * Can be extended to add additional features
 */

import type {
  TriggerRule,
  TriggerContext,
  TriggerResult,
  Action,
  ActionGroup,
  RuleCondition,
  Condition,
  ConditionGroup,
  RuleEngineConfig,
  ActionParams,
  EngineActionHandler,
  RuleEventData,
  RuleUpdateData,
  RuleAddedData,
  RuleRemovedData,
  ExecutedAction
} from "../types";

import { TriggerUtils } from "../utils/utils";
import { ExpressionEngine } from "./expression-engine";
import { triggerEmitter, ruleEvents, EngineEvent } from "../utils/emitter";
import { EngineUtils } from "./engine-utils";
import { ErrorMessages, DebugMessages } from "./constants";

export class TriggerEngine {
  protected _rules: TriggerRule[] = [];
  protected actionHandlers: Map<string, EngineActionHandler> = new Map();
  protected lastExecution: Map<string, number> = new Map();
  protected _config?: RuleEngineConfig;


  constructor(rulesOrConfig: TriggerRule[] | RuleEngineConfig = []) {
    if (Array.isArray(rulesOrConfig)) {
      this._rules = rulesOrConfig;
    } else {
      // Constructor with full configuration
      this._config = rulesOrConfig;
      this._rules = [...rulesOrConfig.rules];
    }
    
    // Ensure action registry is initialized with default values
    try {
        const { ActionRegistry } = require("./action-registry");
        ActionRegistry.getInstance(true);
    } catch {
        // Ignore if it cannot be loaded (e.g., limited environment)
    }

    this.sortRules();
  }

  /**
   * Sorts rules by priority (highest first)
   */
  protected sortRules(): void {
    this._rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Registers a handler for a specific action type
   */
  registerAction(type: string, handler: EngineActionHandler): void {
    this.actionHandlers.set(type, handler);
  }

  /**
   * Processes an event with full context
   */
  async processEvent(context: TriggerContext): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];

    // Ensure state is at least an object
    if (!context.state) {
        context.state = this.getStateContext ? this.getStateContext() : {};
    }

    // Filter rules by event and enabled state
    const candidates = this._rules.filter(r => r.enabled !== false && r.on === context.event);

    for (const rule of candidates) {
      // Check cooldown
      if (rule.cooldown && this.checkCooldown(rule.id, rule.cooldown)) {
        continue;
      }

      // Evaluate conditions using centralized utilities
      if (EngineUtils.evaluateConditions(rule.if, context)) {
        // Emit match event
        triggerEmitter.emit(EngineEvent.RULE_MATCH, { rule, context });

        // Execute actions using centralized utilities
        const execResult = await this.executeRuleActions(rule.do, context);

        // Update cooldown
        this.lastExecution.set(rule.id, Date.now());

        results.push({
          ruleId: rule.id,
          success: true,
          executedActions: execResult
        });

        // If not all rules should be evaluated, exit after first match
        if (!this.shouldEvaluateAll()) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Convenience method to process simple events
   */
  async processEventSimple(eventType: string, data: Record<string, unknown> = {}, vars: Record<string, unknown> = {}): Promise<TriggerResult[]> {
    const context: TriggerContext = {
      event: eventType,
      data: data,
      vars: vars,
      timestamp: Date.now(),
      state: this.getStateContext ? this.getStateContext() : {}
    };
    return this.processEvent(context);
  }

  /**
   * Updates the engine's rules
   */
  updateRules(newRules: TriggerRule[]): void {
    const oldRules = this.getRules();
    const oldRuleIds = new Set(oldRules.map(r => r.id));
    const newRuleIds = new Set(newRules.map(r => r.id));

    // Detect changes
    const added = newRules.filter(r => !oldRuleIds.has(r.id));
    const removed = oldRules.filter(r => !newRuleIds.has(r.id));

    // Update rules
    this._rules = [...newRules];
    this.sortRules();

    // Emit events for added rules
    added.forEach(rule => {
      this.emitRuleEvent(ruleEvents.RULE_ADDED, { ruleId: rule.id, timestamp: Date.now() });
    });

    // Emit events for removed rules
    removed.forEach(rule => {
      this.emitRuleEvent(ruleEvents.RULE_REMOVED, { ruleId: rule.id, timestamp: Date.now() });
    });

    // Emit general update event
    this.emitRuleEvent(ruleEvents.RULE_UPDATED, {
      count: newRules.length,
      added: added.length,
      removed: removed.length,
      unchanged: newRules.length - added.length,
      timestamp: Date.now()
    });
  }

  /**
   * Helper method to emit rule-related events
   */
  private emitRuleEvent(eventName: string, data: RuleEventData): void {
    try {
      if (triggerEmitter) {
        triggerEmitter.emit(eventName, {
          ...data,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Silently fail if emitter is not available
      console.warn(`Could not emit event ${eventName}:`, error);
    }
  }

  /**
   * Gets all current rules
   */
  getRules(): TriggerRule[] {
    return [...this._rules];
  }

  /**
   * Checks if a rule is in cooldown
   */
  protected checkCooldown(ruleId: string, cooldown: number): boolean {
    const last = this.lastExecution.get(ruleId);
    if (!last) return false;
    return (Date.now() - last) < cooldown;
  }

  /**
   * Determines whether to evaluate all rules or just the first match
   */
  protected shouldEvaluateAll(): boolean {
    return this._config?.globalSettings?.evaluateAll ?? true;
  }

  /**
   * Gets the state context (can be overridden by subclasses)
   */
  protected getStateContext?(): Record<string, any> {
    return {};
  }

  /**
   * Evaluates rule conditions (overridable)
   */
  protected evaluateConditions(
    condition: RuleCondition | RuleCondition[] | undefined,
    context: TriggerContext
  ): boolean {
    return EngineUtils.evaluateConditions(condition, context);
  }

  /**
   * Evaluates a single condition (overridable)
   */
  protected evaluateSingleCondition(cond: RuleCondition, context: TriggerContext): boolean {
      // Wraps around EngineUtils implementation for backward compatibility if anyone overrides it
      return EngineUtils.evaluateConditions(cond, context);
  }

  /**
   * Executes the actions of a rule
   */
  protected async executeRuleActions(
    actionConfig: Action | Action[] | ActionGroup | (Action | ActionGroup)[],
    context: TriggerContext
  ): Promise<ExecutedAction[]> {
    const { actionsToExecute } = EngineUtils.selectActions(actionConfig);
    const executionLogs: ExecutedAction[] = [];

    for (const action of actionsToExecute) {
      // Handle nested ActionGroups
      if ('actions' in action && 'mode' in action) {
        executionLogs.push(...(await this.executeRuleActions(action, context)));
        continue;
      }

      const act = action as Action;

      // Handle conditional actions
      if ('if' in act && act.if && (act.then || act.else)) {
        const conditionMet = this.evaluateConditions(act.if, context);
        
        if (conditionMet && act.then) {
          executionLogs.push(...(await this.executeRuleActions(act.then, context)));
        } else if (!conditionMet && act.else) {
          executionLogs.push(...(await this.executeRuleActions(act.else, context)));
        }
        continue;
      }

      // Handle direct if shorthand
      if ('if' in act && act.if) {
        if (!this.evaluateConditions(act.if, context)) continue;
      }

      const result = await this.executeSingleAction(act, context);
      executionLogs.push(result);
      
      if (result.type === 'BREAK') break;
    }

    return executionLogs;
  }

  /**
   * Executes a single action
   */
  protected async executeSingleAction(
    action: Action,
    context: TriggerContext
  ): Promise<ExecutedAction> {
    // 1. Common processing (shorthand, run, probability, delay, params)
    const { shouldExecute, executedAction, normalizedAction } = await EngineUtils.processSingleActionBase(action, context);
    
    if (!shouldExecute) {
        return executedAction!;
    }

    try {
      // 1. Try local handlers first (Legacy/Explicitly registered via registerAction)
      const localHandler = this.actionHandlers.get(normalizedAction.type!);
      if (localHandler) {
        const result = await localHandler(normalizedAction.params || {}, context);
        triggerEmitter.emit(EngineEvent.ACTION_SUCCESS, { action: normalizedAction, context, result });
        return { type: normalizedAction.type!, result, timestamp: Date.now() };
      }

      // 2. Try global ActionRegistry
      try {
        const { ActionRegistry } = require('./action-registry');
        const registryHandler = ActionRegistry.getInstance().get(normalizedAction.type!);
        if (registryHandler) {
          const result = await registryHandler(normalizedAction, context);
          triggerEmitter.emit(EngineEvent.ACTION_SUCCESS, { action: normalizedAction, context, result });
          return { type: normalizedAction.type!, result, timestamp: Date.now() };
        }
      } catch {
        // Registry not available
      }

      // 3. No handler found
      const msg = `${ErrorMessages.UNKNOWN_ACTION}: ${normalizedAction.type}`;
      if (this._config?.globalSettings?.strictActions) throw new Error(msg);
      
      console.warn(msg);
      return { type: normalizedAction.type!, result: { warning: msg }, timestamp: Date.now() };

    } catch (error) {
      console.error(`Error executing action ${normalizedAction.type}:`, error);
      triggerEmitter.emit(EngineEvent.ACTION_ERROR, { action: normalizedAction, context, error: String(error) });
      
      return {
        type: normalizedAction.type!,
        error: String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Interpolates parameters (legacy compatibility)
   */
  protected interpolateParams(params: ActionParams, context: TriggerContext): ActionParams {
    return EngineUtils.interpolateParams(params, context);
  }

  // Getters para acceso a propiedades protegidas
  get rules(): TriggerRule[] {
    return [...this._rules];
  }

  get config(): RuleEngineConfig | undefined {
    return this._config;
  }

  // Setter para updateRules
  set rules(newRules: TriggerRule[]) {
    this._rules = [...newRules];
    this.sortRules();
  }
}

// Also export type for compatibility
export type { TriggerEngine as BaseEngine };

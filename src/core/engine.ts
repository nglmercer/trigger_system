// src/trigger_system/engine.ts
import type {
  TriggerRule,
  TriggerContext,
  TriggerResult,
  Action,
  ActionGroup,
  RuleCondition,
  Condition,
  ConditionGroup,
  ActionParams,
  ActionParamValue,
  ExecutedAction
} from "../types";
import { TriggerUtils } from "../utils/utils";
// import { TriggerLoader } from "../io/loader"; // Removed dependency
import { ExpressionEngine } from "./expression-engine";

export type EngineActionHandler = (params: ActionParams, context: TriggerContext) => Promise<unknown> | unknown;

export class TriggerEngine {
  private rules: TriggerRule[] = [];
  private actionHandlers: Map<string, EngineActionHandler> = new Map();
  private lastExecution: Map<string, number> = new Map();

  // Rules should be loaded externally and passed here
  constructor(rules: TriggerRule[] = []) {
      this.rules = rules;
      // Sort logic moved to where rules are set
      this.sortRules();
  }

  private sortRules() {
     this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }


  /**
   * Register a handler for a specific action type
   */
  registerAction(type: string, handler: EngineActionHandler) {
    this.actionHandlers.set(type, handler);
  }

  /**
   * Process an incoming event
   */
  async processEvent(context: TriggerContext): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];

    // Filter rules by event name
    const candidates = this.rules.filter(r => r.enabled !== false && r.on === context.event);

    for (const rule of candidates) {
      // Check Cooldown
      if (rule.cooldown && this.checkCooldown(rule.id, rule.cooldown)) {
        continue; // Skip if in cooldown
      }

      // Evaluate Conditions
      if (this.evaluateConditions(rule.if, context)) {
        // Execute Actions
        const execResult = await this.executeRuleActions(rule.do, context);
        
        // Update Cooldown
        this.lastExecution.set(rule.id, Date.now());

        results.push({
          ruleId: rule.id,
          success: true,
          executedActions: execResult
        });
      }
    }

    return results;
  }

  private checkCooldown(ruleId: string, cooldown: number): boolean {
    const last = this.lastExecution.get(ruleId);
    if (!last) return false;
    return (Date.now() - last) < cooldown;
  }

  private evaluateConditions(
    condition: RuleCondition | RuleCondition[] | undefined, 
    context: TriggerContext
  ): boolean {
    if (!condition) return true; // No conditions = always true

    if (Array.isArray(condition)) {
      // Implicit AND for array of conditions
      return condition.every(c => this.evaluateSingleCondition(c, context));
    }

    return this.evaluateSingleCondition(condition, context);
  }

  private evaluateSingleCondition(cond: RuleCondition, context: TriggerContext): boolean {
    // Check if it's a Group
    if ('operator' in cond && 'conditions' in cond) {
      const group = cond as ConditionGroup;
      if (group.operator === 'OR') {
        return group.conditions.some(c => this.evaluateSingleCondition(c, context));
      } else { // AND
        return group.conditions.every(c => this.evaluateSingleCondition(c, context));
      }
    }

    // It's a simple Condition
    const c = cond as Condition;
    const actualValue = TriggerUtils.getNestedValue(c.field, context);
    // Interpolate the expected value if it's a string containing variables
    let expectedValue = c.value;
    if (typeof expectedValue === 'string' && expectedValue.includes('${')) {
        expectedValue = ExpressionEngine.interpolate(expectedValue, context);
    }
    
    return TriggerUtils.compare(actualValue, c.operator, expectedValue);
  }

  private async executeRuleActions(
    actionConfig: Action | Action[] | ActionGroup, 
    context: TriggerContext
  ): Promise<ExecutedAction[]> {
    const executionLogs: ExecutedAction[] = [];

    // Normalize to ActionGroup or List
    let actionsToExecute: Action[] = [];
    let mode = 'ALL';

    if (Array.isArray(actionConfig)) {
      actionsToExecute = actionConfig;
    } else if ('mode' in actionConfig && 'actions' in actionConfig) {
      const group = actionConfig as ActionGroup;
      mode = group.mode;
      actionsToExecute = group.actions;
    } else {
      // Single Action
      actionsToExecute = [actionConfig as Action];
    }

    // Handle Modes
    if (mode === 'EITHER') {
      // Pick one randomly
      // Support probability weights if present?
      // For now simple random
      const totalWeight = actionsToExecute.reduce((sum, a) => sum + (a.probability || 1), 0);
      let random = Math.random() * totalWeight;
      
      let selected: Action | undefined;
      for (const action of actionsToExecute) {
        const weight = action.probability || 1;
        random -= weight;
        if (random <= 0) {
          selected = action;
          break;
        }
      }
      // Fallback
      if (!selected && actionsToExecute.length > 0) selected = actionsToExecute[actionsToExecute.length - 1];

      if (selected) {
        actionsToExecute = [selected];
      } else {
        actionsToExecute = [];
      }
    }

    // Execute
    for (const action of actionsToExecute) {
      // Interpolate Params
      const processedParams = this.interpolateParams(action.params || {}, context);
      const handler = this.actionHandlers.get(action.type);

      if (handler) {
        try {
          // Handle Delay
          if (action.delay && action.delay > 0) {
            await new Promise(r => setTimeout(r, action.delay));
          }

          const result = await handler(processedParams, context);
          executionLogs.push({
            type: action.type,
            result,
            timestamp: Date.now()
          });
        } catch (err) {
            console.error(`Action ${action.type} failed:`, err);
            executionLogs.push({
                type: action.type,
                error: err,
                timestamp: Date.now()
            });
        }
      } else {
        console.warn(`No handler registered for action type: ${action.type}`);
        executionLogs.push({
            type: action.type,
            error: "No handler registered",
            timestamp: Date.now()
        });
      }
    }

    return executionLogs;
  }

  private interpolateParams(params: ActionParams, context: TriggerContext): ActionParams {
    const result: ActionParams = {};
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === 'string') {
        result[key] = ExpressionEngine.interpolate(val, context);
      } else if (typeof val === 'object' && val !== null) {
        // Recursive?
        // JSON objects might need deep interpolation.
        // For now simple 1-level or stringify
        // Let's do simple recursion for nice nested params
        result[key] = this.interpolateDeep(val, context) as ActionParamValue;
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  private interpolateDeep(obj: unknown, context: TriggerContext): unknown {
    if (typeof obj === 'string') return ExpressionEngine.interpolate(obj, context);
    if (Array.isArray(obj)) return obj.map(v => this.interpolateDeep(v, context));
    if (typeof obj === 'object' && obj !== null) {
        const res: Record<string, unknown> = {};
        for(const k in obj) res[k] = this.interpolateDeep((obj as Record<string, unknown>)[k], context);
        return res;
    }
    return obj;
  }
}

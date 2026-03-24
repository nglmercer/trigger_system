import type { 
  TriggerContext, 
  TriggerRule, 
  RuleCondition, 
  TriggerCondition, 
  ConditionGroup,
  Action,
  ActionGroup,
  ExecutedAction,
  ActionParams,
  ActionParamValue,
  ExecutionMode
} from "../types";
import { TriggerUtils } from "../utils/utils";
import { ExpressionEngine } from "./expression-engine";
import { ControlFlow } from "./constants";
import { ActionRegistry } from "./action-registry";
/**
 * Common utilities for engine logic to avoid repetition across different engine implementations
 */
export class EngineUtils {
  
  /**
   * Evaluates a set of conditions against a context
   */
  static evaluateConditions(
    conditions: RuleCondition | RuleCondition[] | undefined,
    context: TriggerContext
  ): boolean {
    if (!conditions) return true;

    if (Array.isArray(conditions)) {
      // Implicit AND for array of conditions
      return conditions.every(c => this.evaluateRecursiveCondition(c, context));
    }

    return this.evaluateRecursiveCondition(conditions, context);
  }

  /**
   * Evaluates a single condition or a condition group recursively
   */
  private static evaluateRecursiveCondition(
    condition: RuleCondition,
    context: TriggerContext
  ): boolean {
    // Check if it's a group (ConditionGroup)
    if ('conditions' in condition && 'operator' in condition) {
      const group = condition as ConditionGroup;
      if (group.operator === 'OR') {
        return group.conditions.some(c => this.evaluateRecursiveCondition(c, context));
      } else {
        // AND
        return group.conditions.every(c => this.evaluateRecursiveCondition(c, context));
      }
    }

    // It's a simple TriggerCondition
    const cond = condition as TriggerCondition;
    try {
      // Evaluate the field path/expression
      const actualValue = ExpressionEngine.evaluate(cond.field, context);

      // Interpolate the expected value if it's a string containing variables
      let expectedValue = cond.value;
      if (typeof expectedValue === 'string' && expectedValue.includes('${')) {
        expectedValue = ExpressionEngine.interpolate(expectedValue, context);
      }

      return TriggerUtils.compare(actualValue, cond.operator, expectedValue);
    } catch (error) {
      console.error(`Error evaluating condition:`, cond, error);
      return false;
    }
  }

  /**
   * Handles action execution common logic including:
   * - Probability checks
   * - Delay handling
   * - Parameter interpolation
   * - Control flow (break/continue)
   * - 'run' block execution
   * - Shorthand syntax normalization
   */
  static async processSingleActionBase(
    action: Action,
    context: TriggerContext,
    actionRegistry?: ActionRegistry // Optional registry to check for shorthand types
  ): Promise<{ 
    shouldExecute: boolean, 
    executedAction?: ExecutedAction,
    normalizedAction: Action 
  }> {
    const normalizedAction = { ...action };

    // 1. Handle shorthand syntax (e.g. notify: "...", log: "...")
    if (!normalizedAction.type && !normalizedAction.run && !normalizedAction.break && !normalizedAction.continue) {
        const reserved = Object.values(ControlFlow) as string[];
        const actionKeys = Object.keys(normalizedAction).filter(k => !reserved.includes(k));
        
        for (const key of actionKeys) {
            const hasHandler = actionRegistry ? !!actionRegistry.get(key) : true; // Assume true if no registry
            if (hasHandler) {
                normalizedAction.type = key;
                const value = (normalizedAction)[key];
                if (typeof value === 'string') {
                    normalizedAction.params = { ...normalizedAction.params, message: value, content: value };
                } else if (typeof value === 'object' && value !== null) {
                    normalizedAction.params = { ...normalizedAction.params, ...value };
                }
                break;
            }
        }
    }

    // 3. Handle Control Flow (Break/Continue)
    if (normalizedAction.break) {
        return { 
            shouldExecute: false, 
            executedAction: { type: 'BREAK', result: 'Break execution', timestamp: Date.now() },
            normalizedAction
        };
    }

    if (normalizedAction.continue) {
        return { 
            shouldExecute: false, 
            executedAction: { type: 'CONTINUE', result: 'Continue execution', timestamp: Date.now() },
            normalizedAction
        };
    }

    // 4. Probability Check
    let probability = normalizedAction.probability;
    if (typeof probability === 'string') {
      const val = ExpressionEngine.evaluate(probability, context);
      probability = typeof val === 'number' ? val : Number(val);
    }

    if (probability !== undefined && Math.random() > probability) {
        return { 
            shouldExecute: false, 
            executedAction: { 
                type: normalizedAction.type || 'skipped', 
                result: { skipped: "probability check failed" }, 
                timestamp: Date.now() 
            },
            normalizedAction
        };
    }

    // 5. Delay handling
    let delay = normalizedAction.delay;
    if (typeof delay === 'string') {
      const val = ExpressionEngine.evaluate(delay, context);
      delay = typeof val === 'number' ? val : Number(val);
    }

    if (delay && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 6. Parameter interpolation
    normalizedAction.params = this.interpolateParams(normalizedAction.params || {}, context);

    return { shouldExecute: true, normalizedAction };
  }

  /**
   * Selects an action to execute based on mode and random weights
   */
  static selectActions(
    actions: Action | Action[] | ActionGroup | (Action | ActionGroup)[],
  ): { actionsToExecute: (Action | ActionGroup)[], mode: ExecutionMode } {
    let actionsToExecute: (Action | ActionGroup)[] = [];
    let mode: ExecutionMode = 'ALL';

    if (Array.isArray(actions)) {
      actionsToExecute = actions;
    } else if (actions && typeof actions === 'object' && 'mode' in actions && 'actions' in actions) {
      const group = actions as ActionGroup;
      mode = group.mode as ExecutionMode;
      actionsToExecute = group.actions;
    } else {
      actionsToExecute = [actions as Action];
    }

    if (mode === 'EITHER' && actionsToExecute.length > 0) {
      const getWeight = (a: Action | ActionGroup) => ('probability' in a ? (a.probability as number) : 1);
      const totalWeight = actionsToExecute.reduce((sum, a) => sum + getWeight(a), 0);
      let random = Math.random() * totalWeight;

      for (const action of actionsToExecute) {
        const weight = getWeight(action);
        random -= weight;
        if (random <= 0) {
          return { actionsToExecute: [action], mode };
        }
      }
      const lastAction = actionsToExecute[actionsToExecute.length - 1];
      return { actionsToExecute: lastAction ? [lastAction] : [], mode };
    }

    return { actionsToExecute, mode };
  }

  /**
   * Deeply interpolates parameters with context variables
   */
  static interpolateParams(params: ActionParams, context: TriggerContext): ActionParams {
    const result: ActionParams = {};
    for (const [key, val] of Object.entries(params)) {
      result[key] = this.interpolateDeep(val, context) as ActionParamValue;
    }
    return result;
  }

  /**
   * Recursive interpolation for objects and arrays
   */
  static interpolateDeep(val: unknown, context: TriggerContext): unknown {
    if (typeof val === 'string' && val.includes('${')) {
      return ExpressionEngine.interpolate(val, context);
    }
    if (Array.isArray(val)) {
      return val.map(item => this.interpolateDeep(item, context));
    }
    if (typeof val === 'object' && val !== null) {
      const res: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val)) {
        res[k] = this.interpolateDeep(v, context);
      }
      return res;
    }
    return val;
  }
}

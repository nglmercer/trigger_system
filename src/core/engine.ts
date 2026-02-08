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
    const actualValue = ExpressionEngine.evaluate(c.field, context);
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

    // Execute actions with control flow support
    let shouldBreak = false;
    for (const action of actionsToExecute) {
      if (shouldBreak) break;

      // Handle conditional actions
      if (action.if) {
        const conditionMet = this.evaluateConditions(action.if, context);
        
        if (conditionMet) {
          // Execute 'then' actions
          if (action.then) {
            const thenLogs = await this.executeNestedActions(action.then, context);
            executionLogs.push(...thenLogs);
          }
        } else {
          // Execute 'else' actions
          if (action.else) {
            const elseLogs = await this.executeNestedActions(action.else, context);
            executionLogs.push(...elseLogs);
          }
        }
        continue; // Move to next action
      }

      // Handle break
      if (action.break) {
        shouldBreak = true;
        executionLogs.push({
          type: 'BREAK',
          result: 'Breaking action execution',
          timestamp: Date.now()
        });
        break;
      }

      // Handle continue (skip remaining actions in this group)
      if (action.continue) {
        executionLogs.push({
          type: 'CONTINUE',
          result: 'Skipping remaining actions',
          timestamp: Date.now()
        });
        continue;
      }

      // Regular action execution
      const result = await this.executeSingleAction(action, context);
      if (result) {
        executionLogs.push(result);
      }
    }

    return executionLogs;
  }

  /**
   * Execute nested actions (then/else branches)
   */
  private async executeNestedActions(
    actions: Action | Action[] | ActionGroup,
    context: TriggerContext
  ): Promise<ExecutedAction[]> {
    if (Array.isArray(actions)) {
      const logs: ExecutedAction[] = [];
      for (const action of actions) {
        const log = await this.executeSingleAction(action, context);
        if (log) logs.push(log);
      }
      return logs;
    } else if ('mode' in actions && 'actions' in actions) {
      // It's an ActionGroup
      return this.executeRuleActions(actions, context);
    } else {
      // Single action
      const log = await this.executeSingleAction(actions as Action, context);
      return log ? [log] : [];
    }
  }

  /**
   * Execute a single action with delay and probability support
   */
  private async executeSingleAction(action: Action, context: TriggerContext): Promise<ExecutedAction | null> {
    // Skip execution if no type and not a control flow action
    if (!action.type && !action.break && !action.continue) {
      return null;
    }

    // Handle probability
    if (action.probability !== undefined && action.probability < 1.0) {
      if (Math.random() > action.probability) {
        return {
          type: action.type || 'unknown',
          result: 'Skipped due to probability',
          timestamp: Date.now()
        };
      }
    }

    // Handle break/continue without executing handler
    if (action.break) {
      return {
        type: 'BREAK',
        result: 'Break action',
        timestamp: Date.now()
      };
    }

    if (action.continue) {
      return {
        type: 'CONTINUE',
        result: 'Continue action',
        timestamp: Date.now()
      };
    }

    // Interpolate Params
    const processedParams = this.interpolateParams(action.params || {}, context);
    const handler = this.actionHandlers.get(action.type!);

    if (handler) {
      try {
        // Handle Delay
        if (action.delay && action.delay > 0) {
          await new Promise(r => setTimeout(r, action.delay));
        }

        const result = await handler(processedParams, context);
        return {
          type: action.type!,
          result,
          timestamp: Date.now()
        };
      } catch (err) {
          console.error(`Action ${action.type} failed:`, err);
          return {
              type: action.type!,
              error: err,
              timestamp: Date.now()
          };
      }
    } else {
      console.warn(`No handler registered for action type: ${action.type}`);
      return {
          type: action.type!,
          error: "No handler registered",
          timestamp: Date.now()
      };
    }
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

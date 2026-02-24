// -----------------------------------------------------------------------------
// MOTOR DE REGLAS PARA TRIGGERS
// -----------------------------------------------------------------------------

import type {
  TriggerRule,
  TriggerCondition,
  ConditionGroup,
  RuleCondition,
  TriggerAction,
  ActionGroup,
  TriggerContext,
  TriggerResult,
  RuleEngineConfig,
  ConditionValue,
} from "../types";
import { ExpressionEngine } from "../core/expression-engine";


import { ActionRegistry } from "./action-registry";
import { StateManager } from "./state-manager";
import { triggerEmitter, EngineEvent } from "../utils/emitter";


export class RuleEngine {
  private rules: TriggerRule[] = [];
  private config: RuleEngineConfig;
  private lastExecutionTimes: Map<string, number> = new Map();
  private actionRegistry: ActionRegistry;

  constructor(config: RuleEngineConfig) {
    this.config = config;
    this.rules = [...config.rules];
    this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.actionRegistry = ActionRegistry.getInstance();
  }

  /**
   * Convenience method to process an event with a simple payload
   */
  async processEvent(eventType: string, data: Record<string, unknown> = {}, vars: Record<string, unknown> = {}): Promise<TriggerResult[]> {
    const context: TriggerContext = {
      event: eventType,
      data: data,
      vars: vars,
      timestamp: Date.now(),
      state: {} // State will be injected by evaluateContext
    };
    return this.evaluateContext(context);
  }


  /**
   * Evalúa todas las reglas contra el contexto proporcionado
   */
  async evaluateContext(context: TriggerContext): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];
    
    // Inject current state into context
    context.state = StateManager.getInstance().getAll();
    
    // Initialize env if not present
    if (!context.env) {
      context.env = {};
    }

    if (this.config.globalSettings.debugMode) {
      console.log(
        `[RuleEngine] Evaluando contexto con ${this.rules.length} reglas para evento: ${context.event}`,
      );
    }

    triggerEmitter.emit(EngineEvent.ENGINE_START, { context, rulesCount: this.rules.length });


    for (const rule of this.rules) {
      if (rule.enabled === false) continue;
      
      // Check event type match
      if (rule.on !== context.event) continue;

      // Verificar cooldown
      if (rule.cooldown && !this.checkCooldown(rule.id, rule.cooldown)) {
        if (this.config.globalSettings.debugMode) {
          console.log(`[RuleEngine] Regla ${rule.id} en cooldown`);
        }
        continue;
      }

      // Evaluar condiciones
      // rule.if can be undefined (always true), a single condition, or an array
      const conditionMet = this.evaluateRuleConditions(rule.if, context);

      if (conditionMet) {
        if (this.config.globalSettings.debugMode) {
          console.log(
            `[RuleEngine] Ejecutando regla: ${rule.name || rule.id}`,
          );
        }

        triggerEmitter.emit(EngineEvent.RULE_MATCH, { rule, context });


        // Ejecutar acciones
        const executedActions = await this.executeRuleActions(rule.do, context);

        results.push({
          ruleId: rule.id,
          executedActions: executedActions,
          success: true,
        });

        // Actualizar tiempo de última ejecución
        this.lastExecutionTimes.set(rule.id, Date.now());

        // Si no se deben evaluar todas las reglas, salir después de la primera coincidencia
        if (!this.config.globalSettings.evaluateAll) {
          break;
        }
      }
    }

    triggerEmitter.emit(EngineEvent.ENGINE_DONE, { results, context });

    return results;
  }

  // --- Condition Evaluation ---

  private evaluateRuleConditions(
    conditions: RuleCondition | RuleCondition[] | undefined,
    context: TriggerContext
  ): boolean {
    if (!conditions) return true; // No conditions = always trigger if event matches

    if (Array.isArray(conditions)) {
      // Implicit AND for array of conditions at root
      return conditions.every(c => this.evaluateRecursiveCondition(c, context));
    } else {
      return this.evaluateRecursiveCondition(conditions, context);
    }
  }

  private evaluateRecursiveCondition(
    condition: RuleCondition,
    context: TriggerContext
  ): boolean {
    // Check if it's a group
    if ('conditions' in condition && 'operator' in condition) {
      return this.evaluateConditionGroup(condition as ConditionGroup, context);
    } else {
      return this.evaluateSingleCondition(condition as TriggerCondition, context);
    }
  }

  private evaluateConditionGroup(group: ConditionGroup, context: TriggerContext): boolean {
    if (group.operator === 'OR') {
      return group.conditions.some(c => this.evaluateRecursiveCondition(c, context));
    } else {
      // AND
      return group.conditions.every(c => this.evaluateRecursiveCondition(c, context));
    }
  }


  /**
   * Evalúa una condición individual
   */
  private evaluateSingleCondition(
    condition: TriggerCondition,
    context: TriggerContext,
  ): boolean {
    try {
      // Obtener el valor del campo especificado (permite expresiones y llamadas a funciones)
      const fieldValue = ExpressionEngine.evaluate(
        condition.field,
        context,
      );

      // Process condition.value - if it's a string, try to interpolate it
      // This allows comparing field: "data.amount" with value: "${vars.threshold}"
      let targetValue = condition.value;
      if (typeof targetValue === 'string' && (targetValue.includes('${') || targetValue.startsWith('data.') || targetValue.startsWith('vars.'))) {
          // If it looks like an expression or variable reference, evaluate it
          const evaluated = ExpressionEngine.evaluate(targetValue, context);
          targetValue = evaluated as ConditionValue;
      }

      // Helper for Date comparisons
      const getDate = (val: unknown) => {
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            const d = new Date(val);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          }
          return 0;
      };

      // Helper for Safe Numeric comparisons
      // Returns null if values are not strictly comparable as numbers (prevents null -> 0 coercion)
      const getSafeNumber = (val: unknown): number | null => {
          if (typeof val === 'number') return val;
          if (val === null || val === undefined || val === '') return null;
          const num = Number(val);
          return isNaN(num) ? null : num;
      };

      // Evaluar según el operador
      switch (condition.operator) {
        case "EQ":
        case "==":
          return fieldValue == targetValue; // Loose equality for flexibility

        case "NEQ":
        case "!=":
          return fieldValue != targetValue;

        case "GT":
        case ">": {
          const nField = getSafeNumber(fieldValue);
          const nTarget = getSafeNumber(targetValue);
          return (nField !== null && nTarget !== null) && nField > nTarget;
        }

        case "GTE":
        case ">=": {
          const nField = getSafeNumber(fieldValue);
          const nTarget = getSafeNumber(targetValue);
          return (nField !== null && nTarget !== null) && nField >= nTarget;
        }

        case "LT":
        case "<": {
          const nField = getSafeNumber(fieldValue);
          const nTarget = getSafeNumber(targetValue);
          return (nField !== null && nTarget !== null) && nField < nTarget;
        }

        case "LTE":
        case "<=": {
          const nField = getSafeNumber(fieldValue);
          const nTarget = getSafeNumber(targetValue);
          return (nField !== null && nTarget !== null) && nField <= nTarget;
        }

        case "CONTAINS":
          return String(fieldValue).includes(String(targetValue));
        
        case "MATCHES":
          return new RegExp(String(targetValue)).test(String(fieldValue));
        
        case "IN":
          return Array.isArray(targetValue) && targetValue.some(item => item === fieldValue);

        case "NOT_IN":
          return Array.isArray(targetValue) && !targetValue.some(item => item === fieldValue);
        
        // Date operators
        case "SINCE": // field >= value (Chronologically after or same)
        case "AFTER":
           return getDate(fieldValue) >= getDate(targetValue);
        
        case "BEFORE": // field < value
        case "UNTIL":
           return getDate(fieldValue) < getDate(targetValue);

        case "RANGE": // Special Case: Value should be [min, max]
             if (Array.isArray(targetValue) && targetValue.length === 2) {
                 const nField = getSafeNumber(fieldValue);
                 return nField !== null && nField >= Number(targetValue[0]) && nField <= Number(targetValue[1]);
             }
             return false;

        default:
          console.error(`Operador desconocido: ${condition.operator}`);
          return false;
      }
    } catch (error) {
      console.error(`Error evaluando condición:`, condition, error);
      return false;
    }
  }

  // --- Action Execution ---

  private async executeRuleActions(
    actions: TriggerAction | TriggerAction[] | ActionGroup,
    context: TriggerContext
  ): Promise<TriggerResult['executedActions']> {
    const enactedActions: TriggerResult['executedActions'] = [];

    let actionList: TriggerAction[] = [];
    let mode: 'ALL' | 'SEQUENCE' | 'EITHER' = 'ALL';

    if (this.isActionGroup(actions)) {
      actionList = actions.actions;
      mode = actions.mode;
    } else if (Array.isArray(actions)) {
      actionList = actions;
    } else {
      actionList = [actions];
    }

    if (mode === 'EITHER' && actionList.length > 0) {
      // Pick one randomly
      // Support probability later, for now uniform
      const randomIndex = Math.floor(Math.random() * actionList.length);
      const selectedAction = actionList[randomIndex];
      if (selectedAction) {
          actionList = [selectedAction];
      }
    }

    // Execute actions with control flow support
    let lastResult = context.lastResult;
    let shouldBreak = false;

    for (const action of actionList) {
      if (shouldBreak) break;

      // Handle conditional actions
      if ('if' in action && action.if) {
        const conditionMet = this.evaluateActionCondition(action.if, context);
        
        if (conditionMet && action.then) {
          // Execute 'then' actions
          const thenLogs = await this.executeNestedActions(action.then, context);
          enactedActions.push(...thenLogs);
        } else if (!conditionMet && action.else) {
          // Execute 'else' actions
          const elseLogs = await this.executeNestedActions(action.else, context);
          enactedActions.push(...elseLogs);
        }
        continue;
      }

      // Handle break
      if (action.break) {
        shouldBreak = true;
        enactedActions.push({
          type: 'BREAK',
          result: 'Breaking action execution',
          timestamp: Date.now()
        });
        break;
      }

      // Handle continue (skip remaining actions in this group)
      if (action.continue) {
        enactedActions.push({
          type: 'CONTINUE',
          result: 'Skipping remaining actions',
          timestamp: Date.now()
        });
        continue;
      }

      // Regular action execution
      const actionContext = { ...context, lastResult };
      const result = await this.executeSingleAction(action, actionContext);
      enactedActions.push(result);
      
      if (mode === 'SEQUENCE') {
        lastResult = result.result;
      }
    }

    return enactedActions;
  }

  /**
   * Evaluate action-level condition (for if/then/else)
   */
  private evaluateActionCondition(
    condition: RuleCondition | RuleCondition[],
    context: TriggerContext
  ): boolean {
    if (Array.isArray(condition)) {
      // Implicit AND for array of conditions
      return condition.every(c => this.evaluateRecursiveCondition(c, context));
    }
    
    // Use recursive evaluator for RuleCondition (handles both Condition and ConditionGroup)
    return this.evaluateRecursiveCondition(condition, context);
  }

  /**
   * Execute nested actions (then/else branches)
   */
  private async executeNestedActions(
    actions: TriggerAction | TriggerAction[] | ActionGroup,
    context: TriggerContext
  ): Promise<TriggerResult['executedActions']> {
    if (Array.isArray(actions)) {
      const logs: TriggerResult['executedActions'] = [];
      for (const action of actions) {
        const log = await this.executeSingleAction(action, context);
        logs.push(log);
      }
      return logs;
    } else if (this.isActionGroup(actions)) {
      return this.executeRuleActions(actions, context);
    } else {
      const log = await this.executeSingleAction(actions, context);
      return [log];
    }
  }

  private isActionGroup(action: unknown): action is ActionGroup {
    return typeof action === 'object' && action !== null && 'mode' in action && 'actions' in action;
  }


  private async executeSingleAction(
    action: TriggerAction,
    context: TriggerContext,
  ): Promise<TriggerResult['executedActions'][0]> {
    
    // Skip execution if no type and not a control flow action
    if (!action.type && !action.break && !action.continue) {
      return {
        type: 'unknown',
        error: 'Action has no type and no control flow properties',
        timestamp: Date.now()
      };
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
    
    // Interpolate probability if it's a string expression
    let probability = action.probability;
    if (typeof (probability as any) === 'string') {
      const val = ExpressionEngine.evaluate(probability as any, context);
      probability = typeof val === 'number' ? val : Number(val);
    }

    // Check probability
    if (probability !== undefined && Math.random() > probability) {
       return {
         type: action.type || 'unknown',
         timestamp: Date.now(),
         result: { skipped: "probability check failed" }
       };
    }

    // Interpolate delay if it's a string expression
    let delay = action.delay;
    if (typeof (delay as any) === 'string') {
      const val = ExpressionEngine.evaluate(delay as any, context);
      delay = typeof val === 'number' ? val : Number(val);
    }

    // Check delay
    if (delay && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
        const handler = this.actionRegistry.get(action.type!);
        let result;

        if (handler) {
            result = await handler(action, context);
        } else {
             const msg = `Tipo de acción genérica o desconocida: ${action.type}`;
             if (this.config.globalSettings.strictActions) {
                 throw new Error(msg);
             }
             console.warn(msg);
             result = { warning: `Generic action executed: ${action.type}` };
        }

        triggerEmitter.emit(EngineEvent.ACTION_SUCCESS, { action, context, result });

        return {
          type: action.type!,
          result,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error(`Error ejecutando acción:`, action, error);
        triggerEmitter.emit(EngineEvent.ACTION_ERROR, { action, context, error: String(error) });

        return {
          type: action.type!,
          error: String(error),
          timestamp: Date.now()
        };
      }
  }


  /**
   * Verifica si una regla está en cooldown
   */
  private checkCooldown(ruleId: string, cooldownMs: number): boolean {
    const lastExecution = this.lastExecutionTimes.get(ruleId);

    if (!lastExecution) return true;

    return Date.now() - lastExecution > cooldownMs;
  }

  /**
   * Actualiza las reglas del motor
   */
  updateRules(newRules: TriggerRule[]): void {
    this.rules = [...newRules];
    this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Obtiene todas las reglas
   */
  getRules(): TriggerRule[] {
    return [...this.rules];
  }
}

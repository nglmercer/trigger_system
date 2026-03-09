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
        // Ignorar si no se puede cargar (ej. entorno limitado)
    }

    this.sortRules();
  }

  /**
   * Ordena reglas por prioridad (mayor primero)
   */
  protected sortRules(): void {
    this._rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Registra un handler para un tipo de acción específico
   */
  registerAction(type: string, handler: EngineActionHandler): void {
    this.actionHandlers.set(type, handler);
  }

  /**
   * Procesa un evento con contexto completo
   */
  async processEvent(context: TriggerContext): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];

    // Ensure state is at least an object
    if (!context.state) {
        context.state = this.getStateContext ? this.getStateContext() : {};
    }

    // Filtrar reglas por evento y estado habilitado
    const candidates = this._rules.filter(r => r.enabled !== false && r.on === context.event);

    for (const rule of candidates) {
      // Verificar cooldown
      if (rule.cooldown && this.checkCooldown(rule.id, rule.cooldown)) {
        continue;
      }

      // Evaluar condiciones usando utilidades centralizadas
      if (EngineUtils.evaluateConditions(rule.if, context)) {
        // Emitir evento de coincidencia
        triggerEmitter.emit(EngineEvent.RULE_MATCH, { rule, context });

        // Ejecutar acciones usando utilidades centralizadas
        const execResult = await this.executeRuleActions(rule.do, context);

        // Actualizar cooldown
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
   * Método convenience para procesar eventos simples
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
   * Actualiza las reglas del motor
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
   * Obtiene todas las reglas actuales
   */
  getRules(): TriggerRule[] {
    return [...this._rules];
  }

  /**
   * Verifica si una regla está en cooldown
   */
  protected checkCooldown(ruleId: string, cooldown: number): boolean {
    const last = this.lastExecution.get(ruleId);
    if (!last) return false;
    return (Date.now() - last) < cooldown;
  }

  /**
   * Determina si se deben evaluar todas las reglas o solo la primera coincidente
   */
  protected shouldEvaluateAll(): boolean {
    return this._config?.globalSettings?.evaluateAll ?? true;
  }

  /**
   * Obtiene el contexto de estado (puede ser sobrescrito por subclases)
   */
  protected getStateContext?(): Record<string, any> {
    return {};
  }

  /**
   * Evalúa condiciones de una regla (sobrescribible)
   */
  protected evaluateConditions(
    condition: RuleCondition | RuleCondition[] | undefined,
    context: TriggerContext
  ): boolean {
    return EngineUtils.evaluateConditions(condition, context);
  }

  /**
   * Evalúa una condición individual (sobrescribible)
   */
  protected evaluateSingleCondition(cond: RuleCondition, context: TriggerContext): boolean {
      // Wraps around EngineUtils implementation for backward compatibility if anyone overrides it
      return EngineUtils.evaluateConditions(cond, context);
  }

  /**
   * Ejecuta las acciones de una regla
   */
  protected async executeRuleActions(
    actionConfig: Action | Action[] | ActionGroup,
    context: TriggerContext
  ): Promise<ExecutedAction[]> {
    const { actionsToExecute } = EngineUtils.selectActions(actionConfig);
    const executionLogs: ExecutedAction[] = [];

    for (const action of actionsToExecute) {
      // Handle conditional actions
      if ('if' in action && action.if && (action.then || action.else)) {
        const conditionMet = this.evaluateConditions(action.if, context);
        
        if (conditionMet && action.then) {
          executionLogs.push(...(await this.executeRuleActions(action.then, context)));
        } else if (!conditionMet && action.else) {
          executionLogs.push(...(await this.executeRuleActions(action.else, context)));
        }
        continue;
      }

      // Handle direct if shorthand
      if ('if' in action && action.if) {
        if (!this.evaluateConditions(action.if, context)) continue;
      }

      const result = await this.executeSingleAction(action, context);
      executionLogs.push(result);
      
      if (result.type === 'BREAK') break;
    }

    return executionLogs;
  }

  /**
   * Ejecuta una acción individual
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
      const msg = `No handler registered for action type: ${normalizedAction.type}`;
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
   * Interpola parámetros (legacy compatibility)
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

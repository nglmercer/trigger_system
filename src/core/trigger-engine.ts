/**
 * TriggerEngine - Motor base platform-agnostic
 * Proporciona funcionalidad básica de procesamiento de reglas
 * Puede ser extendido para agregar características adicionales
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
  RuleEngineConfig
} from "../types";

import { TriggerUtils } from "../utils/utils";
import { ExpressionEngine } from "./expression-engine";
import { triggerEmitter,ruleEvents } from "../utils/emitter";

export type EngineActionHandler = (params: any, context: TriggerContext) => Promise<any> | any;

export class TriggerEngine {
  protected _rules: TriggerRule[] = [];
  protected actionHandlers: Map<string, EngineActionHandler> = new Map();
  protected lastExecution: Map<string, number> = new Map();
  protected _config?: RuleEngineConfig;

  /**
   * Constructor base - puede recibir reglas directamente o config
   */
  constructor(rulesOrConfig: TriggerRule[] | RuleEngineConfig = []) {
    if (Array.isArray(rulesOrConfig)) {
      // Constructor simple con array de reglas
      this._rules = rulesOrConfig;
    } else {
      // Constructor con configuración completa
      this._config = rulesOrConfig;
      this._rules = [...rulesOrConfig.rules];
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

    // Filtrar reglas por evento y estado habilitado
    const candidates = this._rules.filter(r => r.enabled !== false && r.on === context.event);

    for (const rule of candidates) {
      // Verificar cooldown
      if (rule.cooldown && this.checkCooldown(rule.id, rule.cooldown)) {
        continue;
      }

      // Evaluar condiciones
      if (this.evaluateConditions(rule.if, context)) {
        // Ejecutar acciones
        const execResult = await this.executeRuleActions(rule.do, context);
        
        // Actualizar cooldown
        this.lastExecution.set(rule.id, Date.now());

        results.push({
          ruleId: rule.id,
          success: true,
          executedActions: execResult
        });

        // Si no se deben evaluar todas las reglas, salir después de la primera coincidencia
        if (!this.shouldEvaluateAll()) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Método convenience para procesar eventos simples
   * Renombrado para evitar conflicto con processEvent(context)
   */
  async processEventSimple(eventType: string, data: Record<string, any> = {}, globals: Record<string, any> = {}): Promise<TriggerResult[]> {
    const context: TriggerContext = {
      event: eventType,
      data: data,
      globals: globals,
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
    this.rules = [...newRules];
    this.sortRules();
    
    // Emit events for added rules
    added.forEach(rule => {
      this.emitRuleEvent(ruleEvents.RULE_ADDED, { ruleId: rule.id });
    });
    
    // Emit events for removed rules
    removed.forEach(rule => {
      this.emitRuleEvent(ruleEvents.RULE_REMOVED, { ruleId: rule.id });
    });
    
    // Emit general update event
    this.emitRuleEvent(ruleEvents.RULE_UPDATED, {
      count: newRules.length,
      added: added.length,
      removed: removed.length,
      unchanged: newRules.length - added.length
    });
  }

  /**
   * Helper method to emit rule-related events
   */
  private emitRuleEvent(eventName: string, data: any): void {
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
    return [...this.rules];
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
    return this.config?.globalSettings?.evaluateAll ?? true;
  }

  /**
   * Obtiene el contexto de estado (puede ser sobrescrito por subclases)
   */
  protected getStateContext?(): Record<string, any> {
    return {};
  }

  /**
   * Evalúa condiciones de una regla
   */
  protected evaluateConditions(
    condition: RuleCondition | RuleCondition[] | undefined, 
    context: TriggerContext
  ): boolean {
    if (!condition) return true;

    if (Array.isArray(condition)) {
      return condition.every(c => this.evaluateSingleCondition(c, context));
    }

    return this.evaluateSingleCondition(condition, context);
  }

  /**
   * Evalúa una condición individual
   */
  protected evaluateSingleCondition(cond: RuleCondition, context: TriggerContext): boolean {
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

  /**
   * Ejecuta las acciones de una regla
   */
  protected async executeRuleActions(
    actionConfig: Action | Action[] | ActionGroup, 
    context: TriggerContext
  ): Promise<TriggerResult['executedActions']> {
    const executionLogs: TriggerResult['executedActions'] = [];

    // Normalizar a lista de acciones
    let actionsToExecute: Action[] = [];
    let mode: 'ALL' | 'EITHER' | 'SEQUENCE' = 'ALL';

    if (Array.isArray(actionConfig)) {
      actionsToExecute = actionConfig;
    } else if ('mode' in actionConfig && 'actions' in actionConfig) {
      const group = actionConfig as ActionGroup;
      mode = group.mode;
      actionsToExecute = group.actions;
    } else {
      actionsToExecute = [actionConfig as Action];
    }

    // Handle ETHER mode
    if (mode === 'EITHER' && actionsToExecute.length > 0) {
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
      
      if (!selected && actionsToExecute.length > 0) {
        selected = actionsToExecute[actionsToExecute.length - 1];
      }

      if (selected) {
        actionsToExecute = [selected];
      } else {
        actionsToExecute = [];
      }
    }

    // Execute actions
    for (const action of actionsToExecute) {
      const result = await this.executeSingleAction(action, context);
      executionLogs.push(result);
    }

    return executionLogs;
  }

  /**
   * Ejecuta una acción individual
   */
  protected async executeSingleAction(
    action: Action,
    context: TriggerContext
  ): Promise<TriggerResult['executedActions'][0]> {
    
    // Check probability
    if (action.probability !== undefined && Math.random() > action.probability) {
       return {
         type: action.type,
         timestamp: Date.now(),
         result: { skipped: "probability check failed" }
       };
    }

    // Check delay
    if (action.delay && action.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, action.delay));
    }

    try {
      // Try to get handler from registry first (if available)
      let handler: EngineActionHandler | undefined;
      
      // Check if ActionRegistry is available (Node.js environment)
      try {
        const { ActionRegistry } = await import('./action-registry');
        handler = ActionRegistry.getInstance().get(action.type);
      } catch {
        // ActionRegistry not available, use local handlers
        handler = this.actionHandlers.get(action.type);
      }

      let result;
      if (handler) {
        result = await handler(action.params || {}, context);
      } else {
        // No handler registered
        const msg = `No handler registered for action type: ${action.type}`;
        console.warn(msg);
        result = { warning: msg };
      }

      return {
        type: action.type,
        result,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
      return {
        type: action.type,
        error: String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Interpola parámetros con variables del contexto
   */
  protected interpolateParams(params: Record<string, any>, context: TriggerContext): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === 'string') {
        result[key] = ExpressionEngine.interpolate(val, context);
      } else if (typeof val === 'object' && val !== null) {
        result[key] = this.interpolateDeep(val, context);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  /**
   * Interpolación recursiva para objetos anidados
   */
  protected interpolateDeep(obj: any, context: TriggerContext): any {
    if (typeof obj === 'string') return ExpressionEngine.interpolate(obj, context);
    if (Array.isArray(obj)) return obj.map(v => this.interpolateDeep(v, context));
    if (typeof obj === 'object' && obj !== null) {
        const res: any = {};
        for(const k in obj) res[k] = this.interpolateDeep(obj[k], context);
        return res;
    }
    return obj;
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

// Exportar también el tipo para compatibilidad
export type { TriggerEngine as BaseEngine };
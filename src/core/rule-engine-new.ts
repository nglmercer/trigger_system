/**
 * RuleEngine - Extensión de TriggerEngine con características avanzadas
 * Agrega observabilidad, estado persistente, y ActionRegistry integrado
 */

import type {
  TriggerRule,
  TriggerContext,
  TriggerResult,
  RuleEngineConfig,
  Action,
  ActionGroup,
  ExecutedAction
} from "../types";

import { TriggerEngine } from "./trigger-engine";
import { ActionRegistry } from "./action-registry";
import { StateManager } from "./state-manager";
import { triggerEmitter, EngineEvent } from "../utils/emitter";

export class RuleEngine extends TriggerEngine {
  private actionRegistry: ActionRegistry;
  private stateManager: StateManager;

  constructor(config: RuleEngineConfig) {
    // Llamar al constructor padre con la configuración
    super(config);
    
    // Inicializar componentes adicionales
    this.actionRegistry = ActionRegistry.getInstance();
    this.stateManager = StateManager.getInstance();
  }

  /**
   * Procesa un evento con contexto completo (sobrescribe el método padre)
   * Agrega observabilidad y manejo de estado
   */
  override async processEvent(context: TriggerContext): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];
    
    // Inyectar estado actual en el contexto
    context.state = this.stateManager.getAll();

    // Emitir evento de inicio
    triggerEmitter.emit(EngineEvent.ENGINE_START, { 
      context, 
      rulesCount: this.rules.length 
    });

    // Si hay modo debug, loggear
    if (this.config?.globalSettings?.debugMode) {
      console.log(
        `[RuleEngine] Evaluating context with ${this.rules.length} rules for event: ${context.event}`,
      );
    }

    // Procesar reglas usando la lógica del padre
    const candidates = this.rules.filter(r => r.enabled !== false && r.on === context.event);

    for (const rule of candidates) {
      // Verificar cooldown
      if (rule.cooldown && this.checkCooldown(rule.id, rule.cooldown)) {
        if (this.config?.globalSettings?.debugMode) {
          console.log(`[RuleEngine] Rule ${rule.id} in cooldown`);
        }
        continue;
      }

      // Evaluar condiciones
      const conditionMet = this.evaluateConditions(rule.if, context);

      if (conditionMet) {
        if (this.config?.globalSettings?.debugMode) {
          console.log(`[RuleEngine] Executing rule: ${rule.name || rule.id}`);
        }

        // Emitir evento de coincidencia
        triggerEmitter.emit(EngineEvent.RULE_MATCH, { rule, context });

        // Ejecutar acciones usando el ActionRegistry
        const executedActions = await this.executeRuleActionsWithRegistry(rule.do, context);

        results.push({
          ruleId: rule.id,
          executedActions: executedActions,
          success: true,
        });

        // Actualizar tiempo de última ejecución
        this.updateLastExecution(rule.id);

        // Si no se deben evaluar todas las reglas, salir después de la primera coincidencia
        if (!this.shouldEvaluateAll()) {
          break;
        }
      }
    }

    // Emitir evento de finalización
    triggerEmitter.emit(EngineEvent.ENGINE_DONE, { results, context });

    return results;
  }

  /**
   * Método convenience para procesar eventos simples
   * Usa el método renombrado del padre
   */
  override async processEventSimple(eventType: string, data: Record<string, unknown> = {}, globals: Record<string, unknown> = {}): Promise<TriggerResult[]> {
    const context: TriggerContext = {
      event: eventType,
      data: data,
      globals: globals,
      timestamp: Date.now(),
      state: this.stateManager.getAll()
    };
    return this.processEvent(context);
  }

  /**
   * Ejecuta acciones usando el ActionRegistry
   */
  private async executeRuleActionsWithRegistry(
    actions: Action | Action[] | ActionGroup,
    context: TriggerContext
  ): Promise<TriggerResult['executedActions']> {
    const enactedActions: TriggerResult['executedActions'] = [];

    let actionList: Action[] = [];
    let mode: 'ALL' | 'SEQUENCE' | 'EITHER' = 'ALL';

    if (Array.isArray(actions)) {
      actionList = actions;
    } else if (this.isActionGroup(actions)) {
      const group = actions as ActionGroup;
      mode = group.mode;
      actionList = group.actions;
    } else {
      actionList = [actions as Action];
    }

    if (mode === 'EITHER' && actionList.length > 0) {
      const totalWeight = actionList.reduce((sum, a) => sum + (a.probability || 1), 0);
      let random = Math.random() * totalWeight;
      
      let selected: Action | undefined;
      for (const action of actionList) {
        const weight = action.probability || 1;
        random -= weight;
        if (random <= 0) {
          selected = action;
          break;
        }
      }
      
      if (selected) {
        actionList = [selected];
      }
    }

    // Execute actions
    let lastResult = context.lastResult;
    for (const action of actionList) {
      const actionContext = { ...context, lastResult };
      const result = await this.executeSingleActionWithRegistry(action, actionContext);
      enactedActions.push(result);
      
      if (mode === 'SEQUENCE') {
        lastResult = result.result;
      }
    }

    return enactedActions;
  }

  private isActionGroup(action: Action | ActionGroup): action is ActionGroup {
    return typeof action === 'object' && action !== null && 'mode' in action && 'actions' in action;
  }

  /**
   * Ejecuta una acción individual usando el ActionRegistry
   */
  private async executeSingleActionWithRegistry(
    action: Action,
    context: TriggerContext
  ): Promise<TriggerResult['executedActions'][0]> {
    
    // Interpolate probability if it's a string expression
    let probability = action.probability;
    if (typeof (probability as any) === 'string') {
      const { ExpressionEngine } = require("./expression-engine");
      const val = ExpressionEngine.evaluate(probability as any, context);
      probability = typeof val === 'number' ? val : Number(val);
    }

    // Check probability
    if (probability !== undefined && Math.random() > probability) {
       return {
         type: action.type,
         timestamp: Date.now(),
         result: { skipped: "probability check failed" }
       };
    }

    // Interpolate delay if it's a string expression
    let delay = action.delay;
    if (typeof (delay as any) === 'string') {
      const { ExpressionEngine } = require("./expression-engine");
      const val = ExpressionEngine.evaluate(delay as any, context);
      delay = typeof val === 'number' ? val : Number(val);
    }

    // Check delay
    if (delay && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Interpolate parameters
    const params = this.interpolateParams(action.params || {}, context);

    try {
      const handler = this.actionRegistry.get(action.type);
      let result;

      if (handler) {
        result = await handler({ ...action, params }, context);
      } else {
        const msg = `Generic or unknown action type: ${action.type}`;
        if (this.config?.globalSettings?.strictActions) {
          throw new Error(msg);
        }
        console.warn(msg);
        result = { warning: `Generic action executed: ${action.type}` };
      }

      // Emitir evento de éxito
      triggerEmitter.emit(EngineEvent.ACTION_SUCCESS, { action: { ...action, params }, context, result });

      return {
        type: action.type,
        result,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error executing action:`, action, error);
      triggerEmitter.emit(EngineEvent.ACTION_ERROR, { action, context, error: String(error) });

      return {
        type: action.type,
        error: String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Actualiza el tiempo de última ejecución de una regla
   */
  private updateLastExecution(ruleId: string): void {
    // Usar el mapa del padre
    this.lastExecution.set(ruleId, Date.now());
  }

  /**
   * Sobrescribe getStateContext para usar StateManager
   */
  protected override getStateContext(): Record<string, any> {
    return this.stateManager.getAll();
  }

  /**
   * Sobrescribe shouldEvaluateAll para usar la configuración
   */
  protected override shouldEvaluateAll(): boolean {
    return this.config?.globalSettings?.evaluateAll ?? true;
  }

  /**
   * Sobrescribe executeRuleActions para usar el registry
   */
  protected override async executeRuleActions(
    actionConfig: Action | Action[] | ActionGroup,
    context: TriggerContext
  ): Promise<TriggerResult['executedActions']> {
    return this.executeRuleActionsWithRegistry(actionConfig, context);
  }

  /**
   * Sobrescribe executeSingleAction para usar el registry
   */
  protected override async executeSingleAction(
    action: Action,
    context: TriggerContext
  ): Promise<TriggerResult['executedActions'][0]> {
    return this.executeSingleActionWithRegistry(action, context);
  }
}

// Alias para compatibilidad
export { RuleEngine as AdvancedEngine };
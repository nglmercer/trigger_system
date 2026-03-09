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

export class RuleEngine extends TriggerEngine {
  private actionRegistry: ActionRegistry;
  private stateManager: StateManager;

  constructor(config: RuleEngineConfig) {
    // Call parent constructor with configuration
    super(config);
 
    // Inicializar componentes adicionales y asegurar registros por defecto
    this.actionRegistry = ActionRegistry.getInstance(true);
    this.stateManager = StateManager.getInstance();
  }

  /**
   * Procesa un evento con contexto completo (sobrescribe el método padre)
   * Agrega observabilidad y manejo de estado
   */
  override async processEvent(context: TriggerContext): Promise<TriggerResult[]> {
    // Inject state from manager
    context.state = this.stateManager.getLiveProxy();

    // Apply state configuration if it exists
    if (this._config?.stateConfig) {
        await this.stateManager.applyConfig(this._config.stateConfig);
    }

    // Emitir evento de inicio
    triggerEmitter.emit(EngineEvent.ENGINE_START, {
      context,
      rulesCount: this._rules.length
    });

    if (this._config?.globalSettings?.debugMode) {
      console.log(`[RuleEngine] Evaluating context with ${this._rules.length} rules for event: ${context.event}`);
    }

    // Use parent processEvent logic
    const results = await super.processEvent(context);

    // Emit completion event
    triggerEmitter.emit(EngineEvent.ENGINE_DONE, { results, context });

    return results;
  }

  /**
   * Sobrescribe getStateContext para usar StateManager
   */
  protected override getStateContext(): Record<string, any> {
    return this.stateManager.getAll();
  }
}

// Alias para compatibilidad
export { RuleEngine as AdvancedEngine };

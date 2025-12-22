/**
 * Base Engine Interface - Define la interfaz común para todos los motores
 * Platform-agnostic y extensible
 */
import type { 
  TriggerRule, 
  TriggerContext, 
  TriggerResult, 
  Action, 
  ActionGroup, 
  RuleCondition,
  RuleEngineConfig
} from "../types";

export type EngineActionHandler = (params: any, context: TriggerContext) => Promise<any> | any;

/**
 * Interfaz base que deben implementar todos los motores
 */
export interface ITriggerEngine {
  // Propiedades
  readonly rules: TriggerRule[];
  
  // Métodos principales
  processEvent(context: TriggerContext): Promise<TriggerResult[]>;
  processEvent(eventType: string, data?: Record<string, any>, globals?: Record<string, any>): Promise<TriggerResult[]>;
  
  // Gestión de acciones
  registerAction(type: string, handler: EngineActionHandler): void;
  
  // Gestión de reglas
  updateRules(newRules: TriggerRule[]): void;
  getRules(): TriggerRule[];
  
  // Utilidades
  readonly config?: RuleEngineConfig;
}
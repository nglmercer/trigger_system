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
  RuleEngineConfig,
  ActionParams
} from "../types";

export type EngineActionHandler = (params: ActionParams, context: TriggerContext) => Promise<unknown> | unknown;

/**
 * Interfaz base que deben implementar todos los motores
 */
export interface ITriggerEngine {
  // Propiedades
  readonly rules: TriggerRule[];
  
  // Métodos principales
  processEvent(context: TriggerContext): Promise<TriggerResult[]>;
  processEvent(eventType: string, data?: Record<string, unknown>, globals?: Record<string, unknown>): Promise<TriggerResult[]>;
  
  // Gestión de acciones
  registerAction(type: string, handler: EngineActionHandler): void;
  
  // Gestión de reglas
  updateRules(newRules: TriggerRule[]): void;
  getRules(): TriggerRule[];
  
  // Utilidades
  readonly config?: RuleEngineConfig;
}
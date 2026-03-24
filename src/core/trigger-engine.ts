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
import { ErrorMessages, DebugMessages } from "./constants";
import { createVarsContext } from "./vars-context";
import type { VarsStore, VarsAPI, VarsValue, VarsCallback, MergeOptions } from "./vars-context";

export class TriggerEngine {
  protected _rules: TriggerRule[] = [];
  protected actionHandlers: Map<string, EngineActionHandler> = new Map();
  protected lastExecution: Map<string, number> = new Map();
  protected _config?: RuleEngineConfig;
  /** Per-engine reactive variable store (values + callbacks, separate buckets) */
  protected _vars: VarsStore & VarsAPI;

  constructor(rulesOrConfig: TriggerRule[] | RuleEngineConfig = []) {
    if (Array.isArray(rulesOrConfig)) {
      this._rules = rulesOrConfig;
    } else {
      this._config = rulesOrConfig;
      this._rules = [...rulesOrConfig.rules];
    }

    // Create an isolated vars context for this engine instance
    this._vars = createVarsContext();
    // Ensure action registry is initialized with default values
    try {
      const { ActionRegistry } = require("./action-registry");
      ActionRegistry.getInstance(true);
    } catch(e) {
      console.log(e)
    }

    // Register built-in var-manipulation actions
    this._registerVarActions();

    this.sortRules();
  }

  /**
   * Sorts rules by priority (highest first)
   */
  protected sortRules(): void {
    this._rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Single handler for all var operations. Registered as action type `'vars'`.
   *
   * Rule usage:
   *   { type: 'vars', params: { op: 'set',       key: 'x', value: 42 } }
   *   { type: 'vars', params: { op: 'increment',  key: 'x', delta: 2 } }
   *   { type: 'vars', params: { op: 'decrement',  key: 'x', delta: 1 } }
   *   { type: 'vars', params: { op: 'delete',     key: 'x' } }
   *   { type: 'vars', params: { op: 'merge',      data: { a: 1, b: 2 }, overwrite: false } }
   *   { type: 'vars', params: { op: 'reset' } }
   */
  private _registerVarActions(): void {
    this.registerAction('vars', async (params, context) => {
      const op  = String(params.op ?? 'set');
      const key = params.key != null ? String(params.key) : '';
      const ctx = context.vars ?? {};

      switch (op) {
        case 'set': {
          const value = params.value as VarsValue;
          this._vars.set(key, value);
          ctx[key] = value;
          return { op, key, value };
        }

        case 'increment': {
          const delta = typeof params.delta === 'number' ? params.delta : 1;
          const next  = this._vars.increment(key, delta);
          ctx[key]    = next;
          return { op, key, value: next };
        }

        case 'decrement': {
          const delta = typeof params.delta === 'number' ? params.delta : 1;
          const next  = this._vars.decrement(key, delta);
          ctx[key]    = next;
          return { op, key, value: next };
        }

        case 'delete': {
          this._vars.delete(key);
          delete ctx[key];
          return { op, key, deleted: true };
        }

        case 'merge': {
          const overwrite = params.overwrite === true;
          const data: Record<string, VarsValue> = {};
          const raw = (params.data ?? params) as Record<string, unknown>;
          for (const [k, v] of Object.entries(raw)) {
            if (k === 'op' || k === 'overwrite' || k === 'data' || typeof v === 'function') continue;
            data[k] = v as VarsValue;
          }
          this._vars.merge(data, { overwrite });
          for (const [k, v] of Object.entries(data)) {
            if (overwrite || !(k in ctx)) ctx[k] = v;
          }
          return { op, merged: Object.keys(data), overwrite };
        }

        case 'reset': {
          const initial = (params.data ?? {}) as Record<string, VarsValue>;
          this._vars.reset(initial);
          // Reflect reset in the live context too
          for (const k of Object.keys(ctx)) delete ctx[k];
          Object.assign(ctx, this._vars.snapshot());
          return { op, keys: this._vars.keys() };
        }

        default:
          console.warn(`[vars action] Unknown op: "${op}"`);
          return { op, error: `unknown op "${op}"` };
      }
    });
  }

  /**
   * Registers a handler for a specific action type
   */
  registerAction(type: string, handler: EngineActionHandler): void {
    this.actionHandlers.set(type, handler);
  }

  /**
   * Register values and/or callbacks into the engine's vars store in one call.
   * Functions are automatically routed to the callbacks bucket;
   * everything else goes to the values bucket.
   *
   * By default existing keys are NOT overwritten (same as VarsContext.merge).
   * Pass `overwrite: true` to force replacement.
   *
   * @example
   * engine.registerVars({
   *   maxRetries: 3,              // → values
   *   label: 'v1',               // → values
   *   onFire: (ctx) => { ... },  // → callbacks
   * });
   */
  registerVars(
    data: Record<string, unknown>,
    options?: MergeOptions | boolean
  ): void {
    this._mergeWithCallbackRouting(data, options);
  }

  /**
   * Splits a mixed record into values / callbacks and merges each
   * into the appropriate bucket of `this._vars`.
   */
  private _mergeWithCallbackRouting(
    data: Record<string, unknown>,
    options?: MergeOptions | boolean
  ): void {
    const values:    Record<string, VarsValue>    = {};
    const callbacks: Record<string, VarsCallback> = {};

    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'function') {
        callbacks[k] = v as VarsCallback;
      } else {
        values[k] = v as VarsValue;
      }
    }

    if (Object.keys(values).length)    this._vars.merge(values, options);
    if (Object.keys(callbacks).length) this._vars.mergeCallbacks(callbacks, options);
  }

  /**
   * Processes an event with full context.
   * Injects the engine's persistent vars into context.vars before evaluation,
   * so conditions and interpolations can reference ${vars.x} freely.
   *
   * Any callbacks mixed into `context.vars` are automatically extracted and
   * registerd into `_vars._callbacks` before the plain snapshot is built.
   */
  async processEvent(context: TriggerContext): Promise<TriggerResult[]> {
    // ── Route callbacks out of context.vars, merge rest into engine vars ──
    if (context.vars && Object.keys(context.vars).length) {
      this._mergeWithCallbackRouting(context.vars, { overwrite: false });
    }
    // ── Rebuild context.vars with BOTH values AND callbacks ───────────────
    // Engine-level vars are the base; caller-supplied values take precedence.
    // Use snapshotWithCallbacks() so callbacks like vars.last() are accessible in expressions
    const callerValues: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(context.vars ?? {})) {
      if (typeof v !== 'function') callerValues[k] = v;
    }
    context.vars = { ...this._vars.snapshotWithCallbacks(), ...callerValues };

    const results: TriggerResult[] = [];
    // Filter rules by event and enabled status
    const candidates = this._rules.filter(r => r.enabled !== false && r.on === context.event);

    for (const rule of candidates) {
      // Check cooldown
      if (rule.cooldown && this.checkCooldown(rule.id, rule.cooldown)) {
        continue;
      }

      // Evaluate conditions using centralized utilities
      const conditionMet = EngineUtils.evaluateConditions(rule.if, context);
      
      // Determine which actions to execute based on condition
      let actionsToExecute: Action | Action[] | ActionGroup | (Action | ActionGroup)[] | undefined;
      
      if (conditionMet) {
        // Emit match event
        triggerEmitter.emit(EngineEvent.RULE_MATCH, { rule, context });
        actionsToExecute = rule.do;
      } else if (rule.else) {
        // Rule's if condition was false, execute else actions
        actionsToExecute = rule.else;
      }

      if (actionsToExecute) {
        // Execute actions
        const execResult = await this.executeRuleActions(actionsToExecute, context);

        // Update cooldown
        this.lastExecution.set(rule.id, Date.now());

        // ── Sync context.vars with engine vars after rule execution ──
        // This ensures that vars changes (e.g., vars.lastitem) are visible to subsequent rules
        const updatedVars = this._vars.snapshotWithCallbacks();
        for (const [k, v] of Object.entries(updatedVars)) {
          context.vars[k] = v;
        }

        results.push({
          ruleId: rule.id,
          success: true,
          executedActions: execResult
        });
      }

      // If not all rules should be evaluated, exit after first match
      if (!conditionMet && !rule.else && !this.shouldEvaluateAll()) {
        break;
      }
      
      if (conditionMet && !this.shouldEvaluateAll()) {
        break;
      }
    }

    return results;
  }

  /**
   * Convenience method to process simple events.
   * `vars` may contain a mix of plain values and callbacks —
   * callbacks are automatically routed to the `_callbacks` bucket.
   */
  async processEventSimple(
    eventType: string,
    data: Record<string, unknown> = {},
    vars: Record<string, unknown> = {}
  ): Promise<TriggerResult[]> {
    // Route any callbacks in vars to the right bucket immediately
    this._mergeWithCallbackRouting(vars, { overwrite: false });

    const context: TriggerContext = {
      event: eventType,
      data,
      vars,          // processEvent will strip functions & rebuild snapshot
      timestamp: Date.now(),
    };
    return this.processEvent(context);
  }

  /**
   * Updates the engine's rules
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
   * Gets all current rules
   */
  getRules(): TriggerRule[] {
    return [...this._rules];
  }

  /**
   * Checks if a rule is in cooldown
   */
  protected checkCooldown(ruleId: string, cooldown: number): boolean {
    const last = this.lastExecution.get(ruleId);
    if (!last) return false;
    return (Date.now() - last) < cooldown;
  }

  /**
   * Determines whether to evaluate all rules or just the first match
   */
  protected shouldEvaluateAll(): boolean {
    return this._config?.globalSettings?.evaluateAll ?? true;
  }

  /**
   * Evaluates rule conditions (overridable)
   */
  protected evaluateConditions(
    condition: RuleCondition | RuleCondition[] | undefined,
    context: TriggerContext
  ): boolean {
    return EngineUtils.evaluateConditions(condition, context);
  }

  /**
   * Evaluates a single condition (overridable)
   */
  protected evaluateSingleCondition(cond: RuleCondition, context: TriggerContext): boolean {
      // Wraps around EngineUtils implementation for backward compatibility if anyone overrides it
      return EngineUtils.evaluateConditions(cond, context);
  }

  /**
   * Executes the actions of a rule
   */
  protected async executeRuleActions(
    actionConfig: Action | Action[] | ActionGroup | (Action | ActionGroup)[],
    context: TriggerContext
  ): Promise<ExecutedAction[]> {
    const { actionsToExecute } = EngineUtils.selectActions(actionConfig);
    const executionLogs: ExecutedAction[] = [];

    for (const action of actionsToExecute) {
      // Handle nested ActionGroups
      if ('actions' in action && 'mode' in action) {
        executionLogs.push(...(await this.executeRuleActions(action, context)));
        continue;
      }

      const act = action as Action;

      // Handle conditional actions
      if ('if' in act && act.if && (act.then || act.else || act.do)) {
        const conditionMet = this.evaluateConditions(act.if, context);
        
        // 'do' is an alias for 'then'
        const thenActions = act.then || act.do;
        
        if (conditionMet && thenActions) {
          executionLogs.push(...(await this.executeRuleActions(thenActions as Action | Action[] | ActionGroup | (Action | ActionGroup)[], context)));
        } else if (!conditionMet && act.else) {
          executionLogs.push(...(await this.executeRuleActions(act.else, context)));
        }
        continue;
      }

      // Handle direct if shorthand
      if ('if' in act && act.if) {
        if (!this.evaluateConditions(act.if, context)) continue;
      }

      const result = await this.executeSingleAction(act, context);
      executionLogs.push(result);
      
      if (result.type === 'BREAK') break;
    }

    return executionLogs;
  }

  /**
   * Executes a single action
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
      const msg = `${ErrorMessages.UNKNOWN_ACTION}: ${normalizedAction.type}`;
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
   * Interpolates parameters
   */
  protected interpolateParams(params: ActionParams, context: TriggerContext): ActionParams {
    return EngineUtils.interpolateParams(params, context);
  }

  // ── Public getters ─────────────────────────────────────────────────────

  get rules(): TriggerRule[] {
    return [...this._rules];
  }

  get config(): RuleEngineConfig | undefined {
    return this._config;
  }

  /**
   * The reactive variable store for this engine instance.
   * Values (primitives/objects) and callbacks live in separate internal buckets.
   *
   * @example
   * engine.vars.hits = 0;
   * engine.vars.increment('hits');                // → 1
   * engine.vars.merge({ maxRetries: 3 });         // non-overwriting
   * engine.vars.interpolate('total: ${vars.hits}'); // → "total: 1"
   */
  get vars(): VarsStore & VarsAPI {
    return this._vars;
  }

  // ── Setters ─────────────────────────────────────────────────────────────

  set rules(newRules: TriggerRule[]) {
    this._rules = [...newRules];
    this.sortRules();
  }
}

// Also export type for compatibility
export type { TriggerEngine as BaseEngine };

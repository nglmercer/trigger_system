/**
 * VarsContext — Global in-memory proxy context
 *
 * Internally splits storage into two independent buckets:
 *   · _values    — primitives, plain objects, arrays (never functions)
 *   · _callbacks — functions / callbacks only
 *
 * The Proxy routes automatically based on `typeof value`:
 *   vars.count   = 5          → _values
 *   vars.onFire  = () => {}   → _callbacks
 *
 * String interpolation is powered by ExpressionEngine.interpolate so that
 * templates like  "${vars.count} events fired"  resolve against the store.
 *
 * Merge is NON-overwriting by default. Use { overwrite: true } or vars.set()
 * for explicit replacement. vars.delete('key') is the only way to remove a key.
 */

import { ExpressionEngine } from "./expression-engine";
import type { TriggerContext } from "../types";

// ─── Public types ────────────────────────────────────────────────────────────

export type VarsCallback = (...args: unknown[]) => unknown;
export type VarsPrimitive = string | number | boolean | null;
export type VarsObject    = Record<string, unknown> | unknown[];
export type VarsValue     = VarsPrimitive | VarsObject;   // NEVER a function
export type VarsStore     = Record<string, VarsValue>;

export interface MergeOptions {
  /** When true, existing keys are overwritten. Default: false */
  overwrite?: boolean;
}

// ─── API surface ──────────────────────────────────────────────────────────────

export interface VarsAPI {
  /**
   * Merge plain values (non-function) into the store.
   * Callbacks inside the object are silently skipped — use mergeCallbacks() for those.
   * By default existing keys are NOT overwritten.
   */
  merge(data: VarsStore, options?: MergeOptions | boolean): void;

  /**
   * Merge callbacks into the callbacks bucket.
   * By default existing keys are NOT overwritten.
   */
  mergeCallbacks(data: Record<string, VarsCallback>, options?: MergeOptions | boolean): void;

  /**
   * Explicitly set a value (always overwrites). Only for non-function values.
   */
  set<T extends VarsValue = VarsValue>(key: string, value: T): void;

  /**
   * Explicitly register a callback (always overwrites).
   */
  setCallback(key: string, fn: VarsCallback): void;

  /**
   * Delete a key from values OR callbacks.
   * This is the ONLY way to remove a key.
   */
  delete(key: string): boolean;

  /** Check whether a key exists in values or callbacks. */
  has(key: string): boolean;

  /** Retrieve a stored value (typed convenience). */
  get<T extends VarsValue = VarsValue>(key: string): T | undefined;

  /** Retrieve a stored callback. */
  getCallback(key: string): VarsCallback | undefined;

  /**
   * Call a stored callback by key with the given arguments.
   * Throws if the key is not a registered callback.
   */
  call(key: string, ...args: unknown[]): unknown;

  /**
   * Interpolate a template string against the current value store.
   * Uses ExpressionEngine.interpolate internally.
   *
   * @example
   * vars.count = 42;
   * vars.interpolate("fired ${vars.count} times"); // → "fired 42 times"
   */
  interpolate(template: string): string;

  /**
   * Increment a numeric value by delta (default 1).
   * Initialises to 0 if the key does not exist or is not a number.
   */
  increment(key: string, delta?: number): number;

  /**
   * Decrement a numeric value by delta (default 1).
   * Initialises to 0 if the key does not exist or is not a number.
   */
  decrement(key: string, delta?: number): number;

  /** Shallow copy of the current value store. */
  snapshot(): VarsStore;

  /** Shallow copy of the current callback registry. */
  snapshotCallbacks(): Record<string, VarsCallback>;

  /**
   * Shallow copy of both values AND callbacks combined.
   * Useful for building context where callbacks need to be accessible in expressions.
   * @example
   * const varsForContext = vars.snapshotWithCallbacks();
   * // varsForContext includes both values and callbacks
   */
  snapshotWithCallbacks(): Record<string, unknown>;

  /**
   * Reset value store (and optionally the callback store) to a new initial state.
   * By default callbacks are preserved unless resetCallbacks is true.
   */
  reset(initial?: VarsStore, resetCallbacks?: boolean): void;

  /** Keys present in the value store. */
  keys(): string[];

  /** Keys present in the callback store. */
  callbackKeys(): string[];

  /**
   * Build a minimal TriggerContext from the current value store so it can be
   * passed directly to ExpressionEngine or EngineUtils methods.
   *
   * @example
   * const ctx = vars.toContext({ event: 'tick', data: payload });
   * EngineUtils.evaluateConditions(rule.if, ctx);
   */
  toContext(overrides?: Partial<TriggerContext>): TriggerContext;
}

// ─── Reserved API surface keys ────────────────────────────────────────────────
const API_KEYS = new Set<string>([
  "merge", "mergeCallbacks",
  "set", "setCallback",
  "delete", "has",
  "get", "getCallback",
  "call", "interpolate",
  "increment", "decrement",
  "snapshot", "snapshotCallbacks", "snapshotWithCallbacks",
  "reset", "keys", "callbackKeys",
  "toContext",
]);

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createVarsContext = (): VarsStore & VarsAPI => {
  // Only non-function values live here
  const _values: Record<string, VarsValue> = Object.create(null);
  // Only functions live here
  const _callbacks: Record<string, VarsCallback> = Object.create(null);

  // ── helpers ──────────────────────────────────────────────────────────────
  function guardKey(key: string, label: string): boolean {
    if (API_KEYS.has(key)) {
      console.warn(`[VarsContext] ${label}: "${key}" is a reserved API key and cannot be used.`);
      return false;
    }
    return true;
  }

  function shouldOverwrite(kv: string, options: MergeOptions | boolean | undefined, bucket: Record<string, unknown>): boolean {
    const ow = typeof options === "boolean" ? options : (options?.overwrite ?? false);
    return ow || !(kv in bucket);
  }

  /** Build a minimal TriggerContext that ExpressionEngine can work with */
  function buildContext(overrides?: Partial<TriggerContext>): TriggerContext {
    // Include both values AND callbacks in vars so expressions like ${vars.last()} work
    const varsSnapshot: Record<string, unknown> = { ..._values };
    // Add callbacks to the snapshot so they're accessible in expressions
    for (const [key, fn] of Object.entries(_callbacks)) {
      varsSnapshot[key] = fn;
    }
    
    return {
      event: overrides?.event ?? "",
      timestamp: overrides?.timestamp ?? Date.now(),
      data: overrides?.data ?? {},
      vars: varsSnapshot,
      env: overrides?.env,
      id: overrides?.id,
    };
  }

  // ── API ───────────────────────────────────────────────────────────────────
  const api: VarsAPI = {
    // ── merge values (non-functions) ────────────────────────────────────
    merge(data: VarsStore, options?: MergeOptions | boolean): void {
      for (const key of Object.keys(data)) {
        if (!guardKey(key, "merge")) continue;
        const val = data[key];
        if (typeof val === "function") {
          console.warn(`[VarsContext] merge(): "${key}" is a function — use mergeCallbacks() instead. Skipped.`);
          continue;
        }
        if (shouldOverwrite(key, options, _values)) {
          _values[key] = val as VarsValue;
        }
      }
    },

    // ── merge callbacks ─────────────────────────────────────────────────
    mergeCallbacks(data: Record<string, VarsCallback>, options?: MergeOptions | boolean): void {
      for (const key of Object.keys(data)) {
        if (!guardKey(key, "mergeCallbacks")) continue;
        const fn = data[key];
        if (typeof fn !== "function") {
          console.warn(`[VarsContext] mergeCallbacks(): "${key}" is not a function. Skipped.`);
          continue;
        }
        if (shouldOverwrite(key, options, _callbacks)) {
          _callbacks[key] = fn;
        }
      }
    },

    // ── explicit value set ──────────────────────────────────────────────
    set<T extends VarsValue = VarsValue>(key: string, value: T): void {
      if (!guardKey(key, "set")) return;
      if (typeof value === "function") {
        console.warn(`[VarsContext] set(): "${key}" is a function — use setCallback() instead.`);
        return;
      }
      _values[key] = value as VarsValue;
    },

    // ── explicit callback registration ──────────────────────────────────
    setCallback(key: string, fn: VarsCallback): void {
      if (!guardKey(key, "setCallback")) return;
      if (typeof fn !== "function") {
        console.warn(`[VarsContext] setCallback(): "${key}" value is not a function.`);
        return;
      }
      _callbacks[key] = fn;
    },

    // ── delete (values OR callbacks) ────────────────────────────────────
    delete(key: string): boolean {
      if (!guardKey(key, "delete")) return false;
      const inValues   = key in _values;
      const inCallback = key in _callbacks;
      if (inValues)   delete _values[key];
      if (inCallback) delete _callbacks[key];
      return inValues || inCallback;
    },

    // ── existence check ─────────────────────────────────────────────────
    has(key: string): boolean {
      return key in _values || key in _callbacks;
    },

    // ── value getter ────────────────────────────────────────────────────
    get<T extends VarsValue = VarsValue>(key: string): T | undefined {
      return _values[key] as T | undefined;
    },

    // ── callback getter ─────────────────────────────────────────────────
    getCallback(key: string): VarsCallback | undefined {
      return _callbacks[key];
    },

    // ── call a callback ─────────────────────────────────────────────────
    call(key: string, ...args: unknown[]): unknown {
      const fn = _callbacks[key];
      if (typeof fn !== "function") {
        throw new TypeError(
          `[VarsContext] call(): "${key}" is not a registered callback (got ${typeof (_values[key] ?? fn)}).`
        );
      }
      return fn(...args);
    },

    // ── interpolate a template using ExpressionEngine ────────────────────
    interpolate(template: string): string {
      return ExpressionEngine.interpolate(template, buildContext());
    },

    // ── numeric helpers ─────────────────────────────────────────────────
    increment(key: string, delta = 1): number {
      const cur = typeof _values[key] === "number" ? (_values[key] as number) : 0;
      const next = cur + delta;
      _values[key] = next;
      return next;
    },

    decrement(key: string, delta = 1): number {
      const cur = typeof _values[key] === "number" ? (_values[key] as number) : 0;
      const next = cur - delta;
      _values[key] = next;
      return next;
    },

    // ── snapshots ───────────────────────────────────────────────────────
    snapshot(): VarsStore {
      return { ..._values };
    },

    snapshotCallbacks(): Record<string, VarsCallback> {
      return { ..._callbacks };
    },

    snapshotWithCallbacks(): Record<string, unknown> {
      const combined: Record<string, unknown> = { ..._values };
      for (const [key, fn] of Object.entries(_callbacks)) {
        combined[key] = fn;
      }
      return combined;
    },

    // ── reset ───────────────────────────────────────────────────────────
    reset(initial: VarsStore = {}, resetCallbacks = false): void {
      for (const k of Object.keys(_values))   delete _values[k];
      if (resetCallbacks) {
        for (const k of Object.keys(_callbacks)) delete _callbacks[k];
      }
      for (const [k, v] of Object.entries(initial)) {
        if (!API_KEYS.has(k) && typeof v !== "function") {
          _values[k] = v as VarsValue;
        }
      }
    },

    // ── key enumerations ────────────────────────────────────────────────
    keys():         string[] { return Object.keys(_values); },
    callbackKeys(): string[] { return Object.keys(_callbacks); },

    // ── context builder for ExpressionEngine / EngineUtils ──────────────
    toContext(overrides?: Partial<TriggerContext>): TriggerContext {
      return buildContext(overrides);
    },
  };

  // ── Proxy ─────────────────────────────────────────────────────────────────
  return new Proxy(api as VarsStore & VarsAPI, {
    get(_target, prop: string | symbol): unknown {
      if (typeof prop === "symbol") return undefined;
      const key = prop as string;

      // Always expose API methods first
      if (API_KEYS.has(key)) return api[key as keyof VarsAPI];

      // Callbacks take priority for call-via-dot (but you still need vars.call())
      if (key in _callbacks) return _callbacks[key];

      // Plain value
      return _values[key];
    },

    set(_target, prop: string | symbol, value: unknown): boolean {
      if (typeof prop === "symbol") return false;
      const key = prop as string;

      if (API_KEYS.has(key)) {
        console.warn(`[VarsContext] "${key}" is a reserved API method and cannot be overwritten.`);
        return false;
      }

      // Route by type
      if (typeof value === "function") {
        _callbacks[key] = value as VarsCallback;
      } else {
        _values[key] = value as VarsValue;
      }
      return true;
    },

    has(_target, prop: string | symbol): boolean {
      const key = String(prop);
      return API_KEYS.has(key) || key in _values || key in _callbacks;
    },

    deleteProperty(_target, prop: string | symbol): boolean {
      console.warn(
        `[VarsContext] Use vars.delete("${String(prop)}") instead of \`delete vars.${String(prop)}\`.`
      );
      return false;
    },

    ownKeys(): string[] {
      return [...new Set([...API_KEYS, ...Object.keys(_values), ...Object.keys(_callbacks)])];
    },

    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      const key = String(prop);
      if (API_KEYS.has(key)) {
        return { configurable: true, enumerable: false, writable: false, value: api[key as keyof VarsAPI] };
      }
      if (key in _values) {
        return { configurable: true, enumerable: true, writable: true, value: _values[key] };
      }
      if (key in _callbacks) {
        return { configurable: true, enumerable: true, writable: true, value: _callbacks[key] };
      }
      return undefined;
    },
  });
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/**
 * Global vars proxy — single shared instance across the engine lifecycle.
 *
 * @example
 * import { vars } from './vars-context';
 *
 * // --- values (primitives / objects / arrays) ---
 * vars.count = 0;
 * vars.increment('count');          // → 1
 * vars.count++;                     // → 2  (via proxy set)
 *
 * vars.merge({ maxRetries: 3, label: 'v1' });  // non-overwriting
 * vars.set('label', 'v2');                      // explicit overwrite
 * vars.delete('label');
 *
 * // --- callbacks ---
 * vars.onFire = (ctx) => console.log(ctx);     // auto-routed to callbacks
 * vars.call('onFire', someContext);
 * vars.setCallback('onFire', newFn);           // explicit overwrite
 *
 * // --- interpolation via ExpressionEngine ---
 * vars.name = 'World';
 * vars.interpolate('Hello ${vars.name}!');     // → "Hello World!"
 *
 * // --- build a TriggerContext to use with EngineUtils ---
 * const ctx = vars.toContext({ event: 'tick', data: payload });
 * EngineUtils.evaluateConditions(rule.if, ctx);
 */
export const vars = createVarsContext();

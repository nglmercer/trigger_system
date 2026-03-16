import type { ActionParams, ActionParamValue } from "../../types";

/**
 * Fluent builder for constructing action parameters.
 * Useful for building complex parameter objects in a readable way.
 * 
 * @example
 * const params = new ParamsBuilder()
 *   .set("message", "Hello world")
 *   .set("count", 5)
 *   .set("items", [1, 2, 3])
 *   .set("nested", new ParamsBuilder().set("key", "value").build())
 *   .build();
 */
export class ParamsBuilder {
  private params: ActionParams = {};

  /**
   * Set a parameter value.
   */
  set<T extends ActionParamValue>(key: string, value: T): this {
    this.params[key] = value;
    return this;
  }

  /**
   * Set multiple parameters at once.
   */
  setAll(params: ActionParams): this {
    Object.assign(this.params, params);
    return this;
  }

  /**
   * Set a nested parameter using dot notation.
   * 
   * @example
   * paramsBuilder.setNested("user.profile.name", "John")
   * // Results in: { user: { profile: { name: "John" } } }
   */
  setNested(key: string, value: ActionParamValue): this {
    const keys = key.split('.');
    let current: Record<string, unknown> = this.params;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!k) continue;
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
    return this;
  }

  /**
   * Add an item to an array parameter.
   * Creates the array if it doesn't exist.
   */
  addItem(key: string, item: ActionParamValue): this {
    if (!(key in this.params) || !Array.isArray(this.params[key])) {
      this.params[key] = [];
    }
    (this.params[key] as ActionParamValue[]).push(item);
    return this;
  }

  /**
   * Remove a parameter.
   */
  remove(key: string): this {
    delete this.params[key];
    return this;
  }

  /**
   * Check if a parameter exists.
   */
  has(key: string): boolean {
    return key in this.params;
  }

  /**
   * Get a parameter value.
   */
  get(key: string): ActionParamValue | undefined {
    return this.params[key];
  }

  /**
   * Build the final params object.
   */
  build(): ActionParams {
    return { ...this.params };
  }

  /**
   * Get the raw params object (without copying).
   * Use with caution.
   */
  getRaw(): ActionParams {
    return this.params;
  }
}

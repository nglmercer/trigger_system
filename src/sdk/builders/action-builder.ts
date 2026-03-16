import type { ExecutionMode, Action, ActionGroup, ActionParams } from "../../types";

/**
 * Builder for creating actions fluently.
 */
export class ActionBuilder {
  private actions: Action[] = [];
  private mode: ExecutionMode = 'ALL';

  /**
   * Set the execution mode for the action group.
   */
  setMode(mode: ExecutionMode): this {
    this.mode = mode;
    return this;
  }

  /**
   * Add an action to the group.
   */
  add(type: string, params?: ActionParams, options?: { delay?: number, probability?: number }): this {
    this.actions.push({
      type,
      params,
      ...options
    });
    return this;
  }

  /**
   * Build the action, action array, or action group.
   */
  build(): Action | Action[] | ActionGroup {
    if (this.actions.length === 0) {
      throw new Error("Action group must have at least one action");
    }
    if (this.actions.length === 1 && this.mode === 'ALL') {
      return this.actions[0] as Action;
    }
    if (this.mode === 'ALL') {
      return this.actions as Action[];
    }
    const group: ActionGroup = {
      mode: this.mode,
      actions: this.actions
    };
    return group as ActionGroup;
  }
}

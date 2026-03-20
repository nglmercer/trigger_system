// Re-export from optimize module
export { optimizeCondition, optimizeAction, type OptimizeOptions } from './optimize';

// Re-export from builders module
export { ConditionBuilder, ActionBuilder, ParamsBuilder } from './builders';

// Re-export from graph-parser
export { 
  type GraphParserOptions, 
  type GraphParserContext 
} from './graph/types';

// RuleBuilder is the main class - kept here for convenience
import { 
  type GraphParserOptions, 
  type GraphParserContext,
  parseGraph,
  parseGraphToRules 
} from './graph-parser';
import { optimizeCondition, optimizeAction, type OptimizeOptions } from './optimize';
import type {
  TriggerRule,
  RuleCondition,
  Action,
  ActionGroup,
  ComparisonOperator,
  ExecutionMode,
  ConditionValue,
  ActionParams,
  SDKGraphNode,
  SDKGraphEdge
} from "../types";
import { ConditionBuilder, ActionBuilder, ParamsBuilder } from './builders';

/**
 * Main RuleBuilder class for creating trigger rules fluently.
 */
export class RuleBuilder {
  private rule: Partial<TriggerRule> = {
    enabled: true,
    priority: 0
  };
  
  private optimizeOptions: OptimizeOptions = {};

  /**
   * Build a TriggerRule strictly from a standard set of nodes and edges.
   * This is useful for UIs (like React Flow) that manage condition topologies.
   */
  static fromGraph(
    nodes: SDKGraphNode[], 
    edges: SDKGraphEdge[], 
    options?: GraphParserOptions,
    transformers?: GraphParserContext['transformers']
  ): RuleBuilder {
    return parseGraph(nodes, edges, options, transformers);
  }

  /**
   * Build multiple TriggerRules from a graph with multiple Event nodes.
   * This allows editing multiple rules in a single editor view.
   * 
   * @returns Array of TriggerRules, one for each Event node found
   */
  static fromGraphMultiple(
    nodes: SDKGraphNode[], 
    edges: SDKGraphEdge[], 
    options?: GraphParserOptions,
    transformers?: GraphParserContext['transformers']
  ): { rules: TriggerRule[]; errors: string[] } {
    return parseGraphToRules(nodes, edges, options, transformers);
  }

  withId(id: string): this {
    this.rule.id = id;
    return this;
  }

  withName(name: string): this {
    this.rule.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.rule.description = description;
    return this;
  }

  withPriority(priority: number): this {
    this.rule.priority = priority;
    return this;
  }

  withCooldown(cooldown: number): this {
    this.rule.cooldown = cooldown;
    return this;
  }

  withTags(tags: string[]): this {
    this.rule.tags = tags;
    return this;
  }

  withEnabled(enabled: boolean): this {
    this.rule.enabled = enabled;
    return this;
  }

  /**
   * Set optimization options for deduplication behavior.
   * @param options - Options to control how conditions/actions are deduplicated
   */
  withOptimizeOptions(options: OptimizeOptions): this {
    this.optimizeOptions = options;
    return this;
  }

  // --- Fluent Aliases ---
  id(id: string) { return this.withId(id); }
  name(name: string) { return this.withName(name); }
  description(desc: string) { return this.withDescription(desc); }
  priority(p: number) { return this.withPriority(p); }
  enabled(e: boolean) { return this.withEnabled(e); }
  cooldown(c: number) { return this.withCooldown(c); }
  tags(t: string[]) { return this.withTags(t); }
  optimize(options: OptimizeOptions) { return this.withOptimizeOptions(options); }

  on(event: string): this {
    this.rule.on = event;
    return this;
  }

  if(field: string, operator: ComparisonOperator, value?: ConditionValue): this {
    if (!this.rule.if) {
      this.rule.if = { field, operator, value };
    } else if (Array.isArray(this.rule.if)) {
      (this.rule.if as RuleCondition[]).push({ field, operator, value });
    } else {
      this.rule.if = [this.rule.if as RuleCondition, { field, operator, value }];
    }
    return this;
  }

  ifComplex(sub: (builder: ConditionBuilder) => ConditionBuilder): this {
    const builder = new ConditionBuilder();
    const result = sub(builder).build();
    this.rule.if = result;
    return this;
  }

  withIf(condition: RuleCondition | RuleCondition[]): this {
    this.rule.if = condition;
    return this;
  }

  do(type: string, params?: ActionParams, options?: { delay?: number, probability?: number }): this {
    const action: Action = { type, params, ...options };
    if (!this.rule.do) {
      this.rule.do = action;
    } else if (Array.isArray(this.rule.do)) {
      this.rule.do.push(action);
    } else if (this.rule.do && typeof this.rule.do === 'object' && 'actions' in this.rule.do) {
      (this.rule.do as ActionGroup).actions.push(action);
    } else {
      this.rule.do = [this.rule.do as Action, action];
    }
    return this;
  }

  doComplex(sub: (builder: ActionBuilder) => ActionBuilder): this {
    const builder = new ActionBuilder();
    const result = sub(builder).build();
    this.rule.do = result;
    return this;
  }

  withDo(action: Action | ActionGroup | (Action | ActionGroup)[]): this {
    this.rule.do = action;
    return this;
  }

  /**
   * Add an else clause at the rule level (when rule's 'if' condition is false).
   * This is different from action-level else - it's for when the entire rule's condition fails.
   * 
   * @example
   * builder
   *   .id("rule-1")
   *   .on("event")
   *   .if("data.status", "EQ", "active")
   *   .do("notify", { message: "Active!" })
   *   .elseRule("log", { message: "Not active" })
   */
  elseRule(action: Action | Action[] | ActionGroup): this {
    this.rule.else = action;
    return this;
  }

  /**
   * Start a conditional action block with an 'if' condition.
   * Returns a ConditionalActionBuilder to chain then/do/else actions.
   * 
   * @example
   * builder
   *   .on("event")
   *   .when("data.status", "EQ", "active")
   *   .then("notify", { message: "Active!" })
   *   .else("log", { message: "Not active" })
   */
  when(field: string, operator: ComparisonOperator, value?: ConditionValue): ConditionalActionBuilder {
    return new ConditionalActionBuilder(this, field, operator, value);
  }

  /**
   * Start a complex conditional action block using a condition builder.
   * 
   * @example
   * builder
   *   .on("event")
   *   .whenComplex(cb => cb.where("data.status", "EQ", "active").and(sub => sub.where("data.priority", "GT", 5)))
   *   .then("notify", { message: "Active and high priority!" })
   *   .else("log", { message: "Not active or low priority" })
   */
  whenComplex(sub: (builder: ConditionBuilder) => ConditionBuilder): ConditionalActionBuilder {
    const builder = new ConditionBuilder();
    const condition = sub(builder).build();
    return new ConditionalActionBuilder(this, condition);
  }

  /**
   * Alias for do() - provided for compatibility with then/else syntax.
   * Note: Using 'do' is recommended, 'then' is allowed for compatibility.
   */
  then(type: string, params?: ActionParams, options?: { delay?: number, probability?: number }): this {
    return this.do(type, params, options);
  }

  /**
   * Add a condition to the last action in the rule.
   * This allows for conditional action execution: if condition is true, execute then actions, else execute else actions.
   * Use with then() and else() methods for full conditional support.
   * 
   * @example
   * builder
   *   .ifAction("data.status", "EQ", "active")
   *   .then("notify", { message: "Active!" })
   *   .else("notify", { message: "Not active" })
   */
  ifAction(field: string, operator: ComparisonOperator, value?: ConditionValue): this {
    const currentDo = this.rule.do;
    
    if (!currentDo) {
      throw new Error("Cannot add condition: no action defined. Use do() or then() first.");
    }

    // Helper to add if to an action
    const addIfToAction = (act: Action): Action => ({
      ...act,
      if: { field, operator, value }
    });

    if (Array.isArray(currentDo)) {
      // Get the last action and add if to it
      const lastIndex = currentDo.length - 1;
      const lastItem = currentDo[lastIndex];
      
      if (lastItem && 'actions' in lastItem) {
        // It's an ActionGroup - add if to its last action
        const groupActions = (lastItem as ActionGroup).actions;
        const lastActionIndex = groupActions.length - 1;
        if (lastActionIndex >= 0) {
          groupActions[lastActionIndex] = addIfToAction(groupActions[lastActionIndex] as Action);
        }
      } else if (lastItem) {
        // It's a regular Action
        currentDo[lastIndex] = addIfToAction(lastItem as Action);
      }
    } else if (currentDo && 'actions' in currentDo) {
      // It's an ActionGroup
      const groupActions = (currentDo as ActionGroup).actions;
      const lastActionIndex = groupActions.length - 1;
      if (lastActionIndex >= 0) {
        groupActions[lastActionIndex] = addIfToAction(groupActions[lastActionIndex] as Action);
      }
    } else if (currentDo) {
      // It's a single Action
      this.rule.do = addIfToAction(currentDo as Action);
    }

    return this;
  }

  /**
   * Add a then clause (actions to run if condition is true) to the last action.
   * This allows for conditional action execution: if condition is true, execute then actions.
   * The previous action must have an 'if' condition for then to work properly.
   * 
   * @example
   * builder
   *   .do("checkStatus", { status: "active" })
   *   .ifAction("data.status", "EQ", "active")
   *   .thenAction("notify", { message: "Active!" })
   *   .elseAction("notify", { message: "Not active" })
   */
  thenAction(action: Action | Action[] | ActionGroup): this {
    // Get the current do and add then to the last action
    const currentDo = this.rule.do;
    
    if (!currentDo) {
      throw new Error("Cannot add then: no action defined. Use do() or then() first.");
    }

    // Helper to add then to an action
    const addThenToAction = (act: Action): Action => ({
      ...act,
      then: action
    });

    if (Array.isArray(currentDo)) {
      // Get the last action and add then to it
      const lastIndex = currentDo.length - 1;
      const lastItem = currentDo[lastIndex];
      
      if (lastItem && 'actions' in lastItem) {
        // It's an ActionGroup - add then to its last action
        const groupActions = (lastItem as ActionGroup).actions;
        const lastActionIndex = groupActions.length - 1;
        if (lastActionIndex >= 0) {
          groupActions[lastActionIndex] = addThenToAction(groupActions[lastActionIndex] as Action);
        }
      } else if (lastItem) {
        // It's a regular Action
        currentDo[lastIndex] = addThenToAction(lastItem as Action);
      }
    } else if (currentDo && 'actions' in currentDo) {
      // It's an ActionGroup
      const groupActions = (currentDo as ActionGroup).actions;
      const lastActionIndex = groupActions.length - 1;
      if (lastActionIndex >= 0) {
        groupActions[lastActionIndex] = addThenToAction(groupActions[lastActionIndex] as Action);
      }
    } else if (currentDo) {
      // It's a single Action
      this.rule.do = addThenToAction(currentDo as Action);
    }

    return this;
  }

  /**
   * Add an else clause to the last action in the rule.
   * This allows for conditional action execution: if condition is false, execute else actions.
   * The previous action must have an 'if' condition for else to work properly.
   * 
   * @example
   * builder
   *   .do("checkStatus", { status: "active" })
   *   .ifAction("data.status", "EQ", "active")
   *   .thenAction({ type: "notify", params: { message: "Active!" } })
   *   .elseAction({ type: "notify", params: { message: "Not active" } })
   */
  else(action: Action | Action[] | ActionGroup): this {
    // Get the current do and add else to the last action
    const currentDo = this.rule.do;
    
    if (!currentDo) {
      throw new Error("Cannot add else: no action defined. Use do() or then() first.");
    }

    // Helper to add else to an action
    const addElseToAction = (act: Action): Action => ({
      ...act,
      else: action
    });

    if (Array.isArray(currentDo)) {
      // Get the last action and add else to it
      const lastIndex = currentDo.length - 1;
      const lastItem = currentDo[lastIndex];
      
      if (lastItem && 'actions' in lastItem) {
        // It's an ActionGroup - add else to its last action
        const groupActions = (lastItem as ActionGroup).actions;
        const lastActionIndex = groupActions.length - 1;
        if (lastActionIndex >= 0) {
          groupActions[lastActionIndex] = addElseToAction(groupActions[lastActionIndex] as Action);
        }
      } else if (lastItem) {
        // It's a regular Action
        currentDo[lastIndex] = addElseToAction(lastItem as Action);
      }
    } else if (currentDo && 'actions' in currentDo) {
      // It's an ActionGroup
      const groupActions = (currentDo as ActionGroup).actions;
      const lastActionIndex = groupActions.length - 1;
      if (lastActionIndex >= 0) {
        groupActions[lastActionIndex] = addElseToAction(groupActions[lastActionIndex] as Action);
      }
    } else if (currentDo) {
      // It's a single Action - wrap in array and add else
      this.rule.do = [addElseToAction(currentDo as Action)];
    }

    return this;
  }

  /**
   * Alias for else() - provided for consistency with thenAction().
   */
  elseAction(action: Action | Action[] | ActionGroup): this {
    return this.else(action);
  }

  /**
   * Build the final TriggerRule.
   */
  build(): TriggerRule {
    if (!this.rule.id) throw new Error("Rule ID is required");
    if (!this.rule.on) throw new Error("Rule 'on' event is required");
    if (!this.rule.do) throw new Error("Rule 'do' action is required");

    // Optimize structures before finalizing
    if (this.rule.if) {
      this.rule.if = optimizeCondition(this.rule.if as RuleCondition | RuleCondition[], this.optimizeOptions);
    }
    
    if (this.rule.do) {
      const opt = optimizeAction(this.rule.do as Action | ActionGroup | (Action | ActionGroup)[], this.optimizeOptions);
      this.rule.do = opt ? opt : this.rule.do;
    }

    return this.rule as TriggerRule;
  }
}

/**
 * Builder for creating conditional actions with if/then/else flow.
 * This class is used by RuleBuilder.when() and RuleBuilder.whenComplex() methods.
 */
export class ConditionalActionBuilder {
  private parent: RuleBuilder;
  private condition: RuleCondition;
  private thenActions: Action | Action[] | ActionGroup | undefined;
  private elseActions: Action | Action[] | ActionGroup | undefined;

  constructor(
    parent: RuleBuilder,
    fieldOrCondition: string | RuleCondition,
    operator?: ComparisonOperator,
    value?: ConditionValue
  ) {
    this.parent = parent;
    if (typeof fieldOrCondition === 'string') {
      this.condition = { field: fieldOrCondition, operator: operator!, value };
    } else {
      this.condition = fieldOrCondition;
    }
  }

  /**
   * Set the action(s) to execute when the condition is true.
   * 'then' is an alias for 'do' - both can be used interchangeably.
   */
  then(type: string, params?: ActionParams, options?: { delay?: number; probability?: number }): ConditionalActionBuilder;
  then(actions: Action | Action[] | ActionGroup): ConditionalActionBuilder;
  then(
    typeOrActions: string | Action | Action[] | ActionGroup,
    params?: ActionParams,
    options?: { delay?: number; probability?: number }
  ): ConditionalActionBuilder {
    if (typeof typeOrActions === 'string') {
      this.thenActions = { type: typeOrActions, params, ...options };
    } else {
      this.thenActions = typeOrActions;
    }
    return this;
  }

  /**
   * Alias for then() - 'do' can be used interchangeably with 'then'.
   */
  do(type: string, params?: ActionParams, options?: { delay?: number; probability?: number }): ConditionalActionBuilder;
  do(actions: Action | Action[] | ActionGroup): ConditionalActionBuilder;
  do(
    typeOrActions: string | Action | Action[] | ActionGroup,
    params?: ActionParams,
    options?: { delay?: number; probability?: number }
  ): ConditionalActionBuilder {
    return this.then(typeOrActions as any, params, options);
  }

  /**
   * Complete the conditional action and return to the RuleBuilder.
   * Call this when you're done building the conditional action.
   */
  done(): RuleBuilder {
    return this.build();
  }

  /**
   * Set the action(s) to execute when the condition is false.
   */
  else(type: string, params?: ActionParams, options?: { delay?: number; probability?: number }): RuleBuilder;
  else(actions: Action | Action[] | ActionGroup): RuleBuilder;
  else(
    typeOrActions: string | Action | Action[] | ActionGroup,
    params?: ActionParams,
    options?: { delay?: number; probability?: number }
  ): RuleBuilder {
    if (typeof typeOrActions === 'string') {
      this.elseActions = { type: typeOrActions, params, ...options };
    } else {
      this.elseActions = typeOrActions;
    }
    return this.build();
  }

  /**
   * Build and add the conditional action to the parent RuleBuilder.
   */
  build(): RuleBuilder {
    const conditionalAction: Action = {
      if: this.condition
    };

    if (this.thenActions) {
      conditionalAction.then = this.thenActions;
    }

    if (this.elseActions) {
      conditionalAction.else = this.elseActions;
    }

    // Append to existing actions instead of replacing
    const currentDo = this.parent['rule'].do;
    if (!currentDo) {
      this.parent['rule'].do = conditionalAction;
    } else if (Array.isArray(currentDo)) {
      currentDo.push(conditionalAction);
    } else {
      this.parent['rule'].do = [currentDo, conditionalAction];
    }
    return this.parent;
  }
}

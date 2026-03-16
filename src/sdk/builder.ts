// Re-export from optimize module
export { optimizeCondition, optimizeAction, type OptimizeOptions } from './optimize';

// Re-export from builders module
export { ConditionBuilder, ActionBuilder, ParamsBuilder } from './builders';

// Re-export from graph-parser
export { 
  parseGraph, 
  type GraphParserOptions, 
  type GraphParserContext 
} from './graph-parser';

// RuleBuilder is the main class - kept here for convenience
import { parseGraph, type GraphParserContext, type GraphParserOptions } from './graph-parser';
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

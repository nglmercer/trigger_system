import { parseGraph, type GraphParserContext, type GraphParserOptions } from './graph-parser';
import type {
  TriggerRule,
  RuleCondition,
  Action,
  ActionGroup,
  ComparisonOperator,
  ExecutionMode,
  Condition,
  ConditionGroup,
  ConditionValue,
  ActionParams,
  SDKGraphNode,
  SDKGraphEdge
} from "../types";

// --- SDK UTILITIES FOR OPTIMIZATION ---

export interface OptimizeOptions {
  /**
   * Whether to deduplicate conditions/actions.
   * Default: true (backward compatible)
   * Set to false to keep all duplicates (useful for templates where repetition is intentional)
   */
  deduplicate?: boolean;
  /**
   * Unique identifier field to use for comparing items.
   * If provided, items with different IDs are considered different even if other fields match.
   * This allows intentional duplicates (same content, different IDs) to be preserved.
   */
  uniqueIdField?: string;
}

export function optimizeCondition(cond: RuleCondition | RuleCondition[], options: OptimizeOptions = {}): RuleCondition | RuleCondition[] | undefined {
  const { deduplicate = true, uniqueIdField } = options;
  
  if (!cond) return undefined;
   
  if (Array.isArray(cond)) {
    const opt = cond.map(c => optimizeCondition(c, options)).filter((c): c is RuleCondition => c !== undefined);
    
    if (!deduplicate) {
      return opt.length === 0 ? undefined : (opt.length === 1 ? opt[0] : opt);
    }
    
    const unique = uniqueIdField 
      ? deduplicateById(opt, uniqueIdField) as RuleCondition[]
      : Array.from(new Set(opt.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
    
    return unique.length === 0 ? undefined : (unique.length === 1 ? unique[0] : unique);
  }

  // It's a single condition
  if ('operator' in cond && 'conditions' in cond) {
    const group = cond as ConditionGroup;
    let optChildren = optimizeCondition(group.conditions, options);
    if (!optChildren) return undefined;
    if (!Array.isArray(optChildren)) optChildren = [optChildren];

    // Inline children that are groups with the SAME operator
    const inlined: RuleCondition[] = [];
    for (const child of optChildren) {
      if ('operator' in child && 'conditions' in child && (child as ConditionGroup).operator === group.operator) {
        inlined.push(...((child as ConditionGroup).conditions as RuleCondition[]));
      } else {
        inlined.push(child);
      }
    }

    // Deduplicate
    let uniqueChildren: RuleCondition[];
    if (!deduplicate) {
      uniqueChildren = inlined;
    } else if (uniqueIdField) {
      uniqueChildren = deduplicateById(inlined, uniqueIdField) as RuleCondition[];
    } else {
      uniqueChildren = Array.from(new Set(inlined.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
    }

    if (uniqueChildren.length === 0) return undefined;
    if (uniqueChildren.length === 1) return uniqueChildren[0];
    
    return { operator: group.operator, conditions: uniqueChildren };
  }

  return cond;
}

/**
 * Helper function to deduplicate items by a unique ID field.
 * Items without the ID field are compared by full content.
 */
function deduplicateById<T>(items: T[], idField: string): T[] {
  const withId = new Map<string, T>();
  const withoutId: T[] = [];
  
  for (const item of items) {
    const itemAny = item as Record<string, unknown>;
    const id = itemAny[idField];
    if (id !== undefined && id !== null) {
      const idStr = String(id);
      if (!withId.has(idStr)) {
        withId.set(idStr, item);
      }
    } else {
      withoutId.push(item);
    }
  }
  
  // For items without ID, deduplicate by full content
  const uniqueWithoutId = Array.from(new Set(withoutId.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
  
  return [...Array.from(withId.values()), ...uniqueWithoutId];
}

export function optimizeAction(act: Action | ActionGroup | (Action | ActionGroup)[], options: OptimizeOptions = {}): Action | ActionGroup | (Action | ActionGroup)[] | undefined {
  const { deduplicate = false, uniqueIdField } = options;
  
  if (!act) return undefined;

  if (Array.isArray(act)) {
    const opt = act.map(a => optimizeAction(a, options)).filter((a): a is Action | ActionGroup => a !== undefined);
    
    if (!deduplicate) {
      // When not deduplicating, just flatten and return
      const flattened = opt.flatMap(a => Array.isArray(a) ? a : [a]);
      
      // Inline ActionGroups with mode ALL since array is implicitly ALL
      const inlined: (Action | ActionGroup)[] = [];
      for (const child of flattened) {
         if ('mode' in child && 'actions' in child && (child as ActionGroup).mode === 'ALL') {
            inlined.push(...((child as ActionGroup).actions));
         } else {
            inlined.push(child);
         }
      }

      if (inlined.length === 0) return undefined;
      if (inlined.length === 1) return inlined[0];
      return inlined;
    }
    
    // Flatten array inside array first
    const flattened = opt.flatMap(a => Array.isArray(a) ? a : [a]);
    
    // Inline ActionGroups with mode ALL since array is implicitly ALL
    const inlined: (Action | ActionGroup)[] = [];
    for (const child of flattened) {
       if ('mode' in child && 'actions' in child && (child as ActionGroup).mode === 'ALL') {
          inlined.push(...((child as ActionGroup).actions));
       } else {
          inlined.push(child);
       }
    }

    if (inlined.length === 0) return undefined;
    if (inlined.length === 1) return inlined[0];
    
    // Deduplicate
    let uniqueActions: (Action | ActionGroup)[];
    if (uniqueIdField) {
      uniqueActions = deduplicateById(inlined, uniqueIdField) as (Action | ActionGroup)[];
    } else {
      uniqueActions = Array.from(new Set(inlined.map(a => JSON.stringify(a)))).map(s => JSON.parse(s));
    }
    
    return uniqueActions;
  }

  // It's a single item
  if ('mode' in act && 'actions' in act) {
    const group = act as ActionGroup;
    let optChildren = optimizeAction(group.actions, options);
    if (!optChildren) return undefined;
    if (!Array.isArray(optChildren)) optChildren = [optChildren];

    // Inline children that are ActionGroups with the SAME mode
    const inlined: (Action | ActionGroup)[] = [];
    for (const child of optChildren) {
      if ('mode' in child && 'actions' in child && (child as ActionGroup).mode === group.mode) {
        inlined.push(...((child as ActionGroup).actions));
      } else {
        inlined.push(child);
      }
    }

    if (inlined.length === 0) return undefined;
    if (inlined.length === 1) return inlined[0];

    // Deduplicate
    let uniqueChildren: (Action | ActionGroup)[];
    if (!deduplicate) {
      uniqueChildren = inlined;
    } else if (uniqueIdField) {
      uniqueChildren = deduplicateById(inlined, uniqueIdField) as (Action | ActionGroup)[];
    } else {
      uniqueChildren = Array.from(new Set(inlined.map(a => JSON.stringify(a)))).map(s => JSON.parse(s));
    }

    return { mode: group.mode, actions: uniqueChildren };
  }

  return act;
}

// ----------------------------------------

export class ConditionBuilder {
  private conditions: (Condition | ConditionGroup)[] = [];
  private op: 'AND' | 'OR' = 'AND';

  constructor(operator: 'AND' | 'OR' = 'AND') {
    this.op = operator;
  }

  where(field: string, operator: ComparisonOperator, value: ConditionValue): this {
    this.conditions.push({ field, operator, value });
    return this;
  }

  and(sub: (builder: ConditionBuilder) => ConditionBuilder): this {
    const builder = new ConditionBuilder('AND');
    this.conditions.push(sub(builder).build());
    return this;
  }

  or(sub: (builder: ConditionBuilder) => ConditionBuilder): this {
    const builder = new ConditionBuilder('OR');
    this.conditions.push(sub(builder).build());
    return this;
  }

  build(): RuleCondition {
    if (this.conditions.length === 0) {
      throw new Error("Condition group must have at least one condition");
    }
    if (this.conditions.length === 1 && this.op === 'AND') {
      return this.conditions[0] as RuleCondition;
    }
    const group: ConditionGroup = {
      operator: this.op,
      conditions: this.conditions
    };
    return group as RuleCondition;
  }
}

export class ActionBuilder {
  private actions: Action[] = [];
  private mode: ExecutionMode = 'ALL';

  setMode(mode: ExecutionMode): this {
    this.mode = mode;
    return this;
  }

  add(type: string, params?: ActionParams, options?: { delay?: number, probability?: number }): this {
    this.actions.push({
      type,
      params,
      ...options
    });
    return this;
  }

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

  // --- Better / Fluent Aliases ---
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

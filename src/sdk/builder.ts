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
  ActionParams
} from "../types";

// --- SDK UTILITIES FOR OPTIMIZATION ---

export function optimizeCondition(cond: RuleCondition | RuleCondition[]): RuleCondition | RuleCondition[] | undefined {
  if (!cond) return undefined;
  
  if (Array.isArray(cond)) {
    const opt = cond.map(c => optimizeCondition(c)).filter((c): c is RuleCondition => c !== undefined);
    const unique = Array.from(new Set(opt.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
    return unique.length === 0 ? undefined : (unique.length === 1 ? unique[0] : unique);
  }

  // It's a single condition
  if ('operator' in cond && 'conditions' in cond) {
    const group = cond as ConditionGroup;
    let optChildren = optimizeCondition(group.conditions);
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
    const uniqueChildren = Array.from(new Set(inlined.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));

    if (uniqueChildren.length === 0) return undefined;
    if (uniqueChildren.length === 1) return uniqueChildren[0];
    
    return { operator: group.operator, conditions: uniqueChildren };
  }

  return cond;
}

export function optimizeAction(act: Action | ActionGroup | (Action | ActionGroup)[]): Action | ActionGroup | (Action | ActionGroup)[] | undefined {
  if (!act) return undefined;

  if (Array.isArray(act)) {
    const opt = act.map(a => optimizeAction(a)).filter((a): a is Action | ActionGroup => a !== undefined);
    
    // Inline array inside array (flatten)
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

    const unique = Array.from(new Set(inlined.map(a => JSON.stringify(a)))).map(s => JSON.parse(s));
    return unique.length === 0 ? undefined : (unique.length === 1 ? unique[0] : unique);
  }

  // It's a single item
  if ('mode' in act && 'actions' in act) {
    const group = act as ActionGroup;
    let optChildren = optimizeAction(group.actions);
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

    const uniqueChildren = Array.from(new Set(inlined.map(a => JSON.stringify(a)))).map(s => JSON.parse(s));

    if (uniqueChildren.length === 0) return undefined;
    if (uniqueChildren.length === 1) return uniqueChildren[0];

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

  // --- Better / Fluent Aliases ---
  id(id: string) { return this.withId(id); }
  name(name: string) { return this.withName(name); }
  description(desc: string) { return this.withDescription(desc); }
  priority(p: number) { return this.withPriority(p); }
  enabled(e: boolean) { return this.withEnabled(e); }
  cooldown(c: number) { return this.withCooldown(c); }
  tags(t: string[]) { return this.withTags(t); }

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
      this.rule.if = optimizeCondition(this.rule.if as RuleCondition | RuleCondition[]);
    }
    
    if (this.rule.do) {
      const opt = optimizeAction(this.rule.do as Action | ActionGroup | (Action | ActionGroup)[]);
      this.rule.do = opt ? opt : this.rule.do;
    }

    return this.rule as TriggerRule;
  }
}

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

  on(event: string): this {
    this.rule.on = event;
    return this;
  }

  if(field: string, operator: ComparisonOperator, value: ConditionValue): this {
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


  build(): TriggerRule {
    if (!this.rule.id) throw new Error("Rule ID is required");
    if (!this.rule.on) throw new Error("Rule 'on' event is required");
    if (!this.rule.do) throw new Error("Rule 'do' action is required");

    return this.rule as TriggerRule;
  }
}

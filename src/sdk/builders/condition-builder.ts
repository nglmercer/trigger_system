import type { ComparisonOperator, ConditionValue, Condition, ConditionGroup, RuleCondition } from "../../types";

/**
 * Builder for creating conditions fluently.
 */
export class ConditionBuilder {
  private conditions: (Condition | ConditionGroup)[] = [];
  private op: 'AND' | 'OR' = 'AND';

  constructor(operator: 'AND' | 'OR' = 'AND') {
    this.op = operator;
  }

  /**
   * Add a simple condition.
   */
  where(field: string, operator: ComparisonOperator, value: ConditionValue): this {
    this.conditions.push({ field, operator, value });
    return this;
  }

  /**
   * Add a nested AND group.
   */
  and(sub: (builder: ConditionBuilder) => ConditionBuilder): this {
    const builder = new ConditionBuilder('AND');
    this.conditions.push(sub(builder).build());
    return this;
  }

  /**
   * Add a nested OR group.
   */
  or(sub: (builder: ConditionBuilder) => ConditionBuilder): this {
    const builder = new ConditionBuilder('OR');
    this.conditions.push(sub(builder).build());
    return this;
  }

  /**
   * Build the condition or condition group.
   */
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

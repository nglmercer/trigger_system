// src/trigger_system/utils.ts
import type { TriggerContext, ConditionValue, ComparisonOperator } from "../types";

export class TriggerUtils {
  /**
   * Retrieves a nested value from the context using dot notation.
   * supports: data.field, vars.envVal, computed.result
   */
  static getNestedValue(path: string, context: TriggerContext): unknown {
    const parts = path.split(".");
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object' && current !== null && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Interpolates a string with values from the context.
   * Example: "Hello ${data.username}" -> "Hello Steve"
   */
  static interpolate(template: string, context: TriggerContext): string {
    if (typeof template !== 'string') return template;
    
    return template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      // 1. Try direct path access first (fast)
      const directValue = this.getNestedValue(expression, context);
      if (directValue !== undefined) {
        return String(directValue);
      }
      
      // 2. Fallback to simple math evaluation if needed (optional, keeps it safe)
      // For now, we return the match if not found to avoid crashing or weird replacements
      return match;
    });
  }
  
  /**
   * Checks if a value satisfies a comparison operator against a criteria.
   */
  static compare(actual: unknown, operator: ComparisonOperator, criteria: ConditionValue | undefined): boolean {
    switch (operator) {
      case 'EQ':
      case '==':
        return actual == criteria;
      case 'NEQ':
      case '!=':
        return actual != criteria;
      case 'GT':
      case '>':
        return Number(actual) > Number(criteria);
      case 'GTE':
      case '>=':
        return Number(actual) >= Number(criteria);
      case 'LT':
      case '<':
        return Number(actual) < Number(criteria);
      case 'LTE':
      case '<=':
        return Number(actual) <= Number(criteria);
      case 'IN':
        return Array.isArray(criteria) && criteria.some(item => item === actual);
      case 'NOT_IN':
        return Array.isArray(criteria) && !criteria.some(item => item === actual);
      case 'CONTAINS':
        if (Array.isArray(actual) || typeof actual === 'string') {
          return actual.includes(criteria as string);
        }
        return false;
      case 'NOT_CONTAINS':
        if (Array.isArray(actual) || typeof actual === 'string') {
          return !actual.includes(criteria as string);
        }
        return false;
      case 'STARTS_WITH':
        if (typeof actual === 'string' && typeof criteria === 'string') {
          return actual.startsWith(criteria);
        }
        return false;
      case 'ENDS_WITH':
        if (typeof actual === 'string' && typeof criteria === 'string') {
          return actual.endsWith(criteria);
        }
        return false;
      case 'IS_EMPTY':
        if (typeof actual === 'string') return actual === '';
        if (Array.isArray(actual)) return actual.length === 0;
        if (actual === null || actual === undefined) return true;
        if (typeof actual === 'object') return Object.keys(actual).length === 0;
        return false;
      case 'IS_NULL':
      case 'IS_NONE':
        return actual === null || actual === undefined;
      case 'HAS_KEY':
        if (typeof actual === 'object' && actual !== null && typeof criteria === 'string') {
          return criteria in (actual as Record<string, unknown>);
        }
        return false;
      case 'MATCHES':
        if (typeof criteria === 'string') {
          return new RegExp(criteria).test(String(actual));
        }
        return false;
      case 'RANGE':
        // criteria should be [min, max]
        if (Array.isArray(criteria) && criteria.length === 2) {
            const val = Number(actual);
            const min = Number(criteria[0]);
            const max = Number(criteria[1]);
            return !isNaN(val) && !isNaN(min) && !isNaN(max) && val >= min && val <= max;
        }
        return false;
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }
}

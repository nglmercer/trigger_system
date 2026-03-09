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
    // Helper for Date comparisons
    const getDate = (val: unknown) => {
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const d = new Date(val);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        }
        return 0;
    };

    // Helper for Safe Numeric comparisons
    const getSafeNumber = (val: unknown): number | null => {
        if (typeof val === 'number') return val;
        if (val === null || val === undefined || val === '') return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
    };

    switch (operator) {
      case 'EQ':
      case '==':
        return actual == criteria;
      case 'NEQ':
      case '!=':
        return actual != criteria;
      case 'GT':
      case '>': {
        const nActual = getSafeNumber(actual);
        const nCriteria = getSafeNumber(criteria);
        return (nActual !== null && nCriteria !== null) && nActual > nCriteria;
      }
      case 'GTE':
      case '>=': {
        const nActual = getSafeNumber(actual);
        const nCriteria = getSafeNumber(criteria);
        return (nActual !== null && nCriteria !== null) && nActual >= nCriteria;
      }
      case 'LT':
      case '<': {
        const nActual = getSafeNumber(actual);
        const nCriteria = getSafeNumber(criteria);
        return (nActual !== null && nCriteria !== null) && nActual < nCriteria;
      }
      case 'LTE':
      case '<=': {
        const nActual = getSafeNumber(actual);
        const nCriteria = getSafeNumber(criteria);
        return (nActual !== null && nCriteria !== null) && nActual <= nCriteria;
      }
      case 'IN':
        return Array.isArray(criteria) && criteria.some(item => item === actual);
      case 'NOT_IN':
        return Array.isArray(criteria) && !criteria.some(item => item === actual);
      case 'CONTAINS':
        if (Array.isArray(criteria)) {
           return criteria.some(item => String(actual).includes(String(item)));
        }
        if (Array.isArray(actual) || typeof actual === 'string') {
          return (actual as any).includes(criteria as any);
        }
        return false;
      case 'NOT_CONTAINS':
        if (Array.isArray(criteria)) {
           return !criteria.some(item => String(actual).includes(String(item)));
        }
        if (Array.isArray(actual) || typeof actual === 'string') {
          return !(actual as any).includes(criteria as any);
        }
        return false;
      case 'STARTS_WITH':
        if (Array.isArray(criteria)) {
           return criteria.some(item => String(actual).startsWith(String(item)));
        }
        if (typeof actual === 'string' && typeof criteria === 'string') {
          return actual.startsWith(criteria);
        }
        return false;
      case 'ENDS_WITH':
        if (Array.isArray(criteria)) {
           return criteria.some(item => String(actual).endsWith(String(item)));
        }
        if (typeof actual === 'string' && typeof criteria === 'string') {
          return actual.endsWith(criteria);
        }
        return false;
      case 'IS_EMPTY': {
        let isEmpty = false;
        if (typeof actual === 'string') isEmpty = actual === '';
        else if (Array.isArray(actual)) isEmpty = actual.length === 0;
        else if (actual === null || actual === undefined) isEmpty = true;
        else if (typeof actual === 'object') isEmpty = Object.keys(actual as object).length === 0;
        
        return criteria === false ? !isEmpty : isEmpty;
      }
      case 'IS_NULL':
      case 'IS_NONE': {
        const isNull = actual === null || actual === undefined;
        return criteria === false ? !isNull : isNull;
      }
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
            const val = getSafeNumber(actual);
            const min = getSafeNumber(criteria[0]);
            const max = getSafeNumber(criteria[1]);
            return val !== null && min !== null && max !== null && val >= min && val <= max;
        }
        return false;
      
      // Date operators
      case "SINCE":
      case "AFTER":
         return getDate(actual) >= getDate(criteria);
      
      case "BEFORE":
      case "UNTIL":
         return getDate(actual) < getDate(criteria);

      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }
}

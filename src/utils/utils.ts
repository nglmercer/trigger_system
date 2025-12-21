// src/trigger_system/utils.ts
import type { TriggerContext } from "../types";

export class TriggerUtils {
  /**
   * Retrieves a nested value from the context using dot notation.
   * supports: data.field, globals.envVal, computed.result
   */
  static getNestedValue(path: string, context: TriggerContext): any {
    const parts = path.split(".");
    let current: any = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
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
  static compare(actual: any, operator: string, criteria: any): boolean {
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
        return Array.isArray(criteria) && criteria.includes(actual);
      case 'NOT_IN':
        return Array.isArray(criteria) && !criteria.includes(actual);
      case 'CONTAINS':
        if (Array.isArray(actual) || typeof actual === 'string') {
          return actual.includes(criteria);
        }
        return false;
      case 'MATCHES':
        return new RegExp(criteria).test(String(actual));
      case 'RANGE':
        // criteria should be [min, max]
        if (Array.isArray(criteria) && criteria.length === 2) {
            const val = Number(actual);
            return val >= criteria[0] && val <= criteria[1];
        }
        return false;
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }
}

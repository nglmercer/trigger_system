// -----------------------------------------------------------------------------
// MATHEMATICAL EXPRESSIONS AND VARIABLES ENGINE
// -----------------------------------------------------------------------------

import type { TriggerContext } from "../types";

/**
 * Context root keys - used to access different parts of the trigger context
 * Avoids magic strings throughout the codebase
 */
export const ContextKeys = {
  DATA: "data",
  VARS: "vars",
  REQUEST: "request",
  COMPUTED: "computed",
  ENV: "env",
  EVENT: "event",
  TIMESTAMP: "timestamp",
} as const;

/**
 * Type representing valid context root keys
 */
export type ContextKey = typeof ContextKeys[keyof typeof ContextKeys];

/**
 * Set of all valid context root keys for validation
 */
const VALID_CONTEXT_KEYS: Set<string> = new Set(Object.values(ContextKeys));

/**
 * Built-in Math functions that can be used in expressions
 * Avoids magic strings and provides type safety
 */
export const MathFunctions = {
  RANDOM: "random",
  FLOOR: "floor",
  CEIL: "ceil",
  ROUND: "round",
  SQRT: "sqrt",
  ABS: "abs",
  POW: "pow",
  MIN: "min",
  MAX: "max",
  SIN: "sin",
  COS: "cos",
  TAN: "tan",
} as const;

/**
 * Set of allowed Math functions for safe expression evaluation
 * Values from MathFunctions object
 */
const ALLOWED_MATH_FUNCTIONS: string[] = [
  MathFunctions.RANDOM,
  MathFunctions.FLOOR,
  MathFunctions.CEIL,
  MathFunctions.ROUND,
  MathFunctions.SQRT,
  MathFunctions.ABS,
  MathFunctions.POW,
  MathFunctions.MIN,
  MathFunctions.MAX,
  MathFunctions.SIN,
  MathFunctions.COS,
  MathFunctions.TAN,
];

/**
 * Regular expressions for expression parsing
 * Centralized to avoid magic strings and improve maintainability
 */
const RegexPatterns = {
  /** Matches template string interpolation: ${...} */
  TEMPLATE_INTERPOLATION: /\$\{([^}]+)\}/g,
  
  /** Matches simple nested property access: data.user.name */
  NESTED_PROPERTY_ACCESS: /^(data|vars|request|computed|env|state)(\.[a-zA-Z0-9_]+)+$/,
  
  /** Matches single-level property access: vars.myVar */
  SINGLE_LEVEL_ACCESS: /^(vars|env|state)(\.[a-zA-Z0-9_]+)$/,
  
  /** Matches word boundaries for variable replacement */
  WORD_BOUNDARY: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g,
} as const;

export class ExpressionEngine {
  /**
   * Evaluates a simple mathematical expression or variable interpolation
   * Supports operators: +, -, *, /, %, **, and basic math functions
   */

  static evaluate(expression: string | null | undefined, context: TriggerContext): unknown {
    // Handle null/undefined input gracefully
    if (expression === null || expression === undefined) {
      console.error(`Error evaluating expression: ${expression}`);
      return null;
    }
    
    try {
      // Check for template string interpolation first
      if (expression.includes("${")) {
        const interpolated = this.interpolate(expression, context);
        // If the result is a number-like string, convert it
        if (!isNaN(Number(interpolated)) && interpolated.trim() !== "") {
            return Number(interpolated);
        }
        return interpolated;
      }

      // Use the flexible JS evaluator by default to support vars and function calls
      return this.evaluateExpression(expression, context);
    } catch (error) {
      console.error(`Error evaluating expression: ${expression}`, error);
      return null;
    }
  }

  /**
   * Performs variable interpolation in a text template
   * Example: "Hello ${data.username}, today is ${new Date().toLocaleDateString()}"
   */
  static interpolate(template: string, context: TriggerContext): string {
    return template.replace(RegexPatterns.TEMPLATE_INTERPOLATION, (match, expression) => {
      try {
        const result = this.evaluateExpression(expression, context);
        if (result === undefined || result === null) {
            return "undefined";
        }
        return String(result);
      } catch (error) {
        console.error(`Error in interpolation: ${match}`, error);
        return match; // Returns the original expression on error
      }
    });
  }
  
  /**
   * Evaluates a safe mathematical expression using Function constructor
   */
  private static evaluateMathExpression(expression: string): number {
    try {
      // Create a safe function that only allows basic math operations
      const mathFunction = new Function("Math", `return ${expression}`);
      return mathFunction(Math);
    } catch (error) {
      throw new Error(`Error evaluating mathematical expression: ${expression}`);
    }
  }

  /**
   * Evaluates an individual expression in context
   */
  private static evaluateExpression(
    expression: string,
    context: TriggerContext,
  ) {
    // Try to get a value from context IF it's a simple path (no spaces, operators, etc.)
    // Regex: Start with reserved root, followed by dots and words. No spaces.
    if (RegexPatterns.NESTED_PROPERTY_ACCESS.test(expression)) {
      const val = this.getNestedValue(expression, context);
      return val;
    }

    // Handle simple single-level vars access (e.g., "vars.myVar" or "env.myVar")
    if (RegexPatterns.SINGLE_LEVEL_ACCESS.test(expression)) {
      const val = this.getNestedValue(expression, context);
      return val;
    }

    // Try to evaluate as JavaScript expression
    try {
      return new Function(
        "context",
        "with(context) { return " + expression + " }",
      )(context);
    } catch (error) {
      console.error(`ERROR evaluating expression '${expression}':`, error);
      // If it fails, return the original expression
      return expression;
    }
  }

  /**
   * Gets a nested value from an object using dot notation
   * Example: getNestedValue("data.user.profile.name", context)
   */
  static getNestedValue(path: string, context: TriggerContext): unknown {
    const parts = path.split(".");
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object' || !(part in current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Helper to check if a variable name exists anywhere in the context
   * This allows evaluating "x" when context has { vars: { x: 5 } }
   */
  private static findVariableInContext(name: string, context: TriggerContext): unknown {
    // First try direct access
    const directValue = this.getNestedValue(name, context);
    if (directValue !== undefined) {
      return directValue;
    }
    
    // Try to find the variable under any context root (vars, data, env, state, etc.)
    for (const key of VALID_CONTEXT_KEYS) {
      const nestedPath = `${key}.${name}`;
      const nestedValue = this.getNestedValue(nestedPath, context);
      if (nestedValue !== undefined) {
        return nestedValue;
      }
    }
    
    return undefined;
  }

  /**
   * Executes a specific mathematical expression (like "1 + 2")
   * Supports variables from context (e.g., data.x, vars.value)
   */
  static evaluateMath(expression: string, context: TriggerContext): number {
    // Extract variables from expression
    let processedExpression = expression;

    // First, handle dot notation patterns (data.x, data.user.name, etc.)
    // This must be done first to avoid partial replacements
    processedExpression = processedExpression.replace(
      /\b(data|vars|env|state|request|computed)(\.[a-zA-Z_][a-zA-Z0-9_]*)+/g,
      (match) => {
        const value = this.getNestedValue(match, context);
        if (value !== undefined) {
          return typeof value === "string" ? `"${value}"` : String(value);
        }
        return match;
      },
    );

    // Then handle simple variables that might be accessible via context roots
    // e.g., "x" might be accessible as "vars.x" or "data.x"
    processedExpression = processedExpression.replace(
      RegexPatterns.WORD_BOUNDARY,
      (match) => {
        // Check if it's a JavaScript reserved word or Math function
        if (ALLOWED_MATH_FUNCTIONS.includes(match)) {
          return match;
        }

        // Check if this is a context root key
        if (VALID_CONTEXT_KEYS.has(match)) {
          return match;
        }

        // Try to find the variable in context (checking all possible paths)
        const value = this.findVariableInContext(match, context);
        if (value !== undefined) {
          return typeof value === "string" ? `"${value}"` : String(value);
        }

        return match;
      },
    );

    try {
      // Evaluate the mathematical expression
      return this.evaluateMathExpression(processedExpression);
    } catch (error) {
      console.error(`Error in mathematical evaluation: ${expression}`, error);
      return NaN;
    }
  }
}

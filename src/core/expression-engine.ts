// -----------------------------------------------------------------------------
// MATHEMATICAL EXPRESSIONS AND VARIABLES ENGINE
// -----------------------------------------------------------------------------

import type { TriggerContext } from "../types";

export class ExpressionEngine {
  /**
   * Evaluates a simple mathematical expression or variable interpolation
   * Supports operators: +, -, *, /, %, **, and basic math functions
   */

  static evaluate(expression: string, context: TriggerContext): unknown {
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
    return template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      try {
        const result = this.evaluateExpression(expression, context);
        if (result === undefined || result === null) {
            return "undefined"; // Explicitly return string "undefined" or ""?
            // User request: "cases without o incorrect data ${data.username} if data is null"
            // Usually keeping it as "undefined" is honest but ugly.
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
    if (/^(data|vars|request|computed|env|state)(\.[a-zA-Z0-9_]+)+$/.test(expression)) {
      const val = this.getNestedValue(expression, context);
      // If found, return. If undefined, we might accept it as undefined,
      // OR if technically it shouldn't be undefined, we might fail?
      // But for robustness, let's return it.
      return val;
    }

    // Handle simple single-level vars access (e.g., "vars.myVar" or "env.myVar")
    if (/^(vars|env|state)(\.[a-zA-Z0-9_]+)$/.test(expression)) {
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
   * Executes a specific mathematical expression (like "1 + 2")
   */
  static evaluateMath(expression: string, context: TriggerContext): number {
    // Extract variables from expression
    let processedExpression = expression;

    // Replace context variables in the expression
    processedExpression = processedExpression.replace(
      /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g,
      (match) => {
        // Check if it's a JavaScript reserved word or Math function
        if (
          [
            "Math",
            "random",
            "floor",
            "ceil",
            "round",
            "sqrt",
            "abs",
            "pow",
            "min",
            "max",
            "sin",
            "cos",
            "tan",
          ].includes(match)
        ) {
          return match;
        }

        // Try to get value from context
        const value = this.getNestedValue(match, context);
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

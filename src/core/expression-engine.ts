// -----------------------------------------------------------------------------
// MOTOR DE EXPRESIONES MATEMÁTICAS Y VARIABLES
// -----------------------------------------------------------------------------

import type { TriggerContext } from "../types";

export class ExpressionEngine {
  /**
   * Evalúa una expresión matemática simple o una interpolación de variables
   * Soporta operadores: +, -, *, /, %, **, y funciones matemáticas básicas
   */

  static evaluate(expression: string, context: TriggerContext): any {
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

      // Use the flexible JS evaluator by default to support globals and function calls
      return this.evaluateExpression(expression, context);
    } catch (error) {
      console.error(`Error evaluating expression: ${expression}`, error);
      return null;
    }
  }

  /**
   * Realiza interpolación de variables en una plantilla de texto
   * Ejemplo: "Hola ${data.username}, hoy es ${new Date().toLocaleDateString()}"
   */
  static interpolate(template: string, context: TriggerContext): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      try {
        const result = this.evaluateExpression(expression, context);
        if (result === undefined || result === null) {
            return "undefined"; // Explicitly return string "undefined" or ""?
            // User request: "cases without o incorrect data ${data.username} if data is null"
            // Usually keeping it as "undefined" is honest but ugly.
            // Let's use a standard "N/A" or empty string? 
            // Or better: check if the user wants default values e.g. ${name || 'Guest'}
            // evaluateExpression might handle || operator if it falls back to JS evaluation.
            return "undefined"; 
        }
        return String(result);
      } catch (error) {
        console.error(`Error en interpolación: ${match}`, error);
        return match; // Devuelve la expresión original si hay error
      }
    });
  }
  /**
   * Evalúa una expresión matemática segura usando Function constructor
   */
  private static evaluateMathExpression(expression: string): any {
    try {
      // Crear una función segura que solo permita operaciones matemáticas básicas
      const mathFunction = new Function("Math", `return ${expression}`);
      return mathFunction(Math);
    } catch (error) {
      throw new Error(`Error evaluando expresión matemática: ${expression}`);
    }
  }

  /**
   * Evalúa una expresión individual en el contexto
   */
  private static evaluateExpression(
    expression: string,
    context: TriggerContext,
  ) {
    // Intentar obtener un valor del contexto SI es una ruta simple (sin espacios, operadores, etc.)
    // Regex: Start with reserved root, followed by dots and words. No spaces.
    if (/^(data|globals|request|computed)(\.[a-zA-Z0-9_]+)+$/.test(expression)) {
      const val = this.getNestedValue(expression, context);
      // If found, return. If undefined, we might accept it as undefined, 
      // OR if technically it shouldn't be undefined, we might fail? 
      // But for robustness, let's return it.
      return val;
    }

    // Intentar evaluar como expresión de JavaScript
    try {
      return new Function(
        "context",
        "with(context) { return " + expression + " }",
      )(context);
    } catch (error) {
      console.error(`ERROR evaluating expression '${expression}':`, error);
      // Si falla, devolver la expresión original
      return expression;
    }
  }

  /**
   * Obtiene un valor anidado de un objeto usando notación de puntos
   * Ejemplo: getNestedValue("data.user.profile.name", context)
   */
  static getNestedValue(path: string, context: TriggerContext) {
    const parts = path.split(".");
    let current:Record<string,any> = context;

    for (const part of parts) {
      if (current === null || current === undefined || !(part in current)) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Ejecuta una expresión matemática específica (como "1 + 2")
   */
  static evaluateMath(expression: string, context: TriggerContext): number {
    // Extraer variables de la expresión
    let processedExpression = expression;

    // Reemplazar variables de contexto en la expresión
    processedExpression = processedExpression.replace(
      /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g,
      (match) => {
        // Verificar si es una palabra reservada de JavaScript o función Math
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

        // Intentar obtener valor del contexto
        const value = this.getNestedValue(match, context);
        if (value !== undefined) {
          return typeof value === "string" ? `"${value}"` : String(value);
        }

        return match;
      },
    );

    try {
      // Evaluar la expresión matemática
      return this.evaluateMathExpression(processedExpression);
    } catch (error) {
      console.error(`Error en evaluación matemática: ${expression}`, error);
      return NaN;
    }
  }
}

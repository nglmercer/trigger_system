import { type as arkType, type Type } from "arktype";
import type { TriggerAction, TriggerContext,Action } from "../types";
import { ExpressionEngine } from "./expression-engine";
export type ActionHandler = (action: TriggerAction, context: TriggerContext) => Promise<any> | any;

/**
 * Built-in action types to avoid magic strings
 */
export const BuiltInAction = {
  LOG: "LOG",
  MATH: "MATH",
  FORWARD: "FORWARD",
  FETCH: "FETCH",
  EMIT_EVENT: "EMIT_EVENT",
} as const;

export interface ActionDefinition {
  handler: ActionHandler;
  description?: string;
  params?: Type; 
  returns?: Type;
}
const fetchFunction = async (action: Action, context: TriggerContext) => {
    const urlTemplate = action.params?.url || "";
    let url = typeof urlTemplate === 'string' ? ExpressionEngine.interpolate(urlTemplate, context) : String(urlTemplate);
    const method = String(action.params?.method || "POST").toUpperCase();

    if (action.params?.query && typeof action.params.query === 'object') {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(action.params.query)) {
            if (value !== undefined && value !== null) {
                const strValue = typeof value === 'string' ? ExpressionEngine.interpolate(value, context) : (typeof value === 'object' ? JSON.stringify(value) : String(value));
                queryParams.append(key, strValue);
            }
        }
        const queryString = queryParams.toString();
        if (queryString) {
            url += (url.includes('?') ? '&' : '?') + queryString;
        }
    }

    const methodsWithBody = ['POST', 'PUT', 'PATCH'];
    const hasBody = methodsWithBody.includes(method);

    const { bodyContent, defaultContentType } = (() => {
        if (!hasBody || action.params?.body == null) {
            return {
                bodyContent: hasBody ? JSON.stringify(context.data) : undefined,
                defaultContentType: "application/json",
            };
        }

        const raw = action.params.body;

        if (typeof raw === 'string') {
            const interpolated = ExpressionEngine.interpolate(raw, context);
            // If the interpolated string looks like JSON, treat it as such
            const looksLikeJson = interpolated.trimStart().startsWith('{') || interpolated.trimStart().startsWith('[');
            return {
                bodyContent: interpolated,
                defaultContentType: looksLikeJson ? "application/json" : "text/plain",
            };
        }

        // Object — serialize to JSON
        return {
            bodyContent: JSON.stringify(raw),
            defaultContentType: "application/json",
        };
    })();

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": defaultContentType,
                ...(typeof action.params?.headers === 'object' && action.params.headers !== null && !Array.isArray(action.params.headers) ? action.params.headers : {}),
            },
            ...(hasBody && bodyContent !== undefined ? { body: bodyContent } : {}),
        });
        return {
            url,
            method,
            status: response.status,
            headers: (() => {
                const h: Record<string, string> = {};
                response.headers.forEach((v, k) => h[k] = v);
                return h;
            })(),
            body: await response.text(),
        };
    } catch (error) {
        return { url, method, error: String(error) };
    }
}
const fetchDefinition = {
    description: "Forwards the current event data to a remote URL via HTTP",
    params: arkType({
        url: "string",
        "method?": "'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'",
        "query?": "Record<string, unknown>",
        "headers?": "Record<string, string>",
        "body?": "string | Record<string, unknown>",
    }),
    returns: arkType({
        url: "string",
        method: "string",
        status: "number",
        headers: "Record<string, string>",
        body: "string"
    }).or(arkType({ url: "string", method: "string", error: "string" })),
    handler: fetchFunction
}
export class ActionRegistry {
  private static instance: ActionRegistry;
  private actions = new Map<string, ActionDefinition>();

  private constructor(autoRegisterDefaults: boolean = true) {
    if (autoRegisterDefaults) {
      this.registerDefaults();
    }
  }

  static getInstance(autoRegisterDefaults: boolean = true): ActionRegistry {
    if (!this.instance) {
      this.instance = new ActionRegistry(autoRegisterDefaults);
    }
    return this.instance;
  }

  register(type: string, handlerOrDef: ActionHandler | ActionDefinition) {
    const name = type.toUpperCase();
    if (typeof handlerOrDef === 'function') {
      this.actions.set(name, { handler: handlerOrDef });
    } else {
      this.actions.set(name, handlerOrDef);
    }
  }

  get(type: string): ActionHandler | undefined {
    return this.actions.get(type.toUpperCase())?.handler;
  }

  getDefinition(type: string): ActionDefinition | undefined {
    return this.actions.get(type.toUpperCase());
  }

  getDefinitions(): Record<string, ActionDefinition> {
    const defs: Record<string, ActionDefinition> = {};
    this.actions.forEach((val, key) => {
      defs[key] = val;
    });
    return defs;
  }

  get Handlers(): Map<string, ActionHandler> {
    const handlers = new Map<string, ActionHandler>();
    this.actions.forEach((val, key) => {
      handlers.set(key, val.handler);
    });
    return handlers;
  }

  private registerDefaults() {
    // Log Action
    this.register(BuiltInAction.LOG, {
        description: "Logs a message to the console with string interpolation support",
        params: arkType({ "message?": "string", "content?": "string" }),
        returns: arkType({ message: "string" }),
        handler: (action, context) => {
            const messageTemplate = action.params?.message || action.params?.content || "Log Trigger";
            const message = typeof messageTemplate === 'string' ? ExpressionEngine.interpolate(messageTemplate, context) : String(messageTemplate);
            console.log(`[TriggerLog] ${message}`);
            return { message };
        }
    });

    // Math Action
    this.register(BuiltInAction.MATH, {
        description: "Evaluates a mathematical expression or performs string concatenation",
        params: arkType({ expression: "string" }),
        returns: arkType("number | string"),
        handler: (action, context) => {
            const expression = String(action.params?.expression || "0");
            return ExpressionEngine.evaluate(expression, context);
        }
    });
    // Forward Action
    this.register(BuiltInAction.FORWARD, fetchDefinition);
    this.register(BuiltInAction.FETCH, fetchDefinition);
  }
}

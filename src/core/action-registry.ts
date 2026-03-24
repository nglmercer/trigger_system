import { type as arkType, type Type } from "arktype";
import type { TriggerAction, TriggerContext } from "../types";
import { ExpressionEngine } from "./expression-engine";

export type ActionHandler = (action: TriggerAction, context: TriggerContext) => Promise<any> | any;

/**
 * Built-in action types to avoid magic strings
 */
export const BuiltInAction = {
  LOG: "LOG",
  MATH: "MATH",
  RESPONSE: "RESPONSE",
  EXECUTE: "EXECUTE",
  FORWARD: "FORWARD",
  STATE_SET: "STATE_SET",
  STATE_INCREMENT: "STATE_INCREMENT",
  STATE_GET: "STATE_GET",
  STATE_DELETE: "STATE_DELETE",
  EMIT_EVENT: "EMIT_EVENT",
  NOTIFY: "NOTIFY",
  STATE_OP: "STATE_OP",
} as const;

export interface ActionDefinition {
  handler: ActionHandler;
  description?: string;
  params?: Type; 
  returns?: Type;
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

    // Response Action
    this.register(BuiltInAction.RESPONSE, {
        description: "Constructs a standardized response object (useful for webhooks/APIs)",
        params: arkType({ 
            "content?": "string", 
            "body?": "string", 
            "statusCode?": "number", 
            "headers?": "Record<string, string>" 
        }),
        returns: arkType({
            statusCode: "number",
            headers: "Record<string, string>",
            body: "string"
        }),
        handler: (action, context) => {
            const contentTemplate = action.params?.content || action.params?.body || "";
            const content = typeof contentTemplate === 'string' ? ExpressionEngine.interpolate(contentTemplate, context) : String(contentTemplate);
            return {
                statusCode: action.params?.statusCode || 200,
                headers: action.params?.headers || { "Content-Type": "application/json" },
                body: content,
            };
        }
    });

    // Execute Action
    this.register(BuiltInAction.EXECUTE, {
        description: "Spawns a shell command and returns the output (Bun only)",
        params: arkType({ 
            "command?": "string", 
            "content?": "string", 
            "safe?": "boolean" 
        }),
        returns: arkType({
            command: "string",
            stdout: "string",
            stderr: "string",
            exitCode: "number"
        }).or(arkType({ command: "string", error: "string" })),
        handler: async (action, context) => {
            const commandTemplate = action.params?.command || action.params?.content || "";
            const command = typeof commandTemplate === 'string' ? ExpressionEngine.interpolate(commandTemplate, context) : String(commandTemplate);

            if (!action.params?.safe) {
                console.warn(`[Trigger] Executing unsafe command: ${command}`);
            }

            try {
                if (typeof Bun === 'undefined') {
                    return { command, error: "Bun is required for 'execute' action" };
                }
                const proc = Bun.spawn(command.split(" "), {
                    stdout: "pipe",
                    stderr: "pipe",
                });
                const [stdout, stderr] = await Promise.all([
                    new Response(proc.stdout).text(),
                    new Response(proc.stderr).text(),
                ]);
                return {
                    command,
                    stdout,
                    stderr,
                    exitCode: await proc.exited,
                };
            } catch (error) {
                return { command, error: String(error) };
            }
        }
    });

    // Forward Action
    this.register(BuiltInAction.FORWARD, {
        description: "Forwards the current event data to a remote URL via HTTP",
        params: arkType({
            url: "string",
            "method?": "'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'",
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
        handler: async (action, context) => {
            const urlTemplate = action.params?.url || "";
            const url = typeof urlTemplate === 'string' ? ExpressionEngine.interpolate(urlTemplate, context) : String(urlTemplate);
            const method = String(action.params?.method || "POST").toUpperCase();

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
    });
  }
}

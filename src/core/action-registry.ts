import { type as arkType, type Type } from "arktype";
import type { TriggerAction, TriggerContext } from "../types";
import { ExpressionEngine } from "./expression-engine";
import { StateManager } from "./state-manager";

export type ActionHandler = (action: TriggerAction, context: TriggerContext) => Promise<any> | any;

export interface ActionDefinition {
  handler: ActionHandler;
  description?: string;
  params?: Type; 
  returns?: Type;
}

export class ActionRegistry {
  private static instance: ActionRegistry;
  private actions = new Map<string, ActionDefinition>();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): ActionRegistry {
    if (!this.instance) {
      this.instance = new ActionRegistry();
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
    this.register("log", {
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
    this.register("math", {
        description: "Evaluates a mathematical expression or performs string concatenation",
        params: arkType({ expression: "string" }),
        returns: arkType("number | string"),
        handler: (action, context) => {
            const expression = String(action.params?.expression || "0");
            return ExpressionEngine.evaluate(expression, context);
        }
    });

    // Response Action
    this.register("response", {
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
    this.register("execute", {
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
                console.warn(`[Trigger] Ejecutando comando no seguro: ${command}`);
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
    this.register("forward", {
        description: "Forwards the current event data to a remote URL via HTTP",
        params: arkType({
            url: "string",
            "method?": "'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'",
            "headers?": "Record<string, string>"
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

            // Only send body for methods that support it
            const methodsWithBody = ['POST', 'PUT', 'PATCH'];
            const hasBody = methodsWithBody.includes(method);

            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        ...(typeof action.params?.headers === 'object' && action.params.headers !== null && !Array.isArray(action.params.headers) ? action.params.headers : {}),
                    },
                    ...(hasBody ? { body: JSON.stringify(context.data) } : {}),
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


    // --- State Actions ---

    this.register("STATE_SET", {
        description: "Sets a value in the persistent state",
        params: arkType({ key: "string", value: "unknown" }),
        returns: arkType({ key: "string", value: "unknown" }),
        handler: async (action, context) => {
            const key = String(action.params?.key || "");
            const value = action.params?.value;
            if (!key) return { error: "Missing key for STATE_SET" };
            
            // Evaluate value if it's dynamic
            let finalValue = value;
            if (typeof value === 'string' && value.includes('${')) {
                finalValue = ExpressionEngine.interpolate(value, context);
            }

            await StateManager.getInstance().set(key, finalValue);
            return { key, value: finalValue };
        }
    });

    this.register("STATE_INCREMENT", {
        description: "Increments a numeric value in the persistent state",
        params: arkType({ key: "string", "amount?": "number" }),
        returns: arkType({ key: "string", newValue: "number" }),
        handler: async (action, context) => {
            const key = String(action.params?.key || "");
            const amount = Number(action.params?.amount) || 1;
            if (!key) return { error: "Missing key for STATE_INCREMENT" };

            const newValue = await StateManager.getInstance().increment(key, amount);
            return { key, newValue };
        }
    });

    this.register("STATE_GET", {
        description: "Reads a value from state and optionally stores it in context.env",
        params: arkType({ key: "string", "as?": "string" }),
        returns: arkType({ key: "string", value: "unknown", "storedAs?": "string" }),
        handler: async (action, context) => {
            const key = String(action.params?.key || "");
            const as = String(action.params?.as || key); // Store with this variable name
            if (!key) return { error: "Missing key for STATE_GET" };

            const value = await StateManager.getInstance().get(key);
            
            // Store in context.env for interpolation in subsequent actions
            if (!context.env) context.env = {};
            context.env[as] = value;
            
            return { key, value, storedAs: as };
        }
    });

    this.register("STATE_DELETE", {
        description: "Deletes a key from the persistent state",
        params: arkType({ key: "string" }),
        returns: arkType({ key: "string", deleted: "boolean" }),
        handler: async (action, context) => {
            const key = String(action.params?.key || "");
            if (!key) return { error: "Missing key for STATE_DELETE" };

            const deleted = await StateManager.getInstance().delete(key);
            return { key, deleted };
        }
    });

    this.register("EMIT_EVENT", {
        description: "Emits a new event back into the system",
        params: arkType({ event: "string", "data?": "object" }),
        returns: arkType({ event: "string", payload: "object" }),
        handler: (action, context) => {
            return { 
                event: String(action.params?.event || ""), 
                payload: action.params?.data || {} 
            };
        }
    });

    this.register("notify", {
        description: "Sends a notification to a specific target",
        params: arkType({ 
            "message?": "string", 
            "content?": "string", 
            "target?": "string" 
        }),
        returns: arkType({ target: "string", message: "string" }),
        handler: (action, context) => {
            const message = action.params?.message || action.params?.content || "Notification";
            const target = action.params?.target || "default";
            console.log(`[Notification] To: ${target}, Msg: ${message}`);
            return { target, message };
        }
    });

    this.register("STATE_OP", {
        description: "Executes a custom JavaScript block with access to context and state",
        params: arkType({ run: "string" }),
        returns: arkType("unknown"),
        handler: (action, context) => {
            if (action.params?.run) {
                return new Function(
                    "context", "state", "data", "vars", "env", "helpers",
                    `with(context) { ${action.params.run} }`
                )(context, context.state, context.data, context.vars, context.env, context.helpers);
            }
            return { warning: "Missing 'run' param for STATE_OP" };
        }
    });
  }
}

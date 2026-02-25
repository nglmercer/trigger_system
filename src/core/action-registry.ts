import type { TriggerAction, TriggerContext } from "../types";
import { ExpressionEngine } from "./expression-engine";
import { StateManager } from "./state-manager";

export type ActionHandler = (action: TriggerAction, context: TriggerContext) => Promise<any> | any;

export class ActionRegistry {
  private static instance: ActionRegistry;
  private handlers = new Map<string, ActionHandler>();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): ActionRegistry {
    if (!this.instance) {
      this.instance = new ActionRegistry();
    }
    return this.instance;
  }

  register(type: string, handler: ActionHandler) {
    this.handlers.set(type.toUpperCase(), handler);
  }

  get(type: string): ActionHandler | undefined {
    return this.handlers.get(type.toUpperCase());
  }


  private registerDefaults() {
    // Log Action
    this.register("log", (action, context) => {
        const messageTemplate = action.params?.message || action.params?.content || "Log Trigger";
        const message = typeof messageTemplate === 'string' ? ExpressionEngine.interpolate(messageTemplate, context) : String(messageTemplate);
        console.log(`[TriggerLog] ${message}`);
        return { message };
    });

    // Math Action (also supports string concatenation)
    this.register("math", (action, context) => {
        const expression = String(action.params?.expression || "0");
        return ExpressionEngine.evaluate(expression, context);
    });

    // Response Action
    this.register("response", (action, context) => {
        const contentTemplate = action.params?.content || action.params?.body || "";
        const content = typeof contentTemplate === 'string' ? ExpressionEngine.interpolate(contentTemplate, context) : String(contentTemplate);
        return {
            statusCode: action.params?.statusCode || 200,
            headers: action.params?.headers || { "Content-Type": "application/json" },
            body: content,
        };
    });

    // Execute Action
    this.register("execute", async (action, context) => {
        const commandTemplate = action.params?.command || action.params?.content || "";
        const command = typeof commandTemplate === 'string' ? ExpressionEngine.interpolate(commandTemplate, context) : String(commandTemplate);

        if (!action.params?.safe) {
            console.warn(`[Trigger] Ejecutando comando no seguro: ${command}`);
        }

        try {
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
    });

    // Forward Action
    this.register("forward", async (action, context) => {
        const urlTemplate = action.params?.url || "";
        const url = typeof urlTemplate === 'string' ? ExpressionEngine.interpolate(urlTemplate, context) : String(urlTemplate);
        const method = String(action.params?.method || "POST");

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...(typeof action.params?.headers === 'object' && action.params.headers !== null && !Array.isArray(action.params.headers) ? action.params.headers : {}),
                },
                body: JSON.stringify(context.data),
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
    });


    // --- State Actions ---

    this.register("STATE_SET", async (action, context) => {
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
    });

    this.register("STATE_INCREMENT", async (action, context) => {
        const key = String(action.params?.key || "");
        const amount = Number(action.params?.amount) || 1;
        if (!key) return { error: "Missing key for STATE_INCREMENT" };

        const newValue = await StateManager.getInstance().increment(key, amount);
        return { key, newValue };
    });

    // STATE_GET - Read state and store in context.env
    this.register("STATE_GET", async (action, context) => {
        const key = String(action.params?.key || "");
        const as = String(action.params?.as || key); // Store with this variable name
        if (!key) return { error: "Missing key for STATE_GET" };

        const value = await StateManager.getInstance().get(key);
        
        // Store in context.env for interpolation in subsequent actions
        if (!context.env) context.env = {};
        context.env[as] = value;
        
        return { key, value, storedAs: as };
    });

    // STATE_DELETE
    this.register("STATE_DELETE", async (action, context) => {
        const key = String(action.params?.key || "");
        if (!key) return { error: "Missing key for STATE_DELETE" };

        const deleted = await StateManager.getInstance().delete(key);
        return { key, deleted };
    });

    this.register("EMIT_EVENT", (action, context) => {
         // This action is special. The engine or host must handle the result 
         // and feed it back if desired. 
         // We simply return the instruction to emit.
         return { 
             event: action.params?.event, 
             payload: action.params?.data || {} 
         };
    });

    this.register("notify", (action, context) => {
        const message = action.params?.message || action.params?.content || "Notification";
        const target = action.params?.target || "default";
        console.log(`[Notification] To: ${target}, Msg: ${message}`);
        return { target, message };
    });

    this.register("STATE_OP", (action, context) => {
        // Handled directly by engine's 'run' block support,
        // but can be called explicitly too.
        if (action.params?.run) {
            return new Function(
                "context", "state", "data", "vars", "env", "helpers",
                `with(context) { ${action.params.run} }`
            )(context, context.state, context.data, context.vars, context.env, context.helpers);
        }
        return { warning: "Missing 'run' param for STATE_OP" };
    });
  }
}

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
        const message = ExpressionEngine.interpolate(messageTemplate, context);
        console.log(`[TriggerLog] ${message}`);
        return { message };
    });

    // Response Action
    this.register("response", (action, context) => {
        const contentTemplate = action.params?.content || action.params?.body || "";
        const content = ExpressionEngine.interpolate(contentTemplate, context);
        return {
            statusCode: action.params?.statusCode || 200,
            headers: action.params?.headers || { "Content-Type": "application/json" },
            body: content,
        };
    });

    // Execute Action
    this.register("execute", async (action, context) => {
        const commandTemplate = action.params?.command || action.params?.content || "";
        const command = ExpressionEngine.interpolate(commandTemplate, context);

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
        const url = ExpressionEngine.interpolate(urlTemplate, context);
        const method = action.params?.method || "POST";

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...action.params?.headers,
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
        const key = action.params?.key;
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
        const key = action.params?.key;
        const amount = Number(action.params?.amount) || 1;
        if (!key) return { error: "Missing key for STATE_INCREMENT" };

        const newValue = await StateManager.getInstance().increment(key, amount);
        return { key, newValue };
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
  }
}

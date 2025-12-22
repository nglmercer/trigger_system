
import type { TriggerContext } from "../types";

interface ContextPayload {
    [key: string]: unknown;
}

export interface ContextSource {
    type: string;
    payload: ContextPayload;
    timestamp?: number;
}

export class ContextAdapter {
    
    /**
     * Creates a standardized TriggerContext from a generic source.
     */
    static create(event: string, data: unknown, globals: Record<string, unknown> = {}): TriggerContext {
        return {
            event,
            timestamp: Date.now(),
            data: typeof data === 'object' && data !== null ? data as Record<string, unknown> : { value: data },
            globals,
            helpers: this.getDefaultHelpers()
        };
    }

    /**
     * Adapts a standard HTTP Request (like from Bun.serve) into a TriggerContext.
     * Note: Accessing body requires it to be read previously or passed mainly as objects.
     */
    static fromRequest(req: Request, bodyData?: unknown, globals: Record<string, unknown> = {}): TriggerContext {
        const url = new URL(req.url);
        
        return {
            event: "HTTP_REQUEST",
            timestamp: Date.now(),
            data: {
                method: req.method,
                path: url.pathname,
                query: Object.fromEntries(url.searchParams),
                headers: (() => {
                    const h: Record<string, string> = {};
                    req.headers.forEach((v, k) => h[k] = v);
                    return h;
                })(),
                body: bodyData || {}
            },
            globals: {
                ...globals,
                ip: req.headers.get("x-forwarded-for") || "unknown"
            },
            helpers: this.getDefaultHelpers()
        };
    }

    /**
     * Adapts a generic Webhook payload.
     */
    static fromWebhook(provider: string, eventName: string, payload: ContextPayload, globals: Record<string, unknown> = {}): TriggerContext {
        return {
            event: `WEBHOOK_${provider.toUpperCase()}_${eventName.toUpperCase()}`,
            timestamp: Date.now(),
            data: payload,
            globals: {
                ...globals,
                provider
            },
            helpers: this.getDefaultHelpers()
        };
    }

    private static getDefaultHelpers(): Record<string, (...args: unknown[]) => unknown> {
        return {
            now: () => Date.now(),
            uuid: () => crypto.randomUUID(),
            jsonParse: (str: unknown) => typeof str === 'string' ? JSON.parse(str) : null,
            jsonStringify: (obj: unknown) => JSON.stringify(obj)
        };
    }
}

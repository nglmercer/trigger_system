
import type { TriggerContext } from "../types";

export interface ContextSource {
    type: string;
    payload: any;
    timestamp?: number;
}

export class ContextAdapter {
    
    /**
     * Creates a standardized TriggerContext from a generic source.
     */
    static create(event: string, data: any, globals: Record<string, any> = {}): TriggerContext {
        return {
            event,
            timestamp: Date.now(),
            data: typeof data === 'object' ? data : { value: data },
            globals,
            helpers: this.getDefaultHelpers()
        };
    }

    /**
     * Adapts a standard HTTP Request (like from Bun.serve) into a TriggerContext.
     * Note: Accessing body requires it to be read previously or passed mainly as objects.
     */
    static fromRequest(req: Request, bodyData?: any, globals: Record<string, any> = {}): TriggerContext {
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
    static fromWebhook(provider: string, eventName: string, payload: any, globals: Record<string, any> = {}): TriggerContext {
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

    private static getDefaultHelpers(): Record<string, Function> {
        return {
            now: () => Date.now(),
            uuid: () => crypto.randomUUID(),
            jsonParse: (str: string) => JSON.parse(str),
            jsonStringify: (obj: any) => JSON.stringify(obj)
        };
    }
}

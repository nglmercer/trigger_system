type Handler<T = any> = (data: T) => void;

/**
 * Enumeration of all built-in engine events.
 * Use these constants instead of raw strings to ensure type safety.
 */
export enum EngineEvent {
  ENGINE_START = 'engine:start',
  ENGINE_DONE = 'engine:done',
  RULE_MATCH = 'rule:match',
  ACTION_SUCCESS = 'action:success',
  ACTION_ERROR = 'action:error'
}
export enum RuleEvent {
  RULE_ADDED = 'rule:added',
  RULE_REMOVED = 'rule:removed',
  RULE_UPDATED = 'rule:updated',
}

export const engineEvents = EngineEvent;
export const ruleEvents = RuleEvent;
export class TriggerEmitter {
  private static instance: TriggerEmitter;
  private handlers = new Map<string, Set<Handler>>();

  private constructor() {}

  static getInstance(): TriggerEmitter {
    if (!this.instance) {
      this.instance = new TriggerEmitter();
    }
    return this.instance;
  }

  on<T = any>(event: EngineEvent | RuleEvent | string, handler: Handler<T>): () => void {
    const eventName = event as string;
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);
    
    // Return unsubscribe function
    return () => this.off(eventName, handler);
  }

  off(event: EngineEvent | RuleEvent | string, handler: Handler): void {
    const eventName = event as string;
    const set = this.handlers.get(eventName);
    if (set) {
      set.delete(handler);
    }
  }

  emit<T = any>(event: EngineEvent | RuleEvent | string, data: T): void {
    const eventName = event as string;
    const set = this.handlers.get(eventName);
    if (set) {
      set.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }

}

// Shortcut export
export const triggerEmitter = TriggerEmitter.getInstance();

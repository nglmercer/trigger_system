
import type { TriggerContext } from "../types";
import { RuleEngine } from "./rule-engine";

export interface EventQueueConfig {
    maxBatchSize: number;
    flushIntervalMs: number;
}

export class EventQueue {
    private queue: TriggerContext[] = [];
    private engine: RuleEngine;
    private config: EventQueueConfig;
    private timer: Timer | null = null;
    private isProcessing = false;

    constructor(engine: RuleEngine, config: EventQueueConfig = { maxBatchSize: 10, flushIntervalMs: 100 }) {
        this.engine = engine;
        this.config = config;
    }

    /**
     * Enqueue a new event context.
     * Automatically triggers processing if batch size reached.
     */
    push(context: TriggerContext) {
        this.queue.push(context);
        
        if (this.queue.length >= this.config.maxBatchSize) {
            this.processQueue();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.processQueue(), this.config.flushIntervalMs);
        }
    }

    /**
     * Process all buffered events.
     */
    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const batch = this.queue.splice(0, this.config.maxBatchSize);
        if (batch.length === 0) {
            this.isProcessing = false;
            return;
        }

        console.debug(`[EventQueue] Processing batch of ${batch.length} events.`);

        // Process sequentially to maintain state consistency
        // (Or parallel if state not involved, but for "Stateful Triggers" sequential is safer)
        for (const context of batch) {
            try {
                await this.engine.evaluateContext(context);
            } catch (error) {
                console.error(`[EventQueue] Error processing event ${context.event}:`, error);
            }
        }

        // If more items remain, schedule immediate next tick
        if (this.queue.length > 0) {
            setTimeout(() => this.processQueue(), 0);
        }
        
        this.isProcessing = false;
    }

    getQueueLength(): number {
        return this.queue.length;
    }
}

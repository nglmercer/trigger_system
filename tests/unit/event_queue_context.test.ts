import { describe, test, expect, beforeEach, jest } from "bun:test";
import { EventQueue } from "../../src/core/event-queue";
import type { EventQueueConfig } from "../../src/core/event-queue";
import { RuleEngine } from "../../src/core/rule-engine";
import type { TriggerContext } from "../../src/types";

// Mock RuleEngine
const createMockEngine = () => {
  return {
    evaluateContext: jest.fn(() => Promise.resolve([]))
  } as unknown as RuleEngine;
};

describe("EventQueue Tests", () => {
  let mockEngine: RuleEngine;
  let queue: EventQueue;

  beforeEach(() => {
    mockEngine = createMockEngine();
    jest.clearAllMocks();
  });

  test("should create event queue with default config", () => {
    queue = new EventQueue(mockEngine);
    expect(queue).toBeDefined();
  });

  test("should create event queue with custom config", () => {
    const config: EventQueueConfig = { maxBatchSize: 5, flushIntervalMs: 200 };
    queue = new EventQueue(mockEngine, config);
    expect(queue).toBeDefined();
  });

  test("should enqueue events and trigger batch processing", async () => {
    queue = new EventQueue(mockEngine, { maxBatchSize: 2, flushIntervalMs: 100 });
    
    const ctx1: TriggerContext = { event: "TEST", id: "1", timestamp: Date.now(), data: {} };
    const ctx2: TriggerContext = { event: "TEST", id: "2", timestamp: Date.now(), data: {} };
    
    queue.push(ctx1);
    queue.push(ctx2);
    
    // Wait for batch processing
    await new Promise(r => setTimeout(r, 150));
    
    expect(mockEngine.evaluateContext).toHaveBeenCalledTimes(2);
  });

  test("should get queue length", () => {
    queue = new EventQueue(mockEngine);
    expect(queue.getQueueLength()).toBe(0);
    
    queue.push({ event: "TEST", id: "1", timestamp: Date.now(), data: {} });
    expect(queue.getQueueLength()).toBe(1);
  });

  test("should process queue manually", async () => {
    queue = new EventQueue(mockEngine);
    
    queue.push({ event: "TEST", id: "1", timestamp: Date.now(), data: {} });
    queue.push({ event: "TEST", id: "2", timestamp: Date.now(), data: {} });
    
    await queue.processQueue();
    
    expect(mockEngine.evaluateContext).toHaveBeenCalledTimes(2);
  });

  test("should not process if already processing", async () => {
    queue = new EventQueue(mockEngine);
    
    queue.push({ event: "TEST", id: "1", timestamp: Date.now(), data: {} });
    
    // Call processQueue twice rapidly
    const p1 = queue.processQueue();
    const p2 = queue.processQueue();
    
    await Promise.all([p1, p2]);
    
    // Should only process once
    expect(mockEngine.evaluateContext).toHaveBeenCalledTimes(1);
  });

  test("should handle empty queue processing", async () => {
    queue = new EventQueue(mockEngine);
    
    await queue.processQueue();
    
    expect(mockEngine.evaluateContext).not.toHaveBeenCalled();
  });
});
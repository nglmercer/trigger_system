import { describe, test, expect, beforeEach, jest } from "bun:test";
import { EventQueue } from "../../src/core/event-queue";
import type { EventQueueConfig } from "../../src/core/event-queue";
import { ContextAdapter } from "../../src/core/context-adapter";
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

describe("ContextAdapter Tests", () => {
  test("should create context from basic data", () => {
    const ctx = ContextAdapter.create("TEST_EVENT", { name: "John" });
    
    expect(ctx.event).toBe("TEST_EVENT");
    expect(ctx.data).toEqual({ name: "John" });
    expect(ctx.timestamp).toBeDefined();
    expect(typeof ctx.helpers).toBe("object");
  });

  test("should create context with vars", () => {
    const ctx = ContextAdapter.create("TEST", { a: 1 }, { env: "test" });
    
    expect(ctx.vars).toEqual({ env: "test" });
  });

  test("should wrap non-object data in value property", () => {
    const ctx = ContextAdapter.create("TEST", "hello");
    
    expect(ctx.data).toEqual({ value: "hello" });
  });

  test("should create context from webhook", () => {
    const payload = { action: "created", id: 123 };
    const ctx = ContextAdapter.fromWebhook("github", "push", payload, { token: "abc" });
    
    expect(ctx.event).toBe("WEBHOOK_GITHUB_PUSH");
    expect(ctx.data).toEqual(payload);
    expect(ctx.vars).toEqual({ provider: "github", token: "abc" });
  });

  test("should create context from webhook without vars", () => {
    const ctx = ContextAdapter.fromWebhook("slack", "message", { text: "hi" });
    
    expect(ctx.event).toBe("WEBHOOK_SLACK_MESSAGE");
    expect(ctx.vars).toEqual({ provider: "slack" });
  });

  test("should create context from HTTP request", async () => {
    const req = new Request("http://localhost:3000/api/test?foo=bar", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: JSON.stringify({ name: "test" })
    });
    
    const ctx = ContextAdapter.fromRequest(req, { name: "test" }, { userId: "123" });
    
    expect(ctx.event).toBe("HTTP_REQUEST");
    expect(ctx.data.method).toBe("POST");
    expect(ctx.data.path).toBe("/api/test");
    expect(ctx.data.query).toEqual({ foo: "bar" });
    expect((ctx.vars as any).ip).toBe("1.2.3.4");
    expect((ctx.vars as any).userId).toBe("123");
  });

  test("should handle request without x-forwarded-for", async () => {
    const req = new Request("http://localhost:3000/test", {
      headers: { "Content-Type": "application/json" }
    });
    
    const ctx = ContextAdapter.fromRequest(req);
    
    expect((ctx.vars as any).ip).toBe("unknown");
  });

  test("helpers should provide working functions", () => {
    const ctx = ContextAdapter.create("TEST", {});
    const helpers = ctx.helpers as any;
    
    expect(helpers).toBeDefined();
    expect(typeof helpers.now).toBe("function");
    expect(typeof helpers.uuid).toBe("function");
    expect(typeof helpers.jsonParse).toBe("function");
    expect(typeof helpers.jsonStringify).toBe("function");
    
    // Test actual behavior
    const now = helpers.now();
    expect(typeof now).toBe("number");
    
    const uuid = helpers.uuid();
    expect(typeof uuid).toBe("string");
    expect(uuid.length).toBeGreaterThan(0);
    
    const parsed = helpers.jsonParse('{"a":1}');
    expect(parsed).toEqual({ a: 1 });
    
    const str = helpers.jsonStringify({ b: 2 });
    expect(str).toBe('{"b":2}');
    
    const invalid = helpers.jsonParse("invalid");
    expect(invalid).toBeNull();
  });
});

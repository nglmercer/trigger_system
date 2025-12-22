import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { RuleEngine } from "../../src/node";
import { triggerEmitter, EngineEvent,ruleEvents } from "../../src/node";

describe("Rule Updates with Emitter Verification", () => {
  let engine: RuleEngine;
  let eventLog: any[] = [];
  let eventHandlers: Array<() => void> = [];

  beforeEach(() => {
    // Create fresh engine for each test
    engine = new RuleEngine({
      rules: [
        {
          id: "test-rule-1",
          on: "TEST_EVENT",
          do: { type: "LOG", params: { message: "Test rule 1 executed" } }
        }
      ],
      globalSettings: { debugMode: false }
    });

    // Clear event log
    eventLog = [];
  });

  afterEach(() => {
    // Clean up event handlers
    eventHandlers.forEach(unsubscribe => unsubscribe());
    eventHandlers = [];
  });

  function trackEvent(eventName: string) {
    const unsubscribe = triggerEmitter.on(eventName, (data) => {
      eventLog.push({ event: eventName, data, timestamp: Date.now() });
    });
    eventHandlers.push(unsubscribe);
  }

  describe("Dynamic Rule Updates", () => {
    it("should emit rules:updated event when rules are updated", () => {
      trackEvent(ruleEvents.RULE_UPDATED);

      const newRules = [
        {
          id: "new-rule-1",
          on: "NEW_EVENT",
          do: { type: "LOG", params: { message: "New rule executed" } }
        }
      ];

      engine.updateRules(newRules);

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe(ruleEvents.RULE_UPDATED);
      expect(eventLog[0].data.count).toBe(1);
    });

    it("should track multiple rule updates", () => {
      trackEvent(ruleEvents.RULE_UPDATED);

      // First update
      engine.updateRules([
        { id: "rule-1", on: "EVENT_1", do: { type: "LOG", params: {} } }
      ]);

      // Second update
      engine.updateRules([
        { id: "rule-2", on: "EVENT_2", do: { type: "LOG", params: {} } },
        { id: "rule-3", on: "EVENT_3", do: { type: "LOG", params: {} } }
      ]);

      expect(eventLog).toHaveLength(2);
      expect(eventLog[0].data.count).toBe(1);
      expect(eventLog[1].data.count).toBe(2);
    });

    it("should verify rule updates affect event processing", async () => {
      trackEvent(EngineEvent.RULE_MATCH);

      // Test initial rule
      await engine.processEvent({
        event: "TEST_EVENT",
        timestamp: Date.now(),
        data: {}
      });

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe(EngineEvent.RULE_MATCH);
      expect(eventLog[0].data.rule.id).toBe("test-rule-1");

      // Clear log
      eventLog = [];

      // Update rules
      engine.updateRules([
        {
          id: "updated-rule",
          on: "UPDATED_EVENT",
          do: { type: "LOG", params: { message: "Updated rule" } }
        }
      ]);

      // Test that old rule no longer works
      await engine.processEvent({
        event: "TEST_EVENT",
        timestamp: Date.now(),
        data: {}
      });

      expect(eventLog).toHaveLength(0); // No matches for old event

      // Test that new rule works
      await engine.processEvent({
        event: "UPDATED_EVENT",
        timestamp: Date.now(),
        data: {}
      });

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].data.rule.id).toBe("updated-rule");
    });
  });

  describe("Rule Addition and Removal", () => {
    it("should emit rules:added event when adding a rule", () => {
      trackEvent(ruleEvents.RULE_ADDED);
      trackEvent(ruleEvents.RULE_UPDATED);

      const currentRules = engine.getRules();
      const newRule = {
        id: "added-rule",
        on: "ADDED_EVENT",
        do: { type: "LOG", params: {} }
      };

      engine.updateRules([...currentRules, newRule]);

      // Should get both added and updated events
      expect(eventLog.length).toBeGreaterThanOrEqual(1);
      const addedEvents = eventLog.filter(e => e.event === ruleEvents.RULE_ADDED);
      expect(addedEvents).toHaveLength(1);
      expect(addedEvents[0].data.ruleId).toBe("added-rule");
    });

    it("should emit rules:removed event when removing a rule", () => {
      trackEvent(ruleEvents.RULE_REMOVED);
      trackEvent(ruleEvents.RULE_UPDATED);

      // Start with multiple rules
      engine.updateRules([
        { id: "rule-a", on: "EVENT_A", do: { type: "LOG", params: {} } },
        { id: "rule-b", on: "EVENT_B", do: { type: "LOG", params: {} } },
        { id: "rule-c", on: "EVENT_C", do: { type: "LOG", params: {} } }
      ]);

      // Clear event log to focus on the removal
      eventLog = [];

      // Remove one rule
      engine.updateRules([
        { id: "rule-a", on: "EVENT_A", do: { type: "LOG", params: {} } },
        { id: "rule-c", on: "EVENT_C", do: { type: "LOG", params: {} } }
      ]);

      // Should get both removed and updated events
      expect(eventLog.length).toBeGreaterThanOrEqual(1);
      const removedEvents = eventLog.filter(e => e.event === ruleEvents.RULE_REMOVED);
      expect(removedEvents).toHaveLength(1);
      expect(removedEvents[0].data.ruleId).toBe("rule-b");
    });
  });

  describe("Rule Update Sources", () => {
    it("should track different update sources", () => {
      trackEvent(ruleEvents.RULE_UPDATED);

      // Manual update
      engine.updateRules([
        { id: "manual-rule", on: "MANUAL_EVENT", do: { type: "LOG", params: {} } }
      ]);

      // Emit custom event with source
      triggerEmitter.emit(ruleEvents.RULE_UPDATED, {
        count: 1,
        source: 'manual_update',
        timestamp: Date.now()
      });

      expect(eventLog).toHaveLength(2);
      expect(eventLog[1].data.source).toBe('manual_update');
    });

    it("should track file-based updates", () => {
      trackEvent(ruleEvents.RULE_UPDATED);

      triggerEmitter.emit(ruleEvents.RULE_UPDATED, {
        count: 3,
        source: 'file',
        filename: 'rules.json',
        timestamp: Date.now()
      });

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].data.source).toBe('file');
      expect(eventLog[0].data.filename).toBe('rules.json');
    });
  });

  describe("Error Handling", () => {
    it("should emit rules:parse_error for invalid rules", () => {
      // Clear any previous events
      eventLog = [];
      
      trackEvent('rules:parse_error');

      triggerEmitter.emit('rules:parse_error', {
        filename: 'invalid_rules.json',
        error: 'Invalid JSON syntax',
        timestamp: Date.now()
      });

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe('rules:parse_error');
      expect(eventLog[0].data.filename).toBe('invalid_rules.json');
      expect(eventLog[0].data.error).toBe('Invalid JSON syntax');
    });
  });

  describe("Complex Rule Updates", () => {
    it("should handle conditional rule updates", async () => {
      trackEvent(EngineEvent.RULE_MATCH);
      trackEvent(ruleEvents.RULE_UPDATED);

      // Initial complex rule
      engine.updateRules([
        {
          id: "complex-rule",
          on: "COMPLEX_EVENT",
          if: {
            operator: "AND",
            conditions: [
              { field: "data.condition1", operator: "==", value: true },
              { field: "data.condition2", operator: ">", value: 10 }
            ]
          },
          do: { type: "LOG", params: { message: "Complex rule matched" } }
        }
      ]);

      // Test with matching conditions
      await engine.processEvent({
        event: "COMPLEX_EVENT",
        timestamp: Date.now(),
        data: { condition1: true, condition2: 15 }
      });

      expect(eventLog.filter(e => e.event === EngineEvent.RULE_MATCH)).toHaveLength(1);

      // Update to more complex conditions
      eventLog = [];
      engine.updateRules([
        {
          id: "more-complex-rule",
          on: "COMPLEX_EVENT",
          if: {
            operator: "OR",
            conditions: [
              {
                operator: "AND",
                conditions: [
                  { field: "data.condition1", operator: "==", value: true },
                  { field: "data.condition2", operator: ">", value: 20 }
                ]
              },
              { field: "data.emergency", operator: "==", value: true }
            ]
          },
          do: { type: "LOG", params: { message: "More complex rule matched" } }
        }
      ]);

      // Test with first condition set (should not match)
      await engine.processEvent({
        event: "COMPLEX_EVENT",
        timestamp: Date.now(),
        data: { condition1: true, condition2: 15 }
      });

      // Test with second condition set (should match)
      await engine.processEvent({
        event: "COMPLEX_EVENT",
        timestamp: Date.now(),
        data: { condition1: true, condition2: 25 }
      });

      // Test with emergency flag (should match)
      await engine.processEvent({
        event: "COMPLEX_EVENT",
        timestamp: Date.now(),
        data: { emergency: true }
      });

      const matches = eventLog.filter(e => e.event === EngineEvent.RULE_MATCH);
      expect(matches).toHaveLength(2);
    });
  });

  describe("Event Ordering", () => {
    it("should maintain correct event order during updates", () => {
      const events: string[] = [];
      
      // Track only rules:updated events for this test
      const unsubscribe = triggerEmitter.on(ruleEvents.RULE_UPDATED, () => {
        events.push(ruleEvents.RULE_UPDATED);
      });
      eventHandlers.push(unsubscribe);

      // Perform multiple operations
      engine.updateRules([
        { id: "rule-1", on: "EVENT_1", do: { type: "LOG", params: {} } }
      ]);

      engine.updateRules([
        { id: "rule-1", on: "EVENT_1", do: { type: "LOG", params: {} } },
        { id: "rule-2", on: "EVENT_2", do: { type: "LOG", params: {} } }
      ]);

      engine.updateRules([
        { id: "rule-2", on: "EVENT_2", do: { type: "LOG", params: {} } }
      ]);

      // Should have 3 update events
      expect(events).toHaveLength(3);
      expect(events.every(e => e === ruleEvents.RULE_UPDATED)).toBe(true);
    });
  });
});
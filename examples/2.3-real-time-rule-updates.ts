import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";
import { triggerEmitter, EngineEvent } from "../src/node";

// Enable global observation
setupExampleObserver();

// Comprehensive event tracking
const eventLog: Array<{
  timestamp: number;
  event: string;
  data: any;
}> = [];

// Track all engine events
function setupComprehensiveTracking() {
  // Track rule updates
  triggerEmitter.on('rules:updated', (data) => {
    eventLog.push({
      timestamp: Date.now(),
      event: 'rules:updated',
      data
    });
    console.log(`[TRACK] Rules updated: ${data.count} rules from ${data.source || 'unknown'}`);
  });

  // Track rule additions
  triggerEmitter.on('rules:added', (data) => {
    eventLog.push({
      timestamp: Date.now(),
      event: 'rules:added',
      data
    });
    console.log(`[TRACK] Rule added: ${data.ruleId}`);
  });

  // Track rule removals
  triggerEmitter.on('rules:removed', (data) => {
    eventLog.push({
      timestamp: Date.now(),
      event: 'rules:removed',
      data
    });
    console.log(`[TRACK] Rule removed: ${data.ruleId}`);
  });

  // Track errors
  triggerEmitter.on('rules:parse_error', (data) => {
    eventLog.push({
      timestamp: Date.now(),
      event: 'rules:parse_error',
      data
    });
    console.log(`[TRACK] Parse error in ${data.filename}: ${data.error}`);
  });

  // Track existing engine events for completeness
  triggerEmitter.on(EngineEvent.ENGINE_START, (data) => {
    eventLog.push({
      timestamp: Date.now(),
      event: EngineEvent.ENGINE_START,
      data
    });
  });

  triggerEmitter.on(EngineEvent.RULE_MATCH, (data) => {
    eventLog.push({
      timestamp: Date.now(),
      event: EngineEvent.RULE_MATCH,
      data: { ruleId: data.rule.id }
    });
  });

  triggerEmitter.on(EngineEvent.ACTION_SUCCESS, (data) => {
    eventLog.push({
      timestamp: Date.now(),
      event: EngineEvent.ACTION_SUCCESS,
      data: { actionType: data.action.type }
    });
  });
}

// Rule update manager
class RuleUpdateManager {
  private engine: RuleEngine;
  private updateHistory: Array<{
    timestamp: number;
    action: string;
    rulesCount: number;
    rulesBefore: string[];
    rulesAfter: string[];
  }> = [];

  constructor(engine: RuleEngine) {
    this.engine = engine;
  }

  updateRules(newRules: any[], source: string = 'manual') {
    const beforeRules = this.engine.getRules().map(r => r.id);
    const beforeCount = beforeRules.length;
    
    console.log(`\n🔄 Rule Update Started (${source})`);
    console.log(`   Before: ${beforeCount} rules`);
    console.log(`   Rules: [${beforeRules.join(', ')}]`);
    
    this.engine.updateRules(newRules);
    
    const afterRules = this.engine.getRules().map(r => r.id);
    const afterCount = afterRules.length;
    
    console.log(`   After: ${afterCount} rules`);
    console.log(`   Rules: [${afterRules.join(', ')}]`);
    
    this.updateHistory.push({
      timestamp: Date.now(),
      action: 'update',
      rulesCount: afterCount,
      rulesBefore: beforeRules,
      rulesAfter: afterRules
    });

    // Emit comprehensive update event
    triggerEmitter.emit('rules:updated', {
      count: newRules.length,
      source,
      timestamp: Date.now(),
      rulesBefore: beforeCount,
      rulesAfter: afterCount,
      added: afterRules.filter(id => !beforeRules.includes(id)),
      removed: beforeRules.filter(id => !afterRules.includes(id)),
      unchanged: afterRules.filter(id => beforeRules.includes(id))
    });
  }

  addRule(rule: any, source: string = 'manual') {
    const currentRules = this.engine.getRules();
    const newRules = [...currentRules, rule];
    this.engine.updateRules(newRules);
    
    triggerEmitter.emit('rules:added', {
      ruleId: rule.id,
      source,
      timestamp: Date.now()
    });
  }

  removeRule(ruleId: string, source: string = 'manual') {
    const currentRules = this.engine.getRules();
    const newRules = currentRules.filter(r => r.id !== ruleId);
    this.engine.updateRules(newRules);
    
    triggerEmitter.emit('rules:removed', {
      ruleId,
      source,
      timestamp: Date.now()
    });
  }

  getHistory() {
    return this.updateHistory;
  }
}

async function runExample() {
  console.log("\n=== Running Example 2.3: Real-Time Rule Updates with Comprehensive Tracking ===");
  
  // Setup comprehensive tracking
  setupComprehensiveTracking();

  // Initial engine with basic rules
  const engine = new RuleEngine({
    rules: [
      {
        id: "initial-rule-1",
        on: "APP_START",
        do: { type: "LOG", params: { message: "Application started with basic configuration" } }
      }
    ],
    globalSettings: { debugMode: true }
  });

  const ruleManager = new RuleUpdateManager(engine);

  console.log("\n1. Testing initial configuration...");
  await engine.processEvent({
    event: "APP_START",
    timestamp: Date.now(),
    data: { version: "1.0.0" }
  });

  // Simulate real-time updates
  console.log("\n2. Simulating feature deployment - adding user management rules...");
  ruleManager.updateRules([
    {
      id: "user-login",
      on: "USER_LOGIN",
      if: { field: "data.success", operator: "==", value: true },
      do: { type: "LOG", params: { message: "User ${data.username} logged in successfully" } }
    },
    {
      id: "user-logout",
      on: "USER_LOGOUT",
      do: { type: "LOG", params: { message: "User session ended" } }
    },
    {
      id: "login-failed",
      on: "USER_LOGIN",
      if: { field: "data.success", operator: "==", value: false },
      do: { type: "LOG", params: { message: "Login failed for ${data.username}" } }
    }
  ], "feature_deployment");

  console.log("\n3. Testing user management rules...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "alice", success: true }
  });

  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "bob", success: false }
  });

  // Simulate A/B testing - gradual rollout
  console.log("\n4. Simulating A/B testing - adding experimental rules...");
  ruleManager.addRule({
    id: "ab-test-welcome",
    on: "USER_LOGIN",
    if: {
      operator: "AND",
      conditions: [
        { field: "data.success", operator: "==", value: true },
        { field: "data.abGroup", operator: "==", value: "experiment" }
      ]
    },
    do: { type: "LOG", params: { message: "A/B Test: Welcome experiment user ${data.username}!" } }
  }, "ab_testing");

  console.log("\n5. Testing A/B test rule...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "charlie", success: true, abGroup: "experiment" }
  });

  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "david", success: true, abGroup: "control" }
  });

  // Simulate hotfix - remove problematic rule
  console.log("\n6. Simulating hotfix - removing experimental rule...");
  ruleManager.removeRule("ab-test-welcome", "hotfix");

  console.log("\n7. Testing after hotfix...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "eve", success: true, abGroup: "experiment" }
  });

  // Simulate major update - complete rule overhaul
  console.log("\n8. Simulating major update - complete rule overhaul...");
  ruleManager.updateRules([
    {
      id: "enhanced-login",
      on: "USER_LOGIN",
      if: {
        operator: "AND",
        conditions: [
          { field: "data.success", operator: "==", value: true },
          { field: "data.userType", operator: "==", value: "premium" }
        ]
      },
      do: { type: "LOG", params: { message: "Premium user ${data.username} logged in - VIP mode activated" } }
    },
    {
      id: "standard-login",
      on: "USER_LOGIN",
      if: {
        operator: "AND",
        conditions: [
          { field: "data.success", operator: "==", value: true },
          { field: "data.userType", operator: "==", value: "standard" }
        ]
      },
      do: { type: "LOG", params: { message: "Standard user ${data.username} logged in" } }
    },
    {
      id: "security-alert",
      on: "USER_LOGIN",
      if: { field: "data.success", operator: "==", value: false },
      do: { type: "LOG", params: { message: "SECURITY ALERT: Failed login attempt for ${data.username}" } }
    }
  ], "major_update");

  console.log("\n9. Testing major update rules...");
  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "frank", success: true, userType: "premium" }
  });

  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "grace", success: true, userType: "standard" }
  });

  await engine.processEvent({
    event: "USER_LOGIN",
    timestamp: Date.now(),
    data: { username: "henry", success: false }
  });

  // Display comprehensive event log
  console.log("\n📊 COMPREHENSIVE EVENT LOG:");
  console.log("=".repeat(60));
  
  const eventCounts: Record<string, number> = {};
  eventLog.forEach(entry => {
    eventCounts[entry.event] = (eventCounts[entry.event] || 0) + 1;
  });

  Object.entries(eventCounts).forEach(([event, count]) => {
    console.log(`   ${event}: ${count} occurrences`);
  });

  console.log(`\n📈 DETAILED EVENT TIMELINE:`);
  eventLog.forEach((entry, index) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`   ${index + 1}. [${time}] ${entry.event}`);
  });

  console.log(`\n🔄 RULE UPDATE HISTORY:`);
  ruleManager.getHistory().forEach((update, index) => {
    const time = new Date(update.timestamp).toLocaleTimeString();
    console.log(`   ${index + 1}. [${time}] ${update.action} - ${update.rulesCount} rules`);
  });

  console.log(`\n✅ Total events tracked: ${eventLog.length}`);
  console.log(`✅ Total rule updates: ${ruleManager.getHistory().length}`);
}

runExample().catch(console.error);
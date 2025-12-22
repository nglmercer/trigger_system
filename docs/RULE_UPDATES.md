# Rule Updates with Emitter Verification

This document describes the rule update functionality and how to verify that rules are properly updated using the event emitter system.

## Overview

The trigger system supports dynamic rule updates at runtime, allowing you to:

- Add new rules without restarting the engine
- Remove existing rules
- Modify rule conditions and actions
- Track all rule changes via the event emitter

## Event Types

When rules are updated, the following events are emitted:

### `rules:updated`
Emitted when any rule update occurs (addition, removal, or modification).

```typescript
{
  count: number,           // Total number of rules after update
  added: number,           // Number of rules added
  removed: number,         // Number of rules removed
  unchanged: number,       // Number of rules unchanged
  timestamp: number        // Update timestamp
}
```

### `rules:added`
Emitted when specific rules are added.

```typescript
{
  ruleId: string,          // ID of the added rule
  timestamp: number        // Addition timestamp
}
```

### `rules:removed`
Emitted when specific rules are removed.

```typescript
{
  ruleId: string,          // ID of the removed rule
  timestamp: number        // Removal timestamp
}
```

### `rules:parse_error`
Emitted when there's an error parsing rule definitions (file-based updates).

```typescript
{
  filename: string,        // File that caused the error
  error: string,           // Error message
  timestamp: number        // Error timestamp
}
```

## Basic Usage

### Updating Rules Dynamically

```typescript
import { RuleEngine, triggerEmitter } from 'trigger_system';

const engine = new RuleEngine({
  rules: [/* initial rules */],
  globalSettings: { debugMode: true }
});

// Track rule updates
triggerEmitter.on('rules:updated', (data) => {
  console.log(`Rules updated: ${data.count} total rules`);
});

// Update rules
engine.updateRules([
  {
    id: "new-rule",
    on: "USER_LOGIN",
    if: { field: "data.isNew", operator: "==", value: true },
    do: { type: "LOG", params: { message: "Welcome!" } }
  }
]);
```

### Tracking Individual Rule Changes

```typescript
// Track when specific rules are added
triggerEmitter.on('rules:added', (data) => {
  console.log(`Rule added: ${data.ruleId}`);
});

// Track when specific rules are removed
triggerEmitter.on('rules:removed', (data) => {
  console.log(`Rule removed: ${data.ruleId}`);
});
```

## Examples

### Example 1: Dynamic Rule Updates

See [`examples/2.1-dynamic-rule-updates.ts`](examples/2.1-dynamic-rule-updates.ts) for a complete example showing:

- Initial rule configuration
- Dynamic rule updates
- Event tracking and verification
- Rule evolution over time

### Example 2: File-Based Rule Updates

See [`examples/2.2-file-based-rule-updates.ts`](examples/2.2-file-based-rule-updates.ts) for:

- Loading rules from files
- Watching for file changes
- Automatic rule updates
- Error handling for invalid rule files

### Example 3: Real-Time Rule Updates

See [`examples/2.3-real-time-rule-updates.ts`](examples/2.3-real-time-rule-updates.ts) for:

- Comprehensive event tracking
- Rule update management
- A/B testing scenarios
- Hotfix deployments
- Major rule overhauls

## Testing

The test suite in [`tests/unit/rule_updates.test.ts`](tests/unit/rule_updates.test.ts) verifies:

- Event emission during rule updates
- Rule addition and removal tracking
- Event ordering and timing
- Error handling for invalid rules
- Complex conditional rule updates

Run tests with:
```bash
npm test tests/unit/rule_updates.test.ts
```

## Best Practices

### 1. Always Track Rule Updates
```typescript
triggerEmitter.on('rules:updated', (data) => {
  console.log(`Rules updated: ${data.count} rules`);
  // Log to monitoring system
  // Update metrics
  // Notify administrators
});
```

### 2. Handle Rule Conflicts
When updating rules, be aware of potential conflicts:

```typescript
// Check for existing rules with same ID
const existingIds = new Set(engine.getRules().map(r => r.id));
const newRules = updatedRules.filter(rule => !existingIds.has(rule.id));

// Update only non-conflicting rules
engine.updateRules([...engine.getRules(), ...newRules]);
```

### 3. Validate Rules Before Updates
```typescript
function validateRules(rules: TriggerRule[]): boolean {
  return rules.every(rule => 
    rule.id && 
    rule.on && 
    rule.do &&
    typeof rule.id === 'string' &&
    typeof rule.on === 'string'
  );
}

if (validateRules(newRules)) {
  engine.updateRules(newRules);
} else {
  console.error('Invalid rule configuration');
}
```

### 4. Use Source Tracking
Track where rule updates come from:

```typescript
triggerEmitter.on('rules:updated', (data) => {
  if (data.source === 'file') {
    console.log(`Rules updated from file: ${data.filename}`);
  } else if (data.source === 'api') {
    console.log('Rules updated via API');
  }
});
```

### 5. Implement Rollback Mechanisms
```typescript
class RuleUpdateManager {
  private ruleHistory: TriggerRule[][] = [];
  
  updateRules(newRules: TriggerRule[]) {
    // Save current state
    this.ruleHistory.push(engine.getRules());
    
    // Apply new rules
    engine.updateRules(newRules);
  }
  
  rollback() {
    if (this.ruleHistory.length > 0) {
      const previousRules = this.ruleHistory.pop();
      engine.updateRules(previousRules);
    }
  }
}
```

## Integration with Monitoring

### Metrics Collection
```typescript
// Collect metrics on rule updates
const ruleUpdateMetrics = {
  totalUpdates: 0,
  additions: 0,
  removals: 0,
  errors: 0
};

triggerEmitter.on('rules:updated', (data) => {
  ruleUpdateMetrics.totalUpdates++;
  ruleUpdateMetrics.additions += data.added || 0;
  ruleUpdateMetrics.removals += data.removed || 0;
});

triggerEmitter.on('rules:parse_error', () => {
  ruleUpdateMetrics.errors++;
});
```

### Logging Integration
```typescript
// Integrate with logging systems
triggerEmitter.on('rules:updated', (data) => {
  logger.info('Rule update detected', {
    ruleCount: data.count,
    added: data.added,
    removed: data.removed,
    timestamp: data.timestamp
  });
});
```

## Performance Considerations

- Rule updates are synchronous and immediate
- Large rule sets may cause brief processing delays
- Consider batching updates for large rule changes
- Monitor memory usage with frequent rule updates

## Security Considerations

- Validate all rule inputs before updates
- Implement access controls for rule modification
- Log all rule changes for audit trails
- Consider rule signing for integrity verification

## Troubleshooting

### Rules Not Updating
1. Check event listener registration
2. Verify rule format and validation
3. Check for JavaScript errors in console
4. Ensure proper event emission

### Events Not Firing
1. Verify triggerEmitter import
2. Check event name spelling
3. Ensure listeners are registered before updates
4. Test with simple event handlers

### Performance Issues
1. Monitor rule count and complexity
2. Implement rule caching where appropriate
3. Consider rule prioritization
4. Profile update operations
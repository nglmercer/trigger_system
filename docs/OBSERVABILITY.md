# 🔭 Observability

This guide covers monitoring, logging, metrics, and debugging tools for the Agnostic Trigger System.

## triggerEmitter - Event Monitoring

The `triggerEmitter` is the central event bus for monitoring all system activities.

### Basic Event Monitoring

```typescript
import { triggerEmitter } from 'trigger_system';

// Monitor rule execution
triggerEmitter.on('rule:matched', (rule, event) => {
  console.log(`✅ Rule matched: ${rule.id} for event ${event.type}`);
});

triggerEmitter.on('rule:executed', (rule, action) => {
  console.log(`🎯 Action executed: ${action.type} for rule ${rule.id}`);
});

triggerEmitter.on('rule:failed', (rule, error) => {
  console.error(`❌ Rule failed: ${rule.id}`, {
    error: error.message,
    stack: error.stack,
    rule: rule.id
  });
});
```

### Engine Lifecycle Events

```typescript
// Monitor engine lifecycle
triggerEmitter.on('engine:started', () => {
  console.log('🚀 Rule engine started');
});

triggerEmitter.on('engine:stopped', () => {
  console.log('🛑 Rule engine stopped');
});

triggerEmitter.on('engine:rule_added', (rule) => {
  console.log(`📋 Rule added: ${rule.id}`);
});

triggerEmitter.on('engine:rule_removed', (ruleId) => {
  console.log(`🗑️ Rule removed: ${ruleId}`);
});
```

### State Change Monitoring

```typescript
// Monitor state changes
triggerEmitter.on('state:changed', (key, oldValue, newValue) => {
  console.log(`📝 State changed: ${key}`, {
    oldValue,
    newValue,
    changed: oldValue !== newValue
  });
});

triggerEmitter.on('state:cleared', (key) => {
  console.log(`🧹 State cleared: ${key}`);
});

triggerEmitter.on('state:expired', (key) => {
  console.log(`⏰ State expired: ${key}`);
});
```

## Structured Logging

### Winston Integration

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Connect trigger system to Winston
triggerEmitter.on('rule:matched', (rule, event) => {
  logger.info('Rule matched', {
    ruleId: rule.id,
    eventType: event.type,
    timestamp: event.timestamp,
    metadata: rule.metadata
  });
});

triggerEmitter.on('rule:failed', (rule, error) => {
  logger.error('Rule execution failed', {
    ruleId: rule.id,
    error: error.message,
    stack: error.stack,
    severity: 'high'
  });
});
```

### Pino Integration

```typescript
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Structured logging with Pino
triggerEmitter.on('engine:event_processed', (event, processingTime) => {
  logger.info({
    event: 'event_processed',
    eventType: event.type,
    processingTime,
    timestamp: Date.now()
  });
});
```

## Metrics Collection

### Built-in Metrics

```typescript
import { MetricsCollector } from 'trigger_system';

const metrics = new MetricsCollector();

// Get current metrics
const currentMetrics = metrics.getMetrics();
console.log('Current metrics:', {
  totalRules: currentMetrics.totalRules,
  totalEvents: currentMetrics.totalEvents,
  matchedEvents: currentMetrics.matchedEvents,
  failedEvents: currentMetrics.failedEvents,
  averageProcessingTime: currentMetrics.averageProcessingTime
});

// Export metrics
const metricsJson = metrics.export();
console.log('Metrics JSON:', metricsJson);
```

### Custom Metrics

```typescript
class CustomMetrics {
  private counters = new Map<string, number>();
  private timers = new Map<string, number[]>();
  
  increment(metric: string, value = 1) {
    this.counters.set(metric, (this.counters.get(metric) || 0) + value);
  }
  
  time(metric: string, duration: number) {
    if (!this.timers.has(metric)) {
      this.timers.set(metric, []);
    }
    this.timers.get(metric)!.push(duration);
  }
  
  getAverageTime(metric: string): number {
    const times = this.timers.get(metric) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
  
  getMetrics() {
    const metrics: Record<string, any> = {};
    
    for (const [key, value] of this.counters) {
      metrics[key] = value;
    }
    
    for (const [key, times] of this.timers) {
      metrics[`${key}_avg`] = this.getAverageTime(key);
      metrics[`${key}_count`] = times.length;
    }
    
    return metrics;
  }
}

const customMetrics = new CustomMetrics();

// Track custom events
triggerEmitter.on('rule:executed', (rule, action) => {
  customMetrics.increment(`action_${action.type}`);
  customMetrics.increment(`rule_${rule.id}`);
});

triggerEmitter.on('engine:event_processed', (event, duration) => {
  customMetrics.time('event_processing', duration);
});
```

## Health Checks and Monitoring

### Engine Health Check

```typescript
class HealthChecker {
  constructor(private engine: RuleEngine) {}
  
  async checkHealth(): Promise<HealthStatus> {
    const checks = {
      engine: this.checkEngine(),
      rules: await this.checkRules(),
      state: await this.checkState(),
      actions: this.checkActions()
    };
    
    const overall = Object.values(checks).every(check => check.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';
    
    return {
      status: overall,
      timestamp: Date.now(),
      checks
    };
  }
  
  private checkEngine() {
    try {
      const rules = this.engine.getAllRules();
      return {
        status: 'healthy',
        details: {
          ruleCount: rules.length,
          uptime: process.uptime()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  private async checkRules() {
    try {
      const validator = new RuleValidator();
      const rules = this.engine.getAllRules();
      const errors = validator.validateAll(rules);
      
      return {
        status: errors.length === 0 ? 'healthy' : 'warning',
        details: {
          totalRules: rules.length,
          validationErrors: errors.length,
          errors: errors.slice(0, 5) // First 5 errors
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  private async checkState() {
    try {
      const keys = await this.engine.persistence.keys();
      const stateSize = keys.length;
      
      return {
        status: stateSize < 10000 ? 'healthy' : 'warning',
        details: {
          stateKeys: stateSize,
          warningThreshold: 10000
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  private checkActions() {
    const failedActions = customMetrics.getMetrics().failed_actions || 0;
    
    return {
      status: failedActions < 10 ? 'healthy' : 'warning',
      details: {
        failedActions,
        warningThreshold: 10
      }
    };
  }
}

// Usage
const healthChecker = new HealthChecker(engine);
const health = await healthChecker.checkHealth();
console.log('Health status:', health);
```

### Express.js Health Endpoint

```typescript
import express from 'express';

const app = express();

app.get('/health', async (req, res) => {
  const health = await healthChecker.checkHealth();
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/metrics', async (req, res) => {
  const metrics = {
    engine: metrics.getMetrics(),
    custom: customMetrics.getMetrics(),
    timestamp: Date.now()
  };
  
  res.json(metrics);
});

app.listen(3000, () => {
  console.log('Health check server running on port 3000');
});
```

## Performance Monitoring

### Processing Time Tracking

```typescript
// Track event processing time
triggerEmitter.on('engine:event_received', (event) => {
  const startTime = Date.now();
  
  triggerEmitter.once(`engine:event_processed:${event.type}`, () => {
    const duration = Date.now() - startTime;
    
    customMetrics.time('event_processing', duration);
    
    if (duration > 1000) { // Alert on slow processing
      logger.warn('Slow event processing', {
        eventType: event.type,
        duration,
        threshold: 1000
      });
    }
  });
});
```

### Memory Usage Monitoring

```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  
  customMetrics.increment('memory_rss', usage.rss);
  customMetrics.increment('memory_heap_used', usage.heapUsed);
  customMetrics.increment('memory_heap_total', usage.heapTotal);
  
  // Alert on high memory usage
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn('High memory usage', {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss
    });
  }
}, 60000); // Every minute
```

### Rule Performance Profiling

```typescript
const rulePerformance = new Map<string, number[]>();

triggerEmitter.on('rule:matched', (rule) => {
  const startTime = Date.now();
  
  triggerEmitter.once(`rule:executed:${rule.id}`, () => {
    const duration = Date.now() - startTime;
    
    if (!rulePerformance.has(rule.id)) {
      rulePerformance.set(rule.id, []);
    }
    
    rulePerformance.get(rule.id)!.push(duration);
    
    // Log slow rules
    if (duration > 500) {
      logger.warn('Slow rule execution', {
        ruleId: rule.id,
        duration,
        threshold: 500
      });
    }
  });
});

// Get rule performance report
function getRulePerformanceReport() {
  const report: Record<string, any> = {};
  
  for (const [ruleId, times] of rulePerformance) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    report[ruleId] = {
      average: avg,
      maximum: max,
      minimum: min,
      executions: times.length
    };
  }
  
  return report;
}
```

## Error Tracking and Alerting

### Error Classification

```typescript
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface TrackedError {
  ruleId?: string;
  actionType?: string;
  error: Error;
  severity: ErrorSeverity;
  context?: any;
  timestamp: number;
}

class ErrorTracker {
  private errors: TrackedError[] = [];
  
  trackError(error: TrackedError) {
    this.errors.push(error);
    
    // Alert based on severity
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.sendCriticalAlert(error);
    }
    
    // Log error
    logger.error('Tracked error', error);
  }
  
  private sendCriticalAlert(error: TrackedError) {
    // Send to alerting system (PagerDuty, Slack, etc.)
    console.error('🚨 CRITICAL ERROR:', {
      ruleId: error.ruleId,
      error: error.error.message,
      context: error.context
    });
  }
  
  getErrorReport(timeWindow = 3600000): TrackedError[] { // 1 hour default
    const cutoff = Date.now() - timeWindow;
    return this.errors.filter(e => e.timestamp > cutoff);
  }
}

const errorTracker = new ErrorTracker();

// Track rule execution errors
triggerEmitter.on('rule:failed', (rule, error) => {
  errorTracker.trackError({
    ruleId: rule.id,
    error,
    severity: ErrorSeverity.HIGH,
    timestamp: Date.now()
  });
});
```

### Slack Integration

```typescript
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_TOKEN);

async function sendSlackAlert(message: string, channel = '#alerts') {
  try {
    await slack.chat.postMessage({
      channel,
      text: message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        }
      ]
    });
  } catch (error) {
    logger.error('Failed to send Slack alert', error);
  }
}

// Send alerts for critical events
triggerEmitter.on('rule:failed', (rule, error) => {
  const message = `🚨 Rule Failed: ${rule.id}\nError: ${error.message}\nTime: ${new Date().toISOString()}`;
  sendSlackAlert(message, '#critical-alerts');
});
```

## Distributed Tracing

### OpenTelemetry Integration

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    getNodeAutoInstrumentations()
  ]
});

// Add tracing to rule execution
triggerEmitter.on('rule:matched', (rule, event) => {
  const span = tracer.startSpan('rule_execution');
  span.setAttributes({
    'rule.id': rule.id,
    'event.type': event.type,
    'rule.metadata': JSON.stringify(rule.metadata || {})
  });
  
  triggerEmitter.once(`rule:executed:${rule.id}`, () => {
    span.setAttribute('rule.status', 'success');
    span.end();
  });
  
  triggerEmitter.once(`rule:failed:${rule.id}`, (error) => {
    span.setAttribute('rule.status', 'failed');
    span.setAttribute('rule.error', error.message);
    span.end();
  });
});
```

## Dashboard and Visualization

### Grafana Integration

```typescript
// Export metrics in Prometheus format
app.get('/metrics/prometheus', (req, res) => {
  const metrics = customMetrics.getMetrics();
  let prometheusFormat = '';
  
  for (const [key, value] of Object.entries(metrics)) {
    prometheusFormat += `# HELP ${key} Custom metric\n`;
    prometheusFormat += `# TYPE ${key} gauge\n`;
    prometheusFormat += `${key} ${value}\n`;
  }
  
  res.set('Content-Type', 'text/plain');
  res.send(prometheusFormat);
});
```

### Custom Dashboard Data

```typescript
app.get('/dashboard', async (req, res) => {
  const engineMetrics = metrics.getMetrics();
  const customMetrics = customMetrics.getMetrics();
  const health = await healthChecker.checkHealth();
  const rulePerformance = getRulePerformanceReport();
  
  const dashboardData = {
    overview: {
      totalRules: engineMetrics.totalRules,
      totalEvents: engineMetrics.totalEvents,
      successRate: ((engineMetrics.matchedEvents - engineMetrics.failedEvents) / engineMetrics.totalEvents) * 100,
      averageProcessingTime: engineMetrics.averageProcessingTime
    },
    health: health,
    topRules: Object.entries(rulePerformance)
      .sort(([,a], [,b]) => b.executions - a.executions)
      .slice(0, 10),
    recentErrors: errorTracker.getErrorReport(3600000).slice(0, 5),
    customMetrics: customMetrics
  };
  
  res.json(dashboardData);
});
```

## Log Aggregation

### ELK Stack Integration

```typescript
// Configure Winston for Elasticsearch
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
  },
  index: 'trigger-system-logs'
});

logger.add(esTransport);

// Add contextual information to logs
triggerEmitter.on('rule:matched', (rule, event) => {
  logger.info('Rule matched', {
    ruleId: rule.id,
    eventType: event.type,
    '@timestamp': new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: 'trigger-system'
  });
});
```

## Alerting Rules

### Automated Alerting

```yaml
# rules/alerting.yaml
- id: "high-error-rate-alert"
  on: "METRICS_COLLECTED"
  if:
    field: "data.failedEvents"
    operator: "GT"
    value: 10
  do:
    type: "send_alert"
    params:
      severity: "warning"
      message: "High error rate detected: ${data.failedEvents} failed events"
      channels: ["slack", "email"]

- id: "slow-processing-alert"
  on: "METRICS_COLLECTED"
  if:
    field: "data.averageProcessingTime"
    operator: "GT"
    value: 1000
  do:
    type: "send_alert"
    params:
      severity: "warning"
      message: "Slow processing detected: ${data.averageProcessingTime}ms average"
      channels: ["slack"]

- id: "memory-usage-alert"
  on: "MEMORY_USAGE_HIGH"
  if:
    field: "data.heapUsed"
    operator: "GT"
    value: 500000000  # 500MB
  do:
    type: "send_alert"
    params:
      severity: "critical"
      message: "High memory usage: ${data.heapUsed} bytes"
      channels: ["slack", "pagerduty"]
```

## Best Practices

### 1. Structured Logging

Always use structured logging with consistent field names:

```typescript
// ✅ Good
logger.info('Rule executed', {
  ruleId: rule.id,
  eventType: event.type,
  duration: processingTime,
  success: true
});

// ❌ Bad
console.log(`Rule ${rule.id} executed for event ${event.type} in ${processingTime}ms`);
```

### 2. Appropriate Log Levels

Use appropriate log levels for different situations:

```typescript
logger.debug('Rule condition evaluated', { result, condition });
logger.info('Rule matched and executed', { ruleId, eventType });
logger.warn('Rule execution slow', { ruleId, duration, threshold });
logger.error('Rule execution failed', { ruleId, error: error.message });
```

### 3. Contextual Information

Include relevant context in all log entries:

```typescript
logger.info('User action processed', {
  userId: event.data.userId,
  action: event.type,
  ruleId: rule.id,
  timestamp: event.timestamp,
  sessionId: event.data.sessionId,
  ip: event.data.ipAddress
});
```

### 4. Metric Cardinality

Be careful with metric cardinality to avoid overwhelming your monitoring system:

```typescript
// ✅ Good - bounded cardinality
customMetrics.increment(`rule_${ruleId}_executed`);

// ❌ Bad - unbounded cardinality
customMetrics.increment(`rule_${ruleId}_executed_at_${Date.now()}`);
```

### 5. Alert Fatigue Prevention

Implement alert throttling and escalation:

```typescript
class AlertThrottler {
  private alerts = new Map<string, number>();
  
  shouldAlert(key: string, cooldown = 300000): boolean { // 5 minutes
    const lastAlert = this.alerts.get(key) || 0;
    const now = Date.now();
    
    if (now - lastAlert > cooldown) {
      this.alerts.set(key, now);
      return true;
    }
    
    return false;
  }
}

const alertThrottler = new AlertThrottler();

triggerEmitter.on('rule:failed', (rule, error) => {
  const alertKey = `rule_failed_${rule.id}`;
  
  if (alertThrottler.shouldAlert(alertKey)) {
    sendSlackAlert(`Rule ${rule.id} failed: ${error.message}`);
  }
});
```

For more information about debugging and development tools, see the [Developer Tools Guide](./developer_tools.md).
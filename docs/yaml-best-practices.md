# 📝 YAML Best Practices

This guide covers recommended formats and patterns for writing trigger rule files in YAML.

## List Format (Recommended)

The list format is the most readable and maintainable way to organize your rules.

### Basic Structure

```yaml
# rules/app-rules.yaml
- id: "user-login"
  on: "USER_LOGIN"
  if:
    field: "data.success"
    operator: "EQ"
    value: true
  do:
    type: "log_message"
    params:
      message: "User ${data.userId} logged in successfully"

- id: "failed-login-alert"
  on: "USER_LOGIN"
  if:
    field: "data.success"
    operator: "EQ"
    value: false
  do:
    type: "send_alert"
    params:
      severity: "warning"
      message: "Failed login attempt for ${data.userId}"
```

### Advantages of List Format

- **Readable**: Each rule is clearly separated
- **Maintainable**: Easy to add, remove, or reorder rules
- **Validatable**: Each rule can be validated independently
- **Merge-friendly**: Git conflicts are easier to resolve
- **Scalable**: Works well with hundreds of rules

### Complex Rules in List Format

```yaml
- id: "high-value-transaction"
  on: "TRANSACTION_PROCESSED"
  if:
    and:
      - field: "data.amount"
        operator: "GT"
        value: 1000
      - field: "data.currency"
        operator: "EQ"
        value: "USD"
      - field: "data.status"
        operator: "EQ"
        value: "completed"
  do:
    - type: "log_message"
      params:
        level: "info"
        message: "High value transaction: $${data.amount}"
    - type: "send_alert"
      params:
        channels: ["email", "slack"]
        priority: "high"
        template: "high_value_transaction"
    - type: "state_increment"
      params:
        field: "metrics.high_value_transactions"
```

## Multi-Document Format (Legacy)

While still supported, the multi-document format is less recommended.

### Structure

```yaml
# rules/legacy-rules.yaml
id: "user-login"
on: "USER_LOGIN"
if:
  field: "data.success"
  operator: "EQ"
  value: true
do:
  type: "log_message"
  params:
    message: "User logged in"
---
id: "failed-login-alert"
on: "USER_LOGIN"
if:
  field: "data.success"
  operator: "EQ"
  value: false
do:
  type: "send_alert"
  params:
    message: "Login failed"
```

### Disadvantages

- Harder to read with many rules
- More complex validation
- Git merge conflicts are common
- Limited tooling support
- Error reporting is less precise

## YAML Formatting Guidelines

### Indentation

Use **2 spaces** for indentation (never tabs):

```yaml
# ✅ Good
- id: "example"
  on: "EVENT"
  if:
    field: "data.value"
    operator: "GT"
    value: 10

# ❌ Bad - mixed indentation
- id: "example"
    on: "EVENT"
      if:
        field: "data.value"
          operator: "GT"
            value: 10
```

### Quoting

Use quotes consistently:

```yaml
# ✅ Good - consistent single quotes
- id: 'user-login'
  on: 'USER_LOGIN'
  if:
    field: 'data.userType'
    operator: 'EQ'
    value: 'premium'

# ✅ Good - consistent double quotes
- id: "user-login"
  on: "USER_LOGIN"
  if:
    field: "data.userType"
    operator: "EQ"
    value: "premium"

# ❌ Bad - mixed quotes
- id: 'user-login'
  on: "USER_LOGIN"
  if:
    field: 'data.userType'
    operator: "EQ"
    value: 'premium'
```

### String Interpolation

Use `${}` syntax for variable interpolation:

```yaml
# ✅ Good
do:
  type: "send_email"
  params:
    subject: "Welcome ${data.userName}!"
    message: "Your account ${data.accountId} is ready"

# ❌ Bad - incorrect syntax
do:
  type: "send_email"
  params:
    subject: "Welcome {data.userName}!"
    message: "Your account $data.accountId is ready"
```

## Rule Organization

### Group by Domain

Organize rules by business domain or functionality:

```text
rules/
├── user-management/
│   ├── authentication.yaml
│   ├── registration.yaml
│   └── profile-updates.yaml
├── billing/
│   ├── payments.yaml
│   ├── subscriptions.yaml
│   └── invoicing.yaml
├── notifications/
│   ├── email.yaml
│   ├── sms.yaml
│   └── push-notifications.yaml
└── system/
    ├── monitoring.yaml
    ├── maintenance.yaml
    └── error-handling.yaml
```

### Group by Event Type

Alternatively, organize by the events they handle:

```text
rules/
├── user-events/
│   ├── login.yaml
│   ├── logout.yaml
│   └── registration.yaml
├── transaction-events/
│   ├── payment.yaml
│   ├── refund.yaml
│   └── dispute.yaml
└── system-events/
    ├── startup.yaml
    ├── shutdown.yaml
    └── error.yaml
```

### File Naming Conventions

Use descriptive, kebab-case filenames:

```yaml
# ✅ Good
user-authentication.yaml
high-value-transactions.yaml
system-monitoring.yaml

# ❌ Bad
rules1.yaml
myRules.yaml
user authentication.yaml
```

## Metadata Best Practices

### Always Include Metadata

```yaml
- id: "user-registration-complete"
  metadata:
    description: "Handle user registration completion"
    author: "dev-team"
    version: "1.0.0"
    tags: ["user-management", "registration", "onboarding"]
    priority: 1
    enabled: true
    createdAt: "2024-01-15T10:00:00Z"
    updatedAt: "2024-01-20T14:30:00Z"
  on: "USER_REGISTERED"
  if:
    field: "data.success"
    operator: "EQ"
    value: true
  do:
    type: "send_welcome_email"
    params:
      template: "welcome_new_user"
```

### Version Management

Use semantic versioning for rules:

```yaml
metadata:
  version: "1.0.0"  # Major.Minor.Patch
  changelog: |
    1.0.0 - Initial version
    1.1.0 - Added SMS notification
    1.2.0 - Fixed email template
```

## Condition Best Practices

### Use Descriptive Field Paths

```yaml
# ✅ Good
if:
  field: "data.user.profile.accountType"
  operator: "EQ"
  value: "premium"

# ❌ Bad
if:
  field: "type"
  operator: "EQ"
  value: "premium"
```

### Complex Conditions

Use explicit logical operators:

```yaml
# ✅ Good - explicit and clear
if:
  and:
    - field: "data.amount"
      operator: "GT"
      value: 100
    - field: "data.currency"
      operator: "EQ"
      value: "USD"
  or:
    - field: "data.userType"
      operator: "EQ"
      value: "premium"
    - field: "data.vipStatus"
      operator: "EQ"
      value: true

# ❌ Bad - unclear logic
if:
  field: "data.amount"
  operator: "GT"
  value: 100
# How does this combine with other conditions?
```

### State-based Conditions

Clearly indicate state dependencies:

```yaml
# ✅ Good
if:
  field: "state.user.${data.userId}.loginCount"
  operator: "GTE"
  value: 5

# ✅ Good - with fallback
if:
  field: "state.user.${data.userId}.loginCount"
  operator: "EXISTS"
do:
  - type: "state_set"
    params:
      field: "user.${data.userId}.loginCount"
      value: 0
```

## Action Best Practices

### Use Meaningful Action Names

```yaml
# ✅ Good
do:
  type: "send_welcome_email"
  params:
    template: "new_user_welcome"
    delay: "5 minutes"

# ❌ Bad
do:
  type: "email"
  params:
    type: "welcome"
```

### Multiple Actions

Order actions logically:

```yaml
# ✅ Good - logical order
do:
  - type: "log_event"           # Log first
    params:
      event: "user_registered"
  - type: "update_database"     # Update data
    params:
      table: "users"
  - type: "send_email"          # Send notifications
    params:
      template: "welcome"
  - type: "track_analytics"     # Track metrics
    params:
      event: "registration_complete"

# ❌ Bad - random order
do:
  - type: "send_email"
  - type: "track_analytics"
  - type: "log_event"
  - type: "update_database"
```

### Action Parameters

Use descriptive parameter names:

```yaml
# ✅ Good
do:
  type: "send_notification"
  params:
    channels: ["email", "sms"]
    priority: "high"
    template: "urgent_alert"
    recipient: "${data.userEmail}"
    context:
      userName: "${data.userName}"
      alertType: "${data.alertType}"

# ❌ Bad
do:
  type: "notify"
  params:
    to: "${data.userEmail}"
    msg: "urgent_alert"
    high: true
```

## Comments and Documentation

### Inline Comments

Use YAML comments sparingly:

```yaml
- id: "complex-business-rule"
  # This rule handles the edge case where premium users
  # get special treatment during high-traffic periods
  on: "PURCHASE_ATTEMPT"
  if:
    and:
      # Check if user is premium (has special privileges)
      - field: "data.userType"
        operator: "EQ"
        value: "premium"
      # Only apply during peak hours (6 PM - 10 PM)
      - field: "utils.currentHour()"
        operator: "IN"
        value: [18, 19, 20, 21, 22]
  do:
    type: "process_premium_purchase"
    params:
      priority: "high"
      queue: "premium_users"
```

### Rule Documentation

Document complex business logic:

```yaml
- id: "fraud-detection-advanced"
  metadata:
    description: |
      Advanced fraud detection using multiple heuristics:
      1. Velocity checks (too many transactions too quickly)
      2. Geographic impossibility (locations too far apart)
      3. Amount anomalies (unusual spending patterns)
      4. Device fingerprinting (new/suspicious devices)
      
      This rule should be reviewed by the fraud team monthly.
    business_logic: |
      Score = velocity_score + geo_score + amount_score + device_score
      If score > 80: Block transaction
      If score > 60: Require additional verification
      If score > 40: Flag for review
    contact: "fraud-team@company.com"
    review_schedule: "monthly"
  on: "TRANSACTION_INITIATED"
  # ... rule implementation
```

## Import and Reusability

### Use Imports for Shared Config

```yaml
# rules/config/actions.yaml
actions:
  standard_logging: &standard_logging
    type: "log_message"
    params:
      level: "info"
      format: "json"
  
  error_notification: &error_notification
    type: "send_alert"
    params:
      channels: ["email", "slack"]
      priority: "high"

# rules/user-events.yaml
imports:
  - "./config/actions.yaml"
  
- id: "user-login"
  on: "USER_LOGIN"
  do:
    - <<: *standard_logging
      params:
        <<: *standard_logging.params
        message: "User ${data.userId} logged in"
    - type: "update_last_login"
      params:
        userId: "${data.userId}"
```

### Shared Conditions

```yaml
# rules/config/conditions.yaml
conditions:
  is_premium_user: &is_premium_user
    field: "data.userType"
    operator: "EQ"
    value: "premium"
  
  is_high_value: &is_high_value
    field: "data.amount"
    operator: "GT"
    value: 1000

# rules/billing.yaml
imports:
  - "./config/conditions.yaml"
  
- id: "premium-high-value"
  on: "PURCHASE_COMPLETE"
  if:
    and:
      - <<: *is_premium_user
      - <<: *is_high_value
  do:
    type: "award_bonus_points"
    params:
      multiplier: 2
```

## Migration Guide

### From Legacy Format

Convert multi-document format to list format:

```bash
# Install yq (YAML processor)
# https://github.com/mikefarah/yq

# Convert legacy format to list format
yq eval '. as $item ireduce ([]; . + $item)' legacy-rules.yaml > new-rules.yaml
```

### Validation After Migration

```bash
# Validate converted rules
bun run validate new-rules.yaml

# Compare behavior (run tests)
bun test -- rules/legacy.test.ts
bun test -- rules/new.test.ts
```

### Gradual Migration

1. Keep legacy files in `rules/legacy/`
2. Create new files in `rules/list-format/`
3. Test both formats work identically
4. Gradually migrate rules one by one
5. Remove legacy files once migration is complete

## Common Pitfalls

### ❌ Don't: Mixed Formatting

```yaml
- id: "rule1"
  on: "EVENT1"
  if:
      field: "data.value"  # Inconsistent indentation
    operator: "GT"
      value: 10
```

### ✅ Do: Consistent Formatting

```yaml
- id: "rule1"
  on: "EVENT1"
  if:
    field: "data.value"
    operator: "GT"
    value: 10
```

### ❌ Don't: Deep Nesting Without Structure

```yaml
- id: "complex-rule"
  if:
    and:
      - or:
          - and:
              - field: "data.a"
                operator: "EQ"
                value: 1
              - field: "data.b"
                operator: "EQ"
                value: 2
          - and:
              - field: "data.c"
                operator: "EQ"
                value: 3
              - field: "data.d"
                operator: "EQ"
                value: 4
```

### ✅ Do: Break Complex Rules

```yaml
- id: "condition-a-and-b"
  on: "EVENT"
  if:
    and:
      - field: "data.a"
        operator: "EQ"
        value: 1
      - field: "data.b"
        operator: "EQ"
        value: 2
  do:
    type: "fire_event"
    params:
      event: "CONDITION_A_B_MET"

- id: "condition-c-and-d"
  on: "EVENT"
  if:
    and:
      - field: "data.c"
        operator: "EQ"
        value: 3
      - field: "data.d"
        operator: "EQ"
        value: 4
  do:
    type: "fire_event"
    params:
      event: "CONDITION_C_D_MET"

- id: "final-complex-rule"
  on: "CONDITION_A_B_MET"
  if:
    field: "state.also_needs_c_d"
    operator: "EQ"
    value: true
  do:
    type: "final_action"
```

### ❌ Don't: Hardcode Values

```yaml
- id: "timezone-rule"
  if:
    field: "data.timezone"
    operator: "EQ"
    value: "America/New_York"  # Hardcoded
```

### ✅ Do: Use Configuration

```yaml
# config.yaml
default_timezone: "America/New_York"

# rules.yaml
imports:
  - "./config.yaml"
  
- id: "timezone-rule"
  if:
    field: "data.timezone"
    operator: "EQ"
    value: "${config.default_timezone}"
```

For more examples and patterns, see the [Examples Guide](./EXAMPLES_GUIDE.md).
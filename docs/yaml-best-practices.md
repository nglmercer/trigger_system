# YAML Format Best Practices

## Rule File Formats

The Trigger System supports multiple YAML formats for defining rules. This document explains the recommended approach and alternatives.

## ✅ Recommended: List Format

**Use a list format when defining multiple rules in a single file:**

```yaml
# rules/my-rules.yaml

- id: rule-1
  on: USER_LOGIN
  priority: 10
  if:
    field: data.username
    operator: EQ
    value: "admin"
  do:
    type: LOG
    params:
      message: "Admin logged in"

- id: rule-2
  on: GAME_OVER
  if:
    field: data.score
    operator: GT
    value: 100
  do:
    type: REWARD
    params:
      amount: 50
```

### Advantages:

- ✅ **Semantically correct** - clearly represents a collection of rules
- ✅ **No LSP warnings** - works seamlessly with YAML language servers
- ✅ **Better compatibility** - standard YAML list syntax
- ✅ **Clearer intent** - it's obvious you're defining multiple related items

---

## ⚠️ Supported (Legacy): Multi-Document Format

**Multi-document YAML is still supported for backwards compatibility:**

```yaml
# rules/my-rules.yaml

id: rule-1
on: USER_LOGIN
priority: 10
if:
  field: data.username
  operator: EQ
  value: "admin"
do:
  type: LOG
  params:
    message: "Admin logged in"

---
id: rule-2
on: GAME_OVER
if:
  field: data.score
  operator: GT
  value: 100
do:
  type: REWARD
  params:
    amount: 50
```

### Why Avoid?

- ⚠️ **LSP warnings** - requires `parseAllDocuments()` in parsers
- ⚠️ **Semantic ambiguity** - multi-document is typically for **independent** documents, not collections
- ⚠️ **Less common** - modern configurations prefer list syntax

### When to Use

Multi-document format is appropriate when:

- Migrating from legacy configuration files
- Each document represents a truly independent configuration (not just a list item)
- You need document-level metadata separation

---

## 📄 Single Rule Files

For files containing a single rule, both formats work equally well:

```yaml
# rules/admin-login.yaml

id: admin-login
on: USER_LOGIN
priority: 10
if:
  field: data.username
  operator: EQ
  value: "admin"
do:
  type: LOG
  params:
    message: "Admin logged in"
```

---

## LSP Support

The Trigger System LSP provides helpful hints:

- **Info hint** when multi-document format is detected
- **Suggestion** to migrate to list format for better compatibility
- **No errors** - both formats are fully supported

---

## Migration Guide

### Converting Multi-Document to List Format

**Before:**

```yaml
id: rule-1
on: EVENT_A
do: { type: LOG }

---
id: rule-2
on: EVENT_B
do: { type: LOG }
```

**After:**

```yaml
- id: rule-1
  on: EVENT_A
  do: { type: LOG }

- id: rule-2
  on: EVENT_B
  do: { type: LOG }
```

### Steps:

1. Remove `---` separators
2. Add `- ` (dash + space) before each rule's `id:` field
3. Indent all rule properties by 2 spaces
4. Verify with LSP (hints should disappear)

---

## Implementation Details

Both formats are supported by the `TriggerLoader`:

```typescript
// In loader.node.ts
const yamlDocs = parseAllDocuments(content);
const docs = yamlDocs.map((doc) => doc.toJS());

// Flatten both arrays and multi-doc into a single list
let flattenedDocs: any[] = [];
docs.forEach((d) => {
  if (Array.isArray(d)) {
    flattenedDocs.push(...d); // List format
  } else {
    flattenedDocs.push(d); // Multi-doc or single
  }
});
```

This ensures seamless backwards compatibility while guiding users toward best practices.

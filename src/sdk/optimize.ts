import type { RuleCondition, Action, ActionGroup } from "../types";

/**
 * Options for controlling deduplication behavior.
 */
export interface OptimizeOptions {
  /**
   * Whether to deduplicate conditions/actions.
   * Default: true (for conditions), false (for actions) - backward compatible
   * Set to false to keep all duplicates (useful for templates where repetition is intentional)
   */
  deduplicate?: boolean;
  /**
   * Unique identifier field to use for comparing items.
   * If provided, items with different IDs are considered different even if other fields match.
   * This allows intentional duplicates (same content, different IDs) to be preserved.
   */
  uniqueIdField?: string;
}

/**
 * Deduplicate items by a unique ID field.
 * Items without the ID field are compared by full content.
 */
function deduplicateById<T>(items: T[], idField: string): T[] {
  const withId = new Map<string, T>();
  const withoutId: T[] = [];
  
  for (const item of items) {
    const itemAny = item as Record<string, unknown>;
    const id = itemAny[idField];
    if (id !== undefined && id !== null) {
      const idStr = String(id);
      if (!withId.has(idStr)) {
        withId.set(idStr, item);
      }
    } else {
      withoutId.push(item);
    }
  }
  
  // For items without ID, deduplicate by full content
  const uniqueWithoutId = Array.from(new Set(withoutId.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
  
  return [...Array.from(withId.values()), ...uniqueWithoutId];
}

/**
 * Optimize conditions by deduplicating and flattening nested groups.
 */
export function optimizeCondition(
  cond: RuleCondition | RuleCondition[], 
  options: OptimizeOptions = {}
): RuleCondition | RuleCondition[] | undefined {
  const { deduplicate = true, uniqueIdField } = options;
  
  if (!cond) return undefined;
   
  if (Array.isArray(cond)) {
    const opt = cond.map(c => optimizeCondition(c, options)).filter((c): c is RuleCondition => c !== undefined);
    
    if (!deduplicate) {
      return opt.length === 0 ? undefined : (opt.length === 1 ? opt[0] : opt);
    }
    
    const unique = uniqueIdField 
      ? deduplicateById(opt, uniqueIdField) as RuleCondition[]
      : Array.from(new Set(opt.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
    
    return unique.length === 0 ? undefined : (unique.length === 1 ? unique[0] : unique);
  }

  // It's a single condition group
  if ('operator' in cond && 'conditions' in cond) {
    const group = cond as { operator: string; conditions: RuleCondition[] };
    let optChildren = optimizeCondition(group.conditions, options);
    if (!optChildren) return undefined;
    if (!Array.isArray(optChildren)) optChildren = [optChildren];

    // Inline children that are groups with the SAME operator
    const inlined: RuleCondition[] = [];
    for (const child of optChildren) {
      if ('operator' in child && 'conditions' in child && (child as { operator: string }).operator === group.operator) {
        inlined.push(...((child as { conditions: RuleCondition[] }).conditions));
      } else {
        inlined.push(child);
      }
    }

    // Deduplicate
    let uniqueChildren: RuleCondition[];
    if (!deduplicate) {
      uniqueChildren = inlined;
    } else if (uniqueIdField) {
      uniqueChildren = deduplicateById(inlined, uniqueIdField) as RuleCondition[];
    } else {
      uniqueChildren = Array.from(new Set(inlined.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
    }

    if (uniqueChildren.length === 0) return undefined;
    if (uniqueChildren.length === 1) return uniqueChildren[0];
    
    return { operator: group.operator as 'AND' | 'OR', conditions: uniqueChildren };
  }

  return cond;
}

/**
 * Optimize actions by deduplicating and flattening nested groups.
 */
export function optimizeAction(
  act: Action | ActionGroup | (Action | ActionGroup)[], 
  options: OptimizeOptions = {}
): Action | ActionGroup | (Action | ActionGroup)[] | undefined {
  const { deduplicate = false, uniqueIdField } = options;
  
  if (!act) return undefined;

  if (Array.isArray(act)) {
    const opt = act.map(a => optimizeAction(a, options)).filter((a): a is Action | ActionGroup => a !== undefined);
    
    if (!deduplicate) {
      // When not deduplicating, just flatten and return
      const flattened = opt.flatMap(a => Array.isArray(a) ? a : [a]);
      
      // Inline ActionGroups with mode ALL since array is implicitly ALL
      const inlined: (Action | ActionGroup)[] = [];
      for (const child of flattened) {
        if ('mode' in child && 'actions' in child && (child as ActionGroup).mode === 'ALL') {
          inlined.push(...((child as ActionGroup).actions));
        } else {
          inlined.push(child);
        }
      }

      if (inlined.length === 0) return undefined;
      if (inlined.length === 1) return inlined[0];
      return inlined;
    }
    
    // Flatten array inside array first
    const flattened = opt.flatMap(a => Array.isArray(a) ? a : [a]);
    
    // Inline ActionGroups with mode ALL
    const inlined: (Action | ActionGroup)[] = [];
    for (const child of flattened) {
      if ('mode' in child && 'actions' in child && (child as ActionGroup).mode === 'ALL') {
        inlined.push(...((child as ActionGroup).actions));
      } else {
        inlined.push(child);
      }
    }

    if (inlined.length === 0) return undefined;
    if (inlined.length === 1) return inlined[0];
    
    // Deduplicate
    let uniqueActions: (Action | ActionGroup)[];
    if (uniqueIdField) {
      uniqueActions = deduplicateById(inlined, uniqueIdField) as (Action | ActionGroup)[];
    } else {
      uniqueActions = Array.from(new Set(inlined.map(a => JSON.stringify(a)))).map(s => JSON.parse(s));
    }
    
    return uniqueActions;
  }

  // It's a single item
  if ('mode' in act && 'actions' in act) {
    const group = act as ActionGroup;
    let optChildren = optimizeAction(group.actions, options);
    if (!optChildren) return undefined;
    if (!Array.isArray(optChildren)) optChildren = [optChildren];

    // Inline children that are ActionGroups with the SAME mode
    const inlined: (Action | ActionGroup)[] = [];
    for (const child of optChildren) {
      if ('mode' in child && 'actions' in child && (child as ActionGroup).mode === group.mode) {
        inlined.push(...((child as ActionGroup).actions));
      } else {
        inlined.push(child);
      }
    }

    if (inlined.length === 0) return undefined;
    if (inlined.length === 1) return inlined[0];

    // Deduplicate
    let uniqueChildren: (Action | ActionGroup)[];
    if (!deduplicate) {
      uniqueChildren = inlined;
    } else if (uniqueIdField) {
      uniqueChildren = deduplicateById(inlined, uniqueIdField) as (Action | ActionGroup)[];
    } else {
      uniqueChildren = Array.from(new Set(inlined.map(a => JSON.stringify(a)))).map(s => JSON.parse(s));
    }

    return { mode: group.mode, actions: uniqueChildren };
  }

  return act;
}

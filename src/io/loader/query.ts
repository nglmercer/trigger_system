/**
 * TriggerLoader Query
 * 
 * Query utilities for finding rules.
 */

import type { TriggerRule } from "../../types";
import type { RegistryEntry } from "./types";

/**
 * Query operations for finding rules
 */
export class RuleQuery {
  /**
   * Find rules by tag
   */
  static findByTag(entries: IterableIterator<RegistryEntry>, tag: string): TriggerRule[] {
    const results: TriggerRule[] = [];
    const lowerTag = tag.toLowerCase();
    
    for (const entry of entries) {
      if (entry.rule.tags) {
        for (const t of entry.rule.tags) {
          if (t.toLowerCase() === lowerTag) {
            results.push(entry.rule);
            break;
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Find rules by event
   */
  static findByEvent(entries: IterableIterator<RegistryEntry>, event: string): TriggerRule[] {
    const results: TriggerRule[] = [];
    const lowerEvent = event.toLowerCase();
    
    for (const entry of entries) {
      if (entry.rule.on && entry.rule.on.toLowerCase() === lowerEvent) {
        results.push(entry.rule);
      }
    }
    
    return results;
  }

  /**
   * Find rules by name (partial match)
   */
  static findByName(entries: IterableIterator<RegistryEntry>, name: string): TriggerRule[] {
    const results: TriggerRule[] = [];
    const lowerName = name.toLowerCase();
    
    for (const entry of entries) {
      if (entry.rule.name && entry.rule.name.toLowerCase().includes(lowerName)) {
        results.push(entry.rule);
      }
    }
    
    return results;
  }

  /**
   * Find rules by predicate
   */
  static find(
    entries: IterableIterator<RegistryEntry>, 
    predicate: (rule: TriggerRule) => boolean
  ): TriggerRule[] {
    const results: TriggerRule[] = [];
    
    for (const entry of entries) {
      if (predicate(entry.rule)) {
        results.push(entry.rule);
      }
    }
    
    return results;
  }

  /**
   * Group rules by tag
   */
  static groupByTag(entries: IterableIterator<RegistryEntry>): Map<string, TriggerRule[]> {
    const tagMap = new Map<string, TriggerRule[]>();
    
    for (const entry of entries) {
      const rule = entry.rule;
      if (rule.tags) {
        for (const tag of rule.tags) {
          const existing = tagMap.get(tag) || [];
          existing.push(rule);
          tagMap.set(tag, existing);
        }
      }
    }
    
    return tagMap;
  }

  /**
   * Group rules by event
   */
  static groupByEvent(entries: IterableIterator<RegistryEntry>): Map<string, TriggerRule[]> {
    const eventMap = new Map<string, TriggerRule[]>();
    
    for (const entry of entries) {
      const rule = entry.rule;
      if (rule.on) {
        const existing = eventMap.get(rule.on) || [];
        existing.push(rule);
        eventMap.set(rule.on, existing);
      }
    }
    
    return eventMap;
  }

  /**
   * Enable a rule
   */
  static enable(rules: Map<string, RegistryEntry>, ruleId: string): TriggerRule {
    const entry = rules.get(ruleId);
    if (!entry) {
      throw new Error(`[RuleQuery] Rule "${ruleId}" not found`);
    }
    
    const updatedRule = { ...entry.rule, enabled: true };
    rules.set(ruleId, { ...entry, rule: updatedRule, modified: true });
    return updatedRule;
  }

  /**
   * Disable a rule
   */
  static disable(rules: Map<string, RegistryEntry>, ruleId: string): TriggerRule {
    const entry = rules.get(ruleId);
    if (!entry) {
      throw new Error(`[RuleQuery] Rule "${ruleId}" not found`);
    }
    
    const updatedRule = { ...entry.rule, enabled: false };
    rules.set(ruleId, { ...entry, rule: updatedRule, modified: true });
    return updatedRule;
  }

  /**
   * Toggle a rule
   */
  static toggle(rules: Map<string, RegistryEntry>, ruleId: string): TriggerRule {
    const entry = rules.get(ruleId);
    if (!entry) {
      throw new Error(`[RuleQuery] Rule "${ruleId}" not found`);
    }
    
    const updatedRule = { ...entry.rule, enabled: !entry.rule.enabled };
    rules.set(ruleId, { ...entry, rule: updatedRule, modified: true });
    return updatedRule;
  }
}

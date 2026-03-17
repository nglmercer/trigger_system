/**
 * Dependency Graph Utilities
 * Helper functions for extracting events from rules and other utilities
 */

import type { TriggerRule, TriggerAction, ActionGroup } from "../../types";

/**
 * Extract all events emitted by a rule.
 * Recursively traverses action groups and arrays to find EMIT_EVENT actions.
 */
export function getEmittedEvents(rule: TriggerRule): string[] {
  const events: string[] = [];
  
  const collectActions = (actionOrGroup: TriggerAction | TriggerAction[] | ActionGroup) => {
    if (Array.isArray(actionOrGroup)) {
      actionOrGroup.forEach(collectActions);
    } else if ('mode' in actionOrGroup && 'actions' in actionOrGroup) {
      // ActionGroup
      (actionOrGroup as ActionGroup).actions.forEach(collectActions);
    } else {
      // Single Action
      const action = actionOrGroup as TriggerAction;
      if (action.type === 'EMIT_EVENT' && action.params?.event) {
        const eventName = String(action.params.event);
        events.push(eventName);
      }
    }
  };
  
  if (rule.do) {
    const doActions = rule.do;
    if (Array.isArray(doActions)) {
      doActions.forEach(collectActions);
    } else {
      collectActions(doActions);
    }
  }
  
  return events;
}

/**
 * Build an event-to-rules mapping from a list of rules.
 * Maps each event to the list of rule IDs that listen to it.
 */
export function buildEventToRulesMap(rules: TriggerRule[]): Record<string, string[]> {
  const eventToRules: Record<string, string[]> = {};
  
  for (const rule of rules) {
    if (!eventToRules[rule.on]) {
      eventToRules[rule.on] = [];
    }
    eventToRules[rule.on]!.push(rule.id);
  }
  
  return eventToRules;
}

/**
 * Get rules that listen to a specific event
 */
export function getRulesListeningToEvent(rules: TriggerRule[], event: string): TriggerRule[] {
  return rules.filter(rule => rule.on === event);
}

/**
 * Get rules that emit a specific event
 */
export function getRulesEmittingEvent(rules: TriggerRule[], event: string): TriggerRule[] {
  return rules.filter(rule => {
    const emittedEvents = getEmittedEvents(rule);
    return emittedEvents.includes(event);
  });
}

/**
 * Find rules that are orphaned (no dependencies in or out)
 */
export function findOrphanedRules(
  rules: TriggerRule[],
  adjacencyList: Record<string, string[]>,
  reverseAdjacencyList: Record<string, string[]>
): TriggerRule[] {
  const orphaned: TriggerRule[] = [];
  const ruleIdsWithEdges = new Set<string>();
  
  // Rules that have outgoing edges (emit events that others listen to)
  for (const [sourceId, targets] of Object.entries(adjacencyList)) {
    if (targets.length > 0) {
      ruleIdsWithEdges.add(sourceId);
    }
  }
  
  // Rules that have incoming edges (listen to events emitted by others)
  for (const [targetId, sources] of Object.entries(reverseAdjacencyList)) {
    if (sources.length > 0) {
      ruleIdsWithEdges.add(targetId);
    }
  }
  
  // Rules not in any edge
  for (const rule of rules) {
    if (!ruleIdsWithEdges.has(rule.id)) {
      orphaned.push(rule);
    }
  }
  
  return orphaned;
}

/**
 * Check if a rule has a valid 'on' event
 */
export function isRuleValid(rule: TriggerRule): { valid: boolean; error?: string } {
  if (!rule.on || rule.on.trim() === '') {
    return { valid: false, error: `Rule "${rule.id}" has no 'on' event specified` };
  }
  return { valid: true };
}

/**
 * Create a rule map for quick lookups
 */
export function createRuleMap(rules: TriggerRule[]): Map<string, TriggerRule> {
  const ruleMap = new Map<string, TriggerRule>();
  for (const rule of rules) {
    ruleMap.set(rule.id, rule);
  }
  return ruleMap;
}

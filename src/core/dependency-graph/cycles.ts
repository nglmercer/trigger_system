/**
 * Cycle Detection Module
 * Functions for detecting cycles in the dependency graph
 */

import type { TriggerRule } from "../../types";
import type { DependencyGraph, CycleInfo } from "./types";
import { createRuleMap, getEmittedEvents } from "./utils";

/**
 * Detect cycles in a list of rules (legacy method for compatibility)
 * @returns Array of cycles, where each cycle is an array of Rule IDs.
 */
export function detectCycles(rules: TriggerRule[]): string[][] {
  const graph = buildSimpleGraph(rules);
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const resStack = new Set<string>();
  
  const dfs = (nodeId: string, path: string[]) => {
    visited.add(nodeId);
    resStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = graph[nodeId] || [];
    for (const neighbor of neighbors) {
      // Check for self-loop
      if (neighbor === nodeId) {
        cycles.push([nodeId, neighbor]);
        continue;
      }
      
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (resStack.has(neighbor)) {
        // Cycle detected!
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          cycles.push([...path.slice(cycleStartIndex), neighbor]);
        }
      }
    }
    
    resStack.delete(nodeId);
  };
  
  for (const rule of rules) {
    if (!visited.has(rule.id)) {
      dfs(rule.id, []);
    }
  }
  
  return cycles;
}

/**
 * Build a simple adjacency list from rules (for cycle detection)
 */
function buildSimpleGraph(rules: TriggerRule[]): Record<string, string[]> {
  const adjacencyList: Record<string, string[]> = {};
  const eventToRules: Record<string, string[]> = {};
  
  // Index rules by event
  for (const rule of rules) {
    if (!eventToRules[rule.on]) {
      eventToRules[rule.on] = [];
    }
    eventToRules[rule.on]!.push(rule.id);
    adjacencyList[rule.id] = [];
  }
  
  // Build edges
  for (const rule of rules) {
    const emittedEvents = getEmittedEvents(rule);
    const targets: string[] = [];
    
    for (const event of emittedEvents) {
      const triggeredRuleIds = eventToRules[event] || [];
      for (const targetId of triggeredRuleIds) {
        // Include all targets including self-loops for cycle detection
        targets.push(targetId);
      }
    }
    
    adjacencyList[rule.id] = [...new Set(targets)];
  }
  
  return adjacencyList;
}

/**
 * Detect cycles with full rule information
 */
export function detectCyclesWithInfo(rules: TriggerRule[], graph: DependencyGraph): CycleInfo[] {
  const cycles: CycleInfo[] = [];
  const visited = new Set<string>();
  const resStack = new Set<string>();
  const ruleMap = createRuleMap(rules);
  
  const dfs = (nodeId: string, path: string[]) => {
    visited.add(nodeId);
    resStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = graph.adjacencyList[nodeId] || [];
    for (const neighbor of neighbors) {
      // Check for self-loop
      if (neighbor === nodeId) {
        const selfRule = ruleMap.get(nodeId);
        if (selfRule) {
          cycles.push({
            cycleId: `cycle-${cycles.length + 1}`,
            rules: [selfRule, selfRule],
            ruleIds: [nodeId, neighbor],
            events: [],
            length: 2
          });
        }
        continue;
      }
      
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (resStack.has(neighbor)) {
        // Cycle detected!
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycleRuleIds = [...path.slice(cycleStartIndex), neighbor];
          const cycleRules = cycleRuleIds.map(id => ruleMap.get(id)!);
          const events: string[] = [];
          
          // Extract events involved in cycle
          for (let i = 0; i < cycleRuleIds.length - 1; i++) {
            const edge = graph.edges.find(
              e => e.sourceRuleId === cycleRuleIds[i] && e.targetRuleId === cycleRuleIds[i + 1]
            );
            if (edge) {
              events.push(edge.emittedEvent);
            }
          }
          
          cycles.push({
            cycleId: `cycle-${cycles.length + 1}`,
            rules: cycleRules,
            ruleIds: cycleRuleIds,
            events,
            length: cycleRuleIds.length
          });
        }
      }
    }
    
    resStack.delete(nodeId);
  };
  
  for (const rule of rules) {
    if (!visited.has(rule.id)) {
      dfs(rule.id, []);
    }
  }
  
  return cycles;
}

/**
 * Check if adding a rule would create a cycle
 */
export function wouldCreateCycle(
  existingRules: TriggerRule[],
  newRule: TriggerRule
): boolean {
  const allRules = [...existingRules, newRule];
  const cycles = detectCycles(allRules);
  return cycles.length > 0;
}

/**
 * Get all rules involved in any cycle
 */
export function getRulesInCycles(rules: TriggerRule[]): Set<string> {
  const cycles = detectCycles(rules);
  const ruleIds = new Set<string>();
  
  for (const cycle of cycles) {
    // cycle includes the repeated start node at the end
    for (let i = 0; i < cycle.length - 1; i++) {
      const ruleId = cycle[i];
      if (ruleId) {
        ruleIds.add(ruleId);
      }
    }
  }
  
  return ruleIds;
}

/**
 * Calculate maximum cycle length
 */
export function getMaxCycleLength(rules: TriggerRule[]): number {
  const cycles = detectCycles(rules);
  if (cycles.length === 0) return 0;
  
  return Math.max(...cycles.map(c => c.length));
}

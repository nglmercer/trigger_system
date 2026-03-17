/**
 * Dependency Graph Builder
 * Functions for building the dependency graph from rules
 */

import type { TriggerRule } from "../../types";
import type { DependencyGraph, DependencyNode, DependencyEdge } from "./types";
import { getEmittedEvents, buildEventToRulesMap, createRuleMap } from "./utils";

/**
 * Build complete dependency graph with full rule information
 * @returns JSON-serializable DependencyGraph object
 */
export function buildGraph(rules: TriggerRule[]): DependencyGraph {
  const nodes: DependencyNode[] = [];
  const edges: DependencyEdge[] = [];
  const adjacencyList: Record<string, string[]> = {};
  const reverseAdjacencyList: Record<string, string[]> = {};
  
  // Event -> [Rule IDs] mapping
  const eventToRules = buildEventToRulesMap(rules);
  
  // Index rules by ID
  const ruleMap = createRuleMap(rules);
  
  // Phase 1: Initialize adjacency lists
  for (const rule of rules) {
    adjacencyList[rule.id] = [];
  }
  
  // Phase 2: Build edges based on emitted events
  for (const rule of rules) {
    const emittedEvents = getEmittedEvents(rule);
    const targets: string[] = [];
    
    for (const event of emittedEvents) {
      const triggeredRuleIds = eventToRules[event] || [];
      
      for (const targetId of triggeredRuleIds) {
        // Avoid self-loops in reverse adjacency for now
        if (targetId !== rule.id) {
          if (!reverseAdjacencyList[targetId]) {
            reverseAdjacencyList[targetId] = [];
          }
          reverseAdjacencyList[targetId].push(rule.id);
        }
        
        // Create edge with full rule information
        const targetRule = ruleMap.get(targetId);
        if (targetRule) {
          edges.push({
            sourceRuleId: rule.id,
            targetRuleId: targetId,
            emittedEvent: event,
            sourceRule: rule,
            targetRule: targetRule
          });
        }
        
        targets.push(targetId);
      }
    }
    
    // Deduplicate targets
    adjacencyList[rule.id] = [...new Set(targets)];
  }
  
  // Phase 3: Build nodes with full information
  for (const rule of rules) {
    const emits = getEmittedEvents(rule);
    nodes.push({
      ruleId: rule.id,
      rule: rule,
      listensTo: [rule.on],
      emits: emits
    });
  }
  
  return {
    nodes,
    edges,
    adjacencyList,
    reverseAdjacencyList
  };
}

/**
 * Build an adjacency list from rules (simplified version)
 */
export function buildAdjacencyList(rules: TriggerRule[]): Record<string, string[]> {
  const graph = buildGraph(rules);
  return graph.adjacencyList;
}

/**
 * Build a reverse adjacency list from rules (simplified version)
 */
export function buildReverseAdjacencyList(rules: TriggerRule[]): Record<string, string[]> {
  const graph = buildGraph(rules);
  return graph.reverseAdjacencyList;
}

/**
 * Get all edges in the graph
 */
export function getAllEdges(rules: TriggerRule[]): DependencyEdge[] {
  const graph = buildGraph(rules);
  return graph.edges;
}

/**
 * Get all nodes in the graph
 */
export function getAllNodes(rules: TriggerRule[]): DependencyNode[] {
  const graph = buildGraph(rules);
  return graph.nodes;
}

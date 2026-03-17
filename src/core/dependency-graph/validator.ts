/**
 * Validation Module
 * Functions for validating rules and their dependencies
 */

import type { TriggerRule } from "../../types";
import type { DependencyAnalysisResult, ValidationResult } from "./types";
import { buildGraph } from "./builder";
import { detectCyclesWithInfo } from "./cycles";
import { findOrphanedRules, isRuleValid } from "./utils";

/**
 * Validate rules and return validation result
 */
export function validate(rules: TriggerRule[]): ValidationResult {
  const analysis = analyze(rules);
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for cycles
  if (analysis.cycles.length > 0) {
    for (const cycle of analysis.cycles) {
      errors.push(
        `Circular dependency detected: ${cycle.ruleIds.join(' -> ')}`
      );
    }
  }
  
  // Check for orphaned rules
  if (analysis.orphanedRules.length > 0) {
    const orphanedIds = analysis.orphanedRules.map(r => r.id).join(', ');
    warnings.push(`Orphaned rules (no dependencies): ${orphanedIds}`);
  }
  
  // Check for rules with no 'on' event
  for (const rule of rules) {
    const validation = isRuleValid(rule);
    if (!validation.valid) {
      errors.push(validation.error!);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    analysis
  };
}

/**
 * Complete dependency analysis with JSON export
 * @returns DependencyAnalysisResult with full information
 */
export function analyze(rules: TriggerRule[]): DependencyAnalysisResult {
  const graph = buildGraph(rules);
  const cycles = detectCyclesWithInfo(rules, graph);
  const orphanedRules = findOrphanedRules(
    rules,
    graph.adjacencyList,
    graph.reverseAdjacencyList
  );
  const potentialInfiniteLoops = cycles.filter(c => c.length > 0);
  
  // Build raw data for JSON export
  const eventToRules: Record<string, string[]> = {};
  for (const node of graph.nodes) {
    for (const event of node.listensTo) {
      if (!eventToRules[event]) {
        eventToRules[event] = [];
      }
      eventToRules[event].push(node.ruleId);
    }
  }
  
  return {
    graph,
    cycles,
    orphanedRules,
    potentialInfiniteLoops,
    summary: {
      totalRules: rules.length,
      totalEdges: graph.edges.length,
      cyclesCount: cycles.length,
      orphanedCount: orphanedRules.length,
      maxCycleLength: cycles.length > 0 ? Math.max(...cycles.map(c => c.length)) : 0
    },
    raw: {
      rules: rules,
      adjacencyList: graph.adjacencyList,
      eventToRules
    }
  };
}

/**
 * Check if rules are valid (no cycles)
 */
export function isValid(rules: TriggerRule[]): boolean {
  return validate(rules).valid;
}

/**
 * Get all validation errors for rules
 */
export function getErrors(rules: TriggerRule[]): string[] {
  return validate(rules).errors;
}

/**
 * Get all validation warnings for rules
 */
export function getWarnings(rules: TriggerRule[]): string[] {
  return validate(rules).warnings;
}

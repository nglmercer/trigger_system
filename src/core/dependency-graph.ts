/**
 * Dependency Graph Module
 * 
 * This is the main entry point that re-exports all functionality from the
 * modular sub-modules for backwards compatibility.
 * 
 * New code should import from 'src/core/dependency-graph/index.ts' for better
 * tree-shaking and type safety.
 */

import type { TriggerRule, TriggerAction, ActionGroup } from "../types";

// Re-export types from sub-modules
export type {
  DependencyEdge,
  DependencyNode,
  DependencyGraph,
  CycleInfo,
  DependencyAnalysisResult,
  ValidationResult,
  RuleDependencies,
  EventToRulesMap
} from './dependency-graph/types';

// Re-export utilities
export {
  getEmittedEvents,
  buildEventToRulesMap,
  getRulesListeningToEvent,
  getRulesEmittingEvent,
  findOrphanedRules,
  isRuleValid,
  createRuleMap
} from './dependency-graph/utils';

// Re-export builder functions
export {
  buildGraph,
  buildAdjacencyList,
  buildReverseAdjacencyList,
  getAllEdges,
  getAllNodes
} from './dependency-graph/builder';

// Re-export cycle detection functions
export {
  detectCycles,
  detectCyclesWithInfo,
  wouldCreateCycle,
  getRulesInCycles,
  getMaxCycleLength
} from './dependency-graph/cycles';

// Re-export validator functions
export {
  validate,
  analyze,
  isValid,
  getErrors,
  getWarnings
} from './dependency-graph/validator';

// Re-export analyzer class
export { DependencyAnalyzer } from './dependency-graph/analyzer';

/**
 * Legacy re-exports for backwards compatibility
 * @deprecated Use named imports from this module instead
 */

// Keep legacy types for compatibility
export type { TriggerRule, TriggerAction, ActionGroup } from "../types";

/**
 * Legacy interface aliases - now delegate to modular types
 */
export interface LegacyDependencyEdge {
  sourceRuleId: string;
  targetRuleId: string;
  emittedEvent: string;
  sourceRule: TriggerRule;
  targetRule: TriggerRule;
}

export interface LegacyDependencyNode {
  ruleId: string;
  rule: TriggerRule;
  listensTo: string[];
  emits: string[];
}

export interface LegacyDependencyGraph {
  nodes: LegacyDependencyNode[];
  edges: LegacyDependencyEdge[];
  adjacencyList: Record<string, string[]>;
  reverseAdjacencyList: Record<string, string[]>;
}

export interface LegacyCycleInfo {
  cycleId: string;
  rules: TriggerRule[];
  ruleIds: string[];
  events: string[];
  length: number;
}

export interface LegacyDependencyAnalysisResult {
  graph: LegacyDependencyGraph;
  cycles: LegacyCycleInfo[];
  orphanedRules: TriggerRule[];
  potentialInfiniteLoops: LegacyCycleInfo[];
  summary: {
    totalRules: number;
    totalEdges: number;
    cyclesCount: number;
    orphanedCount: number;
    maxCycleLength: number;
  };
  raw: {
    rules: TriggerRule[];
    adjacencyList: Record<string, string[]>;
    eventToRules: Record<string, string[]>;
  };
}

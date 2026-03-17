/**
 * Dependency Graph Types
 * JSON-serializable types for dependency analysis results
 */

import type { TriggerRule, ActionGroup } from "../../types";

/** Alias for TriggerAction */
export type { TriggerRule, ActionGroup as TriggerActionGroup };

/** Represents a single dependency edge in the graph */
export interface DependencyEdge {
  sourceRuleId: string;
  targetRuleId: string;
  emittedEvent: string;
  sourceRule: TriggerRule;
  targetRule: TriggerRule;
}

/** Represents a node in the dependency graph */
export interface DependencyNode {
  ruleId: string;
  rule: TriggerRule;
  listensTo: string[];
  emits: string[];
}

/** Complete dependency graph structure */
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  adjacencyList: Record<string, string[]>;
  reverseAdjacencyList: Record<string, string[]>;
}

/** Cycle information with full rule details */
export interface CycleInfo {
  cycleId: string;
  rules: TriggerRule[];
  ruleIds: string[];
  events: string[];
  length: number;
}

/** Complete analysis result */
export interface DependencyAnalysisResult {
  graph: DependencyGraph;
  cycles: CycleInfo[];
  orphanedRules: TriggerRule[];
  potentialInfiniteLoops: CycleInfo[];
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

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  analysis: DependencyAnalysisResult;
}

/** Rule dependencies result */
export interface RuleDependencies {
  dependsOn: TriggerRule[];
  dependedBy: TriggerRule[];
  graph: DependencyGraph;
}

/** Event to rules mapping */
export type EventToRulesMap = Record<string, string[]>;

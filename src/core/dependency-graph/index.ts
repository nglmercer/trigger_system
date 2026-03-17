/**
 * Dependency Graph Module
 * Main entry point for the dependency graph analysis system
 */

// Re-export types
export type {
  DependencyEdge,
  DependencyNode,
  DependencyGraph,
  CycleInfo,
  DependencyAnalysisResult,
  ValidationResult,
  RuleDependencies,
  EventToRulesMap
} from './types';

// Re-export utilities
export {
  getEmittedEvents,
  buildEventToRulesMap,
  getRulesListeningToEvent,
  getRulesEmittingEvent,
  findOrphanedRules,
  isRuleValid,
  createRuleMap
} from './utils';

// Re-export builder
export {
  buildGraph,
  buildAdjacencyList,
  buildReverseAdjacencyList,
  getAllEdges,
  getAllNodes
} from './builder';

// Re-export cycles
export {
  detectCycles,
  detectCyclesWithInfo,
  wouldCreateCycle,
  getRulesInCycles,
  getMaxCycleLength
} from './cycles';

// Re-export validator
export {
  validate,
  analyze,
  isValid,
  getErrors,
  getWarnings
} from './validator';

// Main DependencyAnalyzer class (for backwards compatibility)
export { DependencyAnalyzer } from './analyzer';

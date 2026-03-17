/**
 * DependencyAnalyzer
 * Analyzes static rules to detect circular dependencies (infinite loops)
 * and provides detailed JSON export with full rule information.
 * 
 * This class provides backwards compatibility while delegating to modular functions.
 * 
 * Graph:
 * - Nodes: Rules
 * - Edges: Rule A -> Rule B (if A emits an event that B listens for)
 */

import type { TriggerRule } from "../../types";
import type { 
  DependencyGraph, 
  DependencyAnalysisResult,
  RuleDependencies,
  ValidationResult 
} from "./types";
import { 
  buildGraph, 
  buildAdjacencyList, 
  buildReverseAdjacencyList,
  getAllEdges,
  getAllNodes
} from "./builder";
import { 
  detectCycles as detectCyclesSimple,
  detectCyclesWithInfo,
  wouldCreateCycle,
  getRulesInCycles,
  getMaxCycleLength
} from "./cycles";
import { 
  validate as validateRules,
  analyze as analyzeRules,
  isValid,
  getErrors,
  getWarnings
} from "./validator";
import { 
  getRulesListeningToEvent, 
  getRulesEmittingEvent,
  getEmittedEvents,
  createRuleMap
} from "./utils";

/**
 * DependencyAnalyzer - Main class for dependency analysis
 * Provides backwards compatibility for existing code
 */
export class DependencyAnalyzer {
  
  /**
   * Build complete dependency graph with full rule information
   * @returns JSON-serializable DependencyGraph object
   */
  static buildGraph(rules: TriggerRule[]): DependencyGraph {
    return buildGraph(rules);
  }

  /**
   * Detects cycles in a list of rules (legacy method for compatibility)
   * @returns Array of cycles, where each cycle is an array of Rule IDs.
   */
  static detectCycles(rules: TriggerRule[]): string[][] {
    return detectCyclesSimple(rules);
  }

  /**
   * Complete dependency analysis with JSON export
   * @returns DependencyAnalysisResult with full information
   */
  static analyze(rules: TriggerRule[]): DependencyAnalysisResult {
    return analyzeRules(rules);
  }

  /**
   * Export dependency graph as JSON string
   */
  static toJSON(rules: TriggerRule[]): string {
    const analysis = analyzeRules(rules);
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Export dependency graph as compact JSON string
   */
  static toJSONCompact(rules: TriggerRule[]): string {
    const analysis = analyzeRules(rules);
    return JSON.stringify(analysis);
  }

  /**
   * Get dependency info for a specific rule
   */
  static getRuleDependencies(
    rules: TriggerRule[], 
    ruleId: string
  ): RuleDependencies | null {
    const graph = buildGraph(rules);
    const ruleMap = createRuleMap(rules);
    
    const sourceRule = ruleMap.get(ruleId);
    if (!sourceRule) {
      return null;
    }
    
    const dependsOnIds = graph.adjacencyList[ruleId] || [];
    const dependedByIds = graph.reverseAdjacencyList[ruleId] || [];
    
    return {
      dependsOn: dependsOnIds.map(id => ruleMap.get(id)!).filter(Boolean),
      dependedBy: dependedByIds.map(id => ruleMap.get(id)!).filter(Boolean),
      graph
    };
  }

  /**
   * Get all rules that listen to a specific event
   */
  static getRulesListeningToEvent(rules: TriggerRule[], event: string): TriggerRule[] {
    return getRulesListeningToEvent(rules, event);
  }

  /**
   * Get all rules that emit a specific event
   */
  static getRulesEmittingEvent(rules: TriggerRule[], event: string): TriggerRule[] {
    return getRulesEmittingEvent(rules, event);
  }

  /**
   * Validate rules and return validation result
   */
  static validate(rules: TriggerRule[]): ValidationResult {
    return validateRules(rules);
  }

  // Legacy internal method - now uses modular functions
  private static getEmittedEvents(rule: TriggerRule): string[] {
    return getEmittedEvents(rule);
  }
}

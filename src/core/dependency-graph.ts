import type { TriggerRule, TriggerAction, ActionGroup } from "../types";

/**
 * Dependency Graph Types
 * JSON-serializable types for dependency analysis results
 */

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

/**
 * DependencyAnalyzer
 * Analyzes static rules to detect circular dependencies (infinite loops)
 * and provides detailed JSON export with full rule information.
 *
 * Graph:
 * - Nodes: Rules
 * - Edges: Rule A -> Rule B (if A emits an event that B listens for)
 */
export class DependencyAnalyzer {

  /**
   * Build complete dependency graph with full rule information
   * @returns JSON-serializable DependencyGraph object
   */
  static buildGraph(rules: TriggerRule[]): DependencyGraph {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const adjacencyList: Record<string, string[]> = {};
    const reverseAdjacencyList: Record<string, string[]> = {};
    
    // Event -> [Rule IDs] mapping
    const eventToRules: Record<string, string[]> = {};
    
    // Index rules by ID
    const ruleMap = new Map<string, TriggerRule>();
    
    // Phase 1: Index rules and their event listeners
    for (const rule of rules) {
      ruleMap.set(rule.id, rule);
      
      // Track which rules listen to which events
      if (!eventToRules[rule.on]) {
        eventToRules[rule.on] = [];
      }
      eventToRules[rule.on]!.push(rule.id);
      
      // Initialize adjacency lists
      adjacencyList[rule.id] = [];
    }
    
    // Phase 2: Build edges based on emitted events
    for (const rule of rules) {
      const emittedEvents = this.getEmittedEvents(rule);
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
      const emits = this.getEmittedEvents(rule);
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
   * Detects cycles in a list of rules (legacy method for compatibility)
   * @returns Array of cycles, where each cycle is an array of Rule IDs.
   */
  static detectCycles(rules: TriggerRule[]): string[][] {
    const graph = this.buildGraph(rules);
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const resStack = new Set<string>();
    
    const dfs = (nodeId: string, path: string[]) => {
      visited.add(nodeId);
      resStack.add(nodeId);
      path.push(nodeId);
      
      const neighbors = graph.adjacencyList[nodeId] || [];
      for (const neighbor of neighbors) {
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
   * Complete dependency analysis with JSON export
   * @returns DependencyAnalysisResult with full information
   */
  static analyze(rules: TriggerRule[]): DependencyAnalysisResult {
    const graph = this.buildGraph(rules);
    const cycles = this.detectCyclesInfo(rules, graph);
    const orphanedRules = this.findOrphanedRules(rules, graph);
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
   * Get cycles with full rule information
   */
  private static detectCyclesInfo(rules: TriggerRule[], graph: DependencyGraph): CycleInfo[] {
    const cycles: CycleInfo[] = [];
    const visited = new Set<string>();
    const resStack = new Set<string>();
    const ruleMap = new Map<string, TriggerRule>();
    
    for (const rule of rules) {
      ruleMap.set(rule.id, rule);
    }
    
    const dfs = (nodeId: string, path: string[]) => {
      visited.add(nodeId);
      resStack.add(nodeId);
      path.push(nodeId);
      
      const neighbors = graph.adjacencyList[nodeId] || [];
      for (const neighbor of neighbors) {
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
   * Find orphaned rules (rules that no other rule depends on and don't depend on others)
   */
  private static findOrphanedRules(rules: TriggerRule[], graph: DependencyGraph): TriggerRule[] {
    const orphaned: TriggerRule[] = [];
    const ruleIdsWithEdges = new Set<string>();
    
    // Rules that have outgoing edges (emit events that others listen to)
    for (const [sourceId, targets] of Object.entries(graph.adjacencyList)) {
      if (targets.length > 0) {
        ruleIdsWithEdges.add(sourceId);
      }
    }
    
    // Rules that have incoming edges (listen to events emitted by others)
    for (const [targetId, sources] of Object.entries(graph.reverseAdjacencyList)) {
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
   * Export dependency graph as JSON string
   */
  static toJSON(rules: TriggerRule[]): string {
    const analysis = this.analyze(rules);
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Export dependency graph as compact JSON string
   */
  static toJSONCompact(rules: TriggerRule[]): string {
    const analysis = this.analyze(rules);
    return JSON.stringify(analysis);
  }

  /**
   * Get dependency info for a specific rule
   */
  static getRuleDependencies(rules: TriggerRule[], ruleId: string): {
    dependsOn: TriggerRule[];
    dependedBy: TriggerRule[];
    graph: DependencyGraph;
  } | null {
    const graph = this.buildGraph(rules);
    const ruleMap = new Map<string, TriggerRule>();
    
    for (const rule of rules) {
      ruleMap.set(rule.id, rule);
    }
    
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
    return rules.filter(rule => rule.on === event);
  }

  /**
   * Get all rules that emit a specific event
   */
  static getRulesEmittingEvent(rules: TriggerRule[], event: string): TriggerRule[] {
    return rules.filter(rule => {
      const emittedEvents = this.getEmittedEvents(rule);
      return emittedEvents.includes(event);
    });
  }

  /**
   * Validate rules and return validation result
   */
  static validate(rules: TriggerRule[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    analysis: DependencyAnalysisResult;
  } {
    const analysis = this.analyze(rules);
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
      if (!rule.on || rule.on.trim() === '') {
        errors.push(`Rule "${rule.id}" has no 'on' event specified`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      analysis
    };
  }

  private static getEmittedEvents(rule: TriggerRule): string[] {
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
}

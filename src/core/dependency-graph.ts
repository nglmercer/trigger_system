import type { TriggerRule, TriggerAction, ActionGroup } from "../types";

/**
 * DependencyAnalyzer
 * Analyzes static rules to detect circular dependencies (infinite loops).
 *
 * Graph:
 * - Nodes: Rules
 * - Edges: Rule A -> Rule B (if A emits an event that B listens for)
 */
export class DependencyAnalyzer {
    
    /**
     * Detects cycles in a list of rules.
     * @returns Array of cycles, where each cycle is an array of Rule IDs.
     */
    static detectCycles(rules: TriggerRule[]): string[][] {
        const adjacencyList = new Map<string, string[]>();
        const ruleMap = new Map<string, TriggerRule>();
        
        // 1. Index Rules by Event Listener
        // Event -> [Rule IDs]
        const listeners = new Map<string, string[]>();
        for (const rule of rules) {
            ruleMap.set(rule.id, rule);
            if (!listeners.has(rule.on)) {
                listeners.set(rule.on, []);
            }
            listeners.get(rule.on)!.push(rule.id);
        }

        // 2. Build Graph
        for (const rule of rules) {
            const emittedEvents = this.getEmittedEvents(rule);
            const targets: string[] = [];
            
            for (const event of emittedEvents) {
                const triggeredRules = listeners.get(event) || [];
                targets.push(...triggeredRules);
            }
            
            // Deduplicate
            adjacencyList.set(rule.id, Array.from(new Set(targets)));
        }

        // 3. Find Cycles (DFS)
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const resStack = new Set<string>();

        const dfs = (nodeId: string, path: string[]) => {
            visited.add(nodeId);
            resStack.add(nodeId);
            path.push(nodeId);

            const neighbors = adjacencyList.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, [...path]);
                } else if (resStack.has(neighbor)) {
                    // Cycle detected!
                    // Extract the cycle portion from path
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
                    // Check for dynamic expressions vs static strings
                    // If it's "${...}", we can't be sure, but we can warn.
                    // For static analysis, we assume strict matches if logic permits.
                    // But here we just take the string.
                    events.push(action.params.event);
                }
            }
        };

        if (rule.do) {
            collectActions(rule.do);
        }
        
        return events;
    }
}

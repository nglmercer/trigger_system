import { useCallback } from 'react';
import type { Connection, Edge, Node } from '@xyflow/react';
import { NodeType, NodeHandle, BranchType } from '../constants';
import type { AppNode } from '../types';

/**
 * Hook for validating node connections
 */
export function useConnectionValidation(nodes: AppNode[], edges: Edge[]) {
  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return false;
    if (targetNode.type === NodeType.EVENT) return false;
    
    // ============================================================
    // RULE 0: Prevent duplicate edges (Intelligent Edge Prevention)
    // ============================================================
    // Check if there's already an edge between these nodes with the same handles
    const existingEdge = edges.find(edge => 
      edge.source === connection.source && 
      edge.target === connection.target &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
    );
    if (existingEdge) {
      return false; // Prevent duplicate edge
    }
    
    // Special case: If connecting to same target but different handle, allow (like else-output vs condition-output)
    const existingEdgeToTarget = edges.find(edge => 
      edge.source === connection.source && 
      edge.target === connection.target
    );
    // For Condition nodes, allow multiple outputs to same target if they're different handles
    if (sourceNode.type === NodeType.CONDITION && existingEdgeToTarget) {
      // Allow if using different source handles (condition-output vs else-output)
      if (existingEdgeToTarget.sourceHandle !== connection.sourceHandle) {
        // Different handles, allow
      } else {
        return false; // Same handle to same target, prevent duplicate
      }
    } else if (existingEdgeToTarget) {
      // For DO nodes, allow multiple outputs to different targets (e.g., DoNode -> Action and DoNode -> ActionGroup)
      if (sourceNode.type === NodeType.DO) {
        // Allow multiple outputs from DO node to different targets
      } else {
        // For other node types, prevent multiple edges to same target
        return false;
      }
    }
    
    // Node Category Helpers
    const isTargetCondition = targetNode.type === NodeType.CONDITION || targetNode.type === NodeType.CONDITION_GROUP;

    // ============================================================
    // RULE 1: Event Node - Can only have ONE single connection
    // ============================================================
    if (sourceNode.type === NodeType.EVENT) {
      const existingOutgoingEdges = edges.filter(e => e.source === sourceNode.id);
      if (existingOutgoingEdges.length >= 1) {
        return false; // Event can only have one outgoing connection
      }
    }

    // ============================================================
    // RULE 2: ActionGroup - Input accepts from Event or DO node (for running actions)
    // ============================================================
    if (targetNode.type === NodeType.ACTION_GROUP && connection.targetHandle === NodeHandle.ACTION_GROUP_INPUT) {
      // ActionGroup input can accept from Event (for triggering the action group)
      // or from DO node (explicit DO path)
      if (sourceNode.type !== NodeType.EVENT && sourceNode.type !== NodeType.DO) {
        return false;
      }
    }

    // ============================================================
    // RULE 3: Condition Group - Output connects to Conditions
    // ConditionGroup can connect to multiple Conditions in sequence
    // ============================================================
    if (sourceNode.type === NodeType.CONDITION_GROUP) {
      // Right handle of ConditionGroup can connect to Conditions
      if (connection.sourceHandle?.startsWith('cond')) {
        // Can only connect to Conditions (not to Actions or ActionGroups)
        if (targetNode.type !== NodeType.CONDITION) {
          return false;
        }
      }
    }

    // ============================================================
    // RULE 4: Condition Node - single output handle for chaining/actions, DO node, or ELSE node
    // ============================================================
    if (sourceNode.type === NodeType.CONDITION) {
      // Condition cannot connect to ConditionGroup
      if (targetNode.type === NodeType.CONDITION_GROUP) {
        return false;
      }
      
      // Single output handle - can connect to DO or ELSE nodes (determined by branchType)
      if (connection.sourceHandle === 'output' || !connection.sourceHandle) {
        // Can connect to another Condition (chaining)
        if (targetNode.type === NodeType.CONDITION) {
          // Check if target already has a condition input
          const targetHasConditionInput = edges.some(e => 
            e.target === targetNode.id &&
            nodes.find(n => n.id === e.source)?.type === NodeType.CONDITION
          );
          if (targetHasConditionInput) {
            return false;
          }
          return true;
        }
        
        // Can connect to DO node (DO or ELSE path based on branchType)
        if (targetNode.type === NodeType.DO) {
          const targetDoNode = targetNode as AppNode;
          const branchType = targetDoNode.data?.branchType;
          
          // Check if there's already a DO connection (branchType: 'do')
          const existingDoConnection = edges.some(e => 
            e.source === sourceNode.id && 
            e.sourceHandle === 'output' &&
            nodes.find(n => n.id === e.target)?.type === NodeType.DO &&
            (nodes.find(n => n.id === e.target) as AppNode)?.data?.branchType === 'do'
          );
          
          // Check if there's already an ELSE connection (branchType: 'else')
          const existingElseConnection = edges.some(e => 
            e.source === sourceNode.id && 
            e.sourceHandle === NodeHandle.CONDITION_OUTPUT &&
            nodes.find(n => n.id === e.target)?.type === NodeType.DO &&
            (nodes.find(n => n.id === e.target) as AppNode)?.data?.branchType === BranchType.ELSE
          );
          
          // If connecting to a DO node, ensure we don't already have a DO connection
          if (branchType === BranchType.DO && existingDoConnection) {
            return false; // Only 1 DO connection allowed
          }
          
          // If connecting to an ELSE node, ensure we don't already have an ELSE connection
          if (branchType === BranchType.ELSE && existingElseConnection) {
            return false; // Only 1 ELSE connection allowed
          }
          
          return true;
        }
        
        // Can connect to Action/ActionGroup (implicit THEN)
        if (targetNode.type === NodeType.ACTION || targetNode.type === NodeType.ACTION_GROUP) {
          return true;
        }
      }
    }

    // ============================================================
    // RULE 5: Action Group and Action - Input can accept from Event, Condition, ConditionGroup, Action, or DO
    // (Action can connect directly to ActionGroup for grouping)
    // ============================================================
    if (targetNode.type === NodeType.ACTION_GROUP || targetNode.type === NodeType.ACTION) {
      // ActionGroup and Action can receive from Event, Condition, ConditionGroup, Action, or DO node
      const isValidSource = 
        sourceNode.type === NodeType.EVENT || 
        sourceNode.type === NodeType.CONDITION || 
        sourceNode.type === NodeType.CONDITION_GROUP ||
        sourceNode.type === NodeType.ACTION ||
        sourceNode.type === NodeType.DO;
      if (!isValidSource) {
        return false; // Action/ActionGroup can only receive from Event/Condition/ConditionGroup/Action/DO
      }
    }

    // ============================================================
    // RULE 6: Action can connect to ActionGroup (for grouping)
    // AND can connect to another Action (for chaining in ActionGroup context)
    // ============================================================
    if (sourceNode.type === NodeType.ACTION) {
      if (targetNode.type === NodeType.ACTION_GROUP) {
        return true;
      }
      
      if (targetNode.type === NodeType.ACTION) {
        return true;
      }
      
      if (isTargetCondition) {
        return false;
      }
    }

    // ============================================================
    // RULE 7: Action Group can connect to Actions (for chaining within group)
    // AND can connect to Conditions (for adding conditions in action groups)
    // ============================================================
    if (sourceNode.type === NodeType.ACTION_GROUP) {
      // ActionGroup can connect to Actions (for sequential execution)
      if (targetNode.type === NodeType.ACTION) {
        // Prevent multiple action outputs to different targets in a way that creates conflicts
        // Check if target already has an input from another Action in this group
        const existingInputToTarget = edges.find(e => 
          e.target === connection.target && 
          e.targetHandle === connection.targetHandle
        );
        if (existingInputToTarget) {
          return false; // Target already has an input connection
        }
        return true;
      }
      
      // ActionGroup CAN connect to Conditions (for inline conditionals in action groups)
      // This allows adding conditional logic within action groups
      if (targetNode.type === NodeType.CONDITION) {
        // Check if Condition already has an input from another source
        const existingConditionInput = edges.find(e => 
          e.target === connection.target && 
          e.targetHandle === connection.targetHandle
        );
        if (existingConditionInput) {
          return false; // Condition already has an input
        }
        return true;
      }
      
      // ActionGroup CAN also connect to ConditionGroup for complex conditions
      if (targetNode.type === NodeType.CONDITION_GROUP) {
        return true;
      }
      
      // ActionGroup can also connect to ActionGroup (nesting groups)
      if (targetNode.type === NodeType.ACTION_GROUP) {
        return true;
      }
    }

    // ============================================================
    // RULE 8: Condition can connect back to ActionGroup (for then/else branches)
    // ============================================================
    if (sourceNode.type === NodeType.CONDITION) {
      // Condition's output can connect to ActionGroup or DO node
      if (connection.sourceHandle === 'output' || !connection.sourceHandle) {
        if (targetNode.type === NodeType.ACTION_GROUP) {
          return true;
        }
        // Condition can also connect to DO node (DO or ELSE path based on branchType)
        if (targetNode.type === NodeType.DO) {
          return true;
        }
      }
    }

    // ============================================================
    // RULE 9: DO Node - connects to Actions or ActionGroups
    // ============================================================
    if (sourceNode.type === NodeType.DO) {
      // DO node can only connect to Action or ActionGroup
      if (targetNode.type === NodeType.ACTION || targetNode.type === NodeType.ACTION_GROUP) {
        return true;
      }
      // DO cannot connect to other types
      return false;
    }

    // DO node as target
    if (targetNode.type === NodeType.DO) {
      // DO can receive from Condition via output handle
      if (sourceNode.type === NodeType.CONDITION) {
        if (connection.sourceHandle !== NodeHandle.CONDITION_OUTPUT && connection.sourceHandle) {
          return false; // Only accept from output handle
        }
        return true;
      }
      // DO cannot receive from other types
      return false;
    }

    // ============================================================
    // RULE 8: Prevent circular connections
    // ============================================================
    // Check if creating this edge would create a cycle
    const wouldCreateCycle = (sourceId: string, targetId: string): boolean => {
      const visited = new Set<string>();
      const stack = [targetId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === sourceId) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        edges.filter(e => e.source === current).forEach(e => stack.push(e.target));
      }
      return false;
    };
    
    if (wouldCreateCycle(sourceNode.id, targetNode.id)) {
      return false;
    }
    
    return true;
  }, [nodes, edges]);

  return {
    isValidConnection,
  };
}

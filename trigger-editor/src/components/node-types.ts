/**
 * Node Editor Types
 * Shared type definitions for the node-based editor
 */

import type { ExecutionMode } from '../types.js';

// ======================
// Node Types
// ======================

export type NodeType = 'trigger' | 'condition-group' | 'condition' | 'action-group' | 'action';

// ======================
// Node Data Types
// ======================

export interface TriggerNodeData {
  event: string;
  id: string;
  name?: string;
  description?: string;
  priority?: number;
  cooldown?: number;
  enabled?: boolean;
  tags?: string[];
}

export interface ConditionGroupNodeData {
  id: string;
  operator: 'AND' | 'OR';
  conditions: string[]; // Child condition IDs
}

export interface ConditionNodeData {
  id: string;
  field: string;
  operator: string;
  value: string;
  negate?: boolean;
}

export interface ActionGroupNodeData {
  id: string;
  mode: ExecutionMode;
  actions: string[]; // Child action IDs
}

export interface ActionNodeData {
  id: string;
  actionType: string;
  params: Record<string, unknown>;
  delay?: number;
  probability?: number;
}

// ======================
// Node Definition
// ======================

export interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  data: TriggerNodeData | ConditionGroupNodeData | ConditionNodeData | ActionGroupNodeData | ActionNodeData;
  children?: string[]; // For groups
}

// ======================
// Connections
// ======================

export interface NodeConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

// ======================
// Editor Types
// ======================

export type EditorMode = 'edit' | 'preview' | 'connect';

// ======================
// Event Types
// ======================

export interface NodeMoveEvent {
  nodeId: string;
  x: number;
  y: number;
}

export interface NodeSelectEvent {
  nodeId: string | null;
}

export interface NodeAddEvent {
  nodeType: NodeType;
}

export interface NodeUpdateEvent {
  nodeId: string;
  data: Partial<TriggerNodeData | ConditionGroupNodeData | ConditionNodeData | ActionGroupNodeData | ActionNodeData>;
}

export interface NodeDeleteEvent {
  nodeId: string;
}

export interface NodesChangeEvent {
  nodes: NodeData[];
  connections: NodeConnection[];
}

/**
 * Trigger Editor Events
 * Simple event types for node-based editor
 */

// Node Editor Events
export interface NodeMoveEvent {
  nodeId: string;
  x: number;
  y: number;
}

export interface NodeConnectEvent {
  sourceId: string;
  targetId: string;
}

export interface NodeUpdateEvent {
  nodeId: string;
  data: Record<string, unknown>;
}

export interface NodeDeleteEvent {
  nodeId: string;
}

export interface CanvasDropEvent {
  nodeType: string;
  x: number;
  y: number;
}

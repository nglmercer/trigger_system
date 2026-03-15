/**
 * Trigger Editor Components
 * Node-based visual editor for Trigger System rules
 */

// Basic components
import './rule-list.js';
import './icon.js';

// Node-based editor components (monolithic)
import './node-editor.js';

// Modular node components
import './trigger-node.js';
import './condition-node.js';
import './action-node.js';
import './group-node.js';

// Types
import './node-types.js';

export { RuleList } from './rule-list.js';
export { IconComponent } from './icon.js';

// Node editor
export { NodeEditor } from './node-editor';

// Modular node components
export { TriggerNode } from './trigger-node.js';
export { ConditionNode } from './condition-node.js';
export { ActionNode } from './action-node.js';
export { GroupNode, type GroupType } from './group-node.js';

// Types
export type { 
  NodeType, 
  NodeData, 
  NodeConnection, 
  EditorMode,
  TriggerNodeData,
  ConditionNodeData,
  ConditionGroupNodeData,
  ActionNodeData,
  ActionGroupNodeData,
  NodeMoveEvent,
  NodeSelectEvent,
  NodeAddEvent,
  NodeUpdateEvent,
  NodeDeleteEvent,
  NodesChangeEvent
} from './node-types.js';

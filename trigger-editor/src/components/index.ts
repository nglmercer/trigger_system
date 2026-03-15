/**
 * Trigger Editor Components
 * Node-based visual editor for Trigger System rules
 */

// Main editor component
import './trigger-editor.js';

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

// Styles
import './styles/index.js';

// Utils
import * as nodeUtils from './utils/index.js';

export { RuleList } from './rule-list.js';
export { IconComponent } from './icon.js';

// Node editor
export { NodeEditor } from './node-editor';

// Modular node components
export { TriggerNode } from './trigger-node.js';
export { ConditionNode } from './condition-node.js';
export { ActionNode } from './action-node.js';
export { GroupNode } from './group-node.js';
export type { GroupType } from './group-node.js';

// Styles - re-export for convenience
export {
  nodeSharedStyles,
  nodeColors,
  nodeIcons,
  nodeTitles,
  groupNodeStyles,
} from './styles/index.js';

// Utils - re-export for convenience
export { nodeUtils };
export {
  createNodeSelectEvent,
  createNodeDeleteEvent,
  createPortClickEvent,
  createGroupSelectEvent,
  createGroupDeleteEvent,
  createGroupDragOverEvent,
  createGroupDragLeaveEvent,
  createGroupDropEvent,
  createGroupPortClickEvent,
  handleNodeMouseDown,
  handleDeleteClick,
  handlePortClick,
  handleGroupMouseDown,
  handleGroupDelete,
  handleGroupDragOver,
  handleGroupDragLeave,
  handleGroupDrop,
  handleGroupPortClick,
  generateNodeId,
  truncateText,
  formatJsonForDisplay,
} from './utils/index.js';

// Types - explicitly re-export to avoid conflicts with events
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

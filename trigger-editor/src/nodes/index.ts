// Node components - organized by type
// Re-export all node components from a single location

export { default as EventNode } from './EventNode';
export { default as ConditionNode } from './ConditionNode';
export { default as ConditionGroupNode } from './ConditionGroupNode';
export { default as ActionNode } from './ActionNode';
export { default as ActionGroupNode } from './ActionGroupNode';
export { default as DoNode } from './DoNode';

// Node type mapping for React Flow
import { NodeType } from '../constants';
import EventNode from './EventNode';
import ConditionNode from './ConditionNode';
import ConditionGroupNode from './ConditionGroupNode';
import ActionNode from './ActionNode';
import ActionGroupNode from './ActionGroupNode';
import DoNode from './DoNode';

export const nodeTypes = {
  [NodeType.EVENT]: EventNode,
  [NodeType.CONDITION]: ConditionNode,
  [NodeType.CONDITION_GROUP]: ConditionGroupNode,
  [NodeType.ACTION]: ActionNode,
  [NodeType.ACTION_GROUP]: ActionGroupNode,
  [NodeType.DO]: DoNode,
};

import type { Node } from '@xyflow/react';
import type { ComparisonOperator, ExecutionMode } from '../../src/types';

// AppNode type - union of all node data types
export type AppNode = Node<
  | EventNodeData 
  | ConditionNodeData 
  | ConditionGroupNodeData 
  | ActionNodeData 
  | ActionGroupNodeData
  | DoNodeData
>;

export interface AppNodeData {
  _id?: string;
  onChange: (val: unknown, field: string) => void;
  onDuplicate: () => void;
  [key: string]: unknown;
}

export interface EventNodeData extends AppNodeData {
  id: string;
  name: string;
  description: string;
  event: string;
  priority: number;
  enabled: boolean;
  cooldown?: number;
  tags?: string[];
}

export interface ConditionNodeData extends AppNodeData {
  field: string;
  operator: ComparisonOperator;
  value: any;
}

export interface ConditionGroupNodeData extends AppNodeData {
  operator: 'AND' | 'OR';
}

export interface ActionNodeData extends AppNodeData {
  type: string;
  params: string; // JSON string
  // Conditional action support
  conditionField?: string;
  conditionOperator?: ComparisonOperator;
  conditionValue?: string;
  thenType?: string;
  thenParams?: string;
  elseType?: string;
  elseParams?: string;
}

export interface ActionGroupNodeData extends AppNodeData {
  mode: ExecutionMode;
}

export interface DoNodeData extends AppNodeData {
  // DO node - explicit path for condition branches (DO or ELSE)
  // Can connect to Actions or ActionGroups
  branchType: 'do' | 'else';
}

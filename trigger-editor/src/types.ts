import type { ComparisonOperator, ExecutionMode } from '../../src/types';

export interface AppNodeData {
  onChange: (val: any, field: string) => void;
  [key: string]: any;
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

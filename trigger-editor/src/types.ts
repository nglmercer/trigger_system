import type { ComparisonOperator } from '../../src/types';

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

export interface ActionNodeData extends AppNodeData {
  type: string;
  params: string; // JSON string
}

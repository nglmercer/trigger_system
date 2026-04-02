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
  delay?: number;
  probability?: number;
  break?: boolean;
  continue?: boolean;
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
  branchType: 'do' | 'else';
}

export interface ActionField {
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  readonly placeholder?: string;
  readonly description?: string;
  readonly labelKey?: string;
  readonly descriptionKey?: string;
  readonly options?: readonly { 
    readonly value: string; 
    readonly label: string; 
    readonly labelKey?: string 
  }[];
  readonly default?: any;
}

export interface ActionConfig {
  readonly type: string;
  readonly fields: readonly ActionField[];
}

declare global {
  interface Window {
    hostIntegration?: boolean;
    triggerEditor?: {
      importJson?: (json: string | object) => void;
      importYaml?: (yaml: string) => void;
      requestExport?: () => void;
      clear?: () => void;
      addAutocompleteData?: (alias: string, data: any, mode?: 'path' | 'value') => void;
      removeAutocompleteData?: (alias: string) => void;
      testEvent?: (eventName: string, data?: Record<string, any>, vars?: Record<string, any>, state?: Record<string, any>) => Promise<any>;
      registerActionConfig?: (config: ActionConfig) => void;
      getActionConfigs?: () => ActionConfig[];
      //[key: string | string[], options?: (Omit<TOptions, "context"> & { context?: string | undefined; }) | undefined] | [key: string | string[], options: TOptionsBase & $Dictionary & { ...; }]
      t?: (key: string, options?: Record<string, any> | any) => string;
    };
  }
}


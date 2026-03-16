export enum NodeType {
  EVENT = 'event',
  CONDITION = 'condition',
  CONDITION_GROUP = 'condition_group',
  ACTION = 'action',
  ACTION_GROUP = 'action_group',
}

export const DRAG_DATA_FORMAT = 'application/reactflow';

export const INITIAL_HINT = 'Add an Event Trigger node to start building a rule...';

export enum StorageKey {
  NODES = 'trigger-editor-nodes',
  EDGES = 'trigger-editor-edges',
}

export enum NodeField {
  ID = 'id',
  NAME = 'name',
  DESCRIPTION = 'description',
  EVENT = 'event',
  PRIORITY = 'priority',
  FIELD = 'field',
  OPERATOR = 'operator',
  VALUE = 'value',
  TYPE = 'type',
  PARAMS = 'params',
  MODE = 'mode',
}

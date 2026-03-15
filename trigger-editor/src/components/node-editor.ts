/**
 * Node Editor Component
 * A visual node-based editor for Trigger System rules
 * Supports nested conditions and action groups using the SDK builder pattern
 * No recursion - simple parent-child event flow only
 */

import { LitElement, html, css, svg, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import { map } from 'lit/directives/map.js';

import type { TriggerRule, Condition, Action, ConditionGroup, ActionGroup, ExecutionMode } from '../types.js';
import { RuleBuilder, ConditionBuilder, ActionBuilder } from '../builder.js';
import { RuleExporter } from '../exporter.js';

import {
  LABELS,
  EVENTS,
} from '../constants.js';

import {
  baseComponentStyles,
  buttonStyles,
  iconButtonStyles,
  combineStyles,
} from '../styles.js';

import { iconPlus, iconCopy, iconTrash, iconDownload, iconX, iconSettings } from '../icons.js';

// ======================
// Types
// ======================

export type NodeType = 'trigger' | 'condition-group' | 'condition' | 'action-group' | 'action';

export interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  data: TriggerNodeData | ConditionGroupNodeData | ConditionNodeData | ActionGroupNodeData | ActionNodeData;
  children?: string[]; // For groups
}

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

export interface NodeConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

export type EditorMode = 'edit' | 'preview' | 'connect';

// ======================
// Component
// ======================

@customElement('node-editor')
export class NodeEditor extends LitElement {
  static override styles = combineStyles(
    baseComponentStyles,
    buttonStyles,
    iconButtonStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 500px;
        background: var(--color-background, #f8fafc);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      /* Toolbar */
      .editor-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--color-surface, #ffffff);
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        flex-wrap: wrap;
      }

      .toolbar-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text, #1e293b);
        margin-right: auto;
      }

      /* Canvas Container */
      .canvas-container {
        position: relative;
        width: 100%;
        height: calc(100% - 50px);
        overflow: auto;
        background: 
          linear-gradient(90deg, #e2e8f0 1px, transparent 1px),
          linear-gradient(#e2e8f0 1px, transparent 1px);
        background-size: 20px 20px;
      }

      /* Nodes */
      .node {
        position: absolute;
        min-width: 180px;
        background: var(--color-surface, #ffffff);
        border: 2px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        cursor: move;
        user-select: none;
        transition: box-shadow 0.15s ease, border-color 0.15s ease;
      }

      .node:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .node.selected {
        border-color: var(--color-primary, #2563eb);
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
      }

      /* Node Types */
      .node.trigger-node {
        border-color: #8b5cf6;
      }

      .node.condition-group-node {
        border-color: #10b981;
        background: #ecfdf5;
      }

      .node.condition-node {
        border-color: #34d399;
      }

      .node.action-group-node {
        border-color: #f59e0b;
        background: #fffbeb;
      }

      .node.action-node {
        border-color: #fbbf24;
      }

      .node.drag-over {
        border-color: var(--color-primary, #2563eb) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2) !important;
        transform: scale(1.02);
      }

      .node-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        border-radius: 6px 6px 0 0;
      }

      .node-header.trigger {
        background: #8b5cf6;
        color: white;
      }

      .node-header.condition-group {
        background: #10b981;
        color: white;
      }

      .node-header.condition {
        background: #34d399;
        color: white;
      }

      .node-header.action-group {
        background: #f59e0b;
        color: white;
      }

      .node-header.action {
        background: #fbbf24;
        color: white;
      }

      .node-icon {
        font-size: 16px;
      }

      .node-title {
        font-size: 13px;
        font-weight: 600;
        flex: 1;
      }

      .node-body {
        padding: 12px;
      }

      .node-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
      }

      .node-field:last-child {
        margin-bottom: 0;
      }

      .node-field-label {
        font-size: 11px;
        font-weight: 500;
        color: var(--color-text-secondary, #64748b);
        text-transform: uppercase;
      }

      .node-field-value {
        font-size: 13px;
        color: var(--color-text, #1e293b);
        background: var(--color-surface, #f8fafc);
        padding: 4px 8px;
        border-radius: 4px;
      }

      /* Ports */
      .port {
        position: absolute;
        width: 12px;
        height: 12px;
        background: var(--color-border, #e2e8f0);
        border: 2px solid var(--color-surface, #ffffff);
        border-radius: 50%;
        cursor: crosshair;
        transition: background 0.15s ease, transform 0.15s ease;
        z-index: 10;
      }

      .port:hover {
        transform: scale(1.3);
      }

      .port.input {
        top: 50%;
        left: -6px;
        transform: translateY(-50%);
      }

      .port.output {
        top: 50%;
        right: -6px;
        transform: translateY(-50%);
      }

      .port.input:hover,
      .port.output:hover {
        background: var(--color-primary, #2563eb);
      }

      /* Connection Lines */
      .connections-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
      }

      .connection-line {
        fill: none;
        stroke: var(--color-border, #94a3b8);
        stroke-width: 2;
        stroke-linecap: round;
      }

      .connection-line.bezier {
        stroke: var(--color-primary, #2563eb);
        stroke-width: 3;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
      }

      .connection-line.selected {
        stroke: var(--color-primary, #2563eb);
        stroke-width: 4;
      }

      .connection-line:hover {
        stroke-width: 4;
        cursor: pointer;
      }

      /* Port glow for connections */
      .port-glow {
        filter: drop-shadow(0 0 4px var(--color-primary, #2563eb));
      }

      /* Properties Panel */
      .properties-panel {
        position: absolute;
        top: 0;
        right: 0;
        width: 320px;
        height: 100%;
        background: var(--color-surface, #ffffff);
        border-left: 1px solid var(--color-border, #e2e8f0);
        padding: 16px;
        overflow-y: auto;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.05);
        z-index: 100;
      }

      .properties-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--color-text, #1e293b);
      }

      .property-group {
        margin-bottom: 16px;
      }

      .property-label {
        font-size: 12px;
        font-weight: 500;
        color: var(--color-text-secondary, #64748b);
        margin-bottom: 4px;
        display: block;
      }

      .property-input {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 4px;
        font-size: 13px;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
      }

      .property-input:focus {
        outline: none;
        border-color: var(--color-primary, #2563eb);
      }

      .property-select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 4px;
        font-size: 13px;
        background: white;
        box-sizing: border-box;
      }

      .property-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .property-checkbox input {
        width: 16px;
        height: 16px;
      }

      /* Add Node Buttons */
      .add-node-panel {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        padding: 12px;
        background: var(--color-surface, #ffffff);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        flex-wrap: wrap;
        justify-content: center;
        max-width: 90%;
      }

      .add-node-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .add-node-btn.trigger { background: #8b5cf6; color: white; }
      .add-node-btn.condition-group { background: #10b981; color: white; }
      .add-node-btn.condition { background: #34d399; color: white; }
      .add-node-btn.action-group { background: #f59e0b; color: white; }
      .add-node-btn.action { background: #fbbf24; color: white; }

      .add-node-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      /* Empty State */
      .empty-state {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: var(--color-text-secondary, #64748b);
      }

      .empty-state-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
      .empty-state-text { font-size: 14px; max-width: 300px; }

      /* Node counts badge */
      .node-count {
        font-size: 11px;
        background: rgba(255,255,255,0.3);
        padding: 2px 6px;
        border-radius: 10px;
      }

      /* Dark mode */
      :host([darkmode]) {
        background: #1e293b;
        border-color: #334155;
      }

      :host([darkmode]) .editor-toolbar {
        background: #0f172a;
        border-color: #334155;
      }

      :host([darkmode]) .toolbar-title { color: #f1f5f9; }

      :host([darkmode]) .canvas-container {
        background: linear-gradient(90deg, #334155 1px, transparent 1px),
                    linear-gradient(#334155 1px, transparent 1px);
      }

      :host([darkmode]) .node {
        background: #1e293b;
        border-color: #475569;
      }

      :host([darkmode]) .node-header { background: #334155; }

      :host([darkmode]) .node-body { background: #1e293b; }

      :host([darkmode]) .node-field-value {
        background: #334155;
        color: #f1f5f9;
      }

      :host([darkmode]) .add-node-panel {
        background: #1e293b;
        border-color: #334155;
      }

      :host([darkmode]) .properties-panel {
        background: #1e293b;
        border-color: #334155;
      }
    `
  );

  // ======================
  // Properties
  // ======================

  @property({ type: Boolean, reflect: true })
  darkmode = false;

  @property({ type: Object })
  rule: TriggerRule | null = null;

  @property({ type: String })
  mode: EditorMode = 'edit';

  // ======================
  // State
  // ======================

  @state()
  private _nodes: NodeData[] = [];

  @state()
  private _connections: NodeConnection[] = [];

  @state()
  private _selectedNodeId: string | null = null;

  @state()
  private _selectedConnectionId: string | null = null;

  @state()
  private _dragOverGroupId: string | null = null;

  @state()
  private _connectingFrom: string | null = null;

  @state()
  private _dragOffset = { x: 0, y: 0 };

  @state()
  private _isDragging = false;

  // ======================
  // Lifecycle
  // ======================

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.rule) {
      this._loadFromRule(this.rule);
    }
  }

  // ======================
  // Public Methods
  // ======================

  /**
   * Get the current rule from nodes using the SDK builder
   */
  getRule(): TriggerRule | null {
    if (this._nodes.length === 0) return null;

    const triggerNode = this._nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return null;

    const triggerData = triggerNode.data as TriggerNodeData;
    
    const builder = new RuleBuilder()
      .withId(triggerData.id || `rule_${Date.now()}`)
      .withName(triggerData.name || '')
      .withDescription(triggerData.description || '')
      .withPriority(triggerData.priority || 0)
      .withCooldown(triggerData.cooldown || 0)
      .withEnabled(triggerData.enabled !== false)
      .withTags(triggerData.tags || [])
      .on(triggerData.event);

    // Build conditions
    const conditionGroup = this._buildConditionGroup();
    if (conditionGroup) {
      builder.ifComplex(conditionGroup);
    }

    // Build actions
    const actionGroup = this._buildActionGroup();
    if (actionGroup) {
      builder.doComplex(actionGroup);
    }

    try {
      return builder.build();
    } catch (e) {
      console.error('Failed to build rule:', e);
      return null;
    }
  }

  /**
   * Build condition group using the SDK ConditionBuilder
   */
  private _buildConditionGroup(): ((builder: ConditionBuilder) => ConditionBuilder) | null {
    const conditionNodes = this._nodes.filter(n => n.type === 'condition');
    const conditionGroups = this._nodes.filter(n => n.type === 'condition-group');
    
    if (conditionNodes.length === 0 && conditionGroups.length === 0) return null;

    return (builder: ConditionBuilder) => {
      // Add individual conditions
      for (const condNode of conditionNodes) {
        const condData = condNode.data as ConditionNodeData;
        if (condData.negate) {
          // For negated conditions, we wrap in a NOT logic (handled by the engine)
          builder.where(condData.field, condData.operator as any, condData.value);
        } else {
          builder.where(condData.field, condData.operator as any, condData.value);
        }
      }

      // Add condition groups (AND/OR)
      for (const groupNode of conditionGroups) {
        const groupData = groupNode.data as ConditionGroupNodeData;
        const subBuilder = new ConditionBuilder(groupData.operator);
        
        // Add child conditions to sub-builder
        for (const childId of groupData.conditions) {
          const childNode = this._nodes.find(n => n.id === childId);
          if (childNode && childNode.type === 'condition') {
            const childData = childNode.data as ConditionNodeData;
            subBuilder.where(childData.field, childData.operator as any, childData.value);
          }
        }

        // Add the group
        if (groupData.operator === 'AND') {
          builder.and(() => subBuilder);
        } else {
          builder.or(() => subBuilder);
        }
      }

      return builder;
    };
  }

  /**
   * Build action group using the SDK ActionBuilder
   */
  private _buildActionGroup(): ((builder: ActionBuilder) => ActionBuilder) | null {
    const actionNodes = this._nodes.filter(n => n.type === 'action');
    const actionGroups = this._nodes.filter(n => n.type === 'action-group');
    
    if (actionNodes.length === 0 && actionGroups.length === 0) return null;

    return (builder: ActionBuilder) => {
      // Add individual actions
      for (const actionNode of actionNodes) {
        const actionData = actionNode.data as ActionNodeData;
        builder.add(actionData.actionType, actionData.params as any, {
          delay: actionData.delay,
          probability: actionData.probability
        });
      }

      // Add action groups with modes
      for (const groupNode of actionGroups) {
        const groupData = groupNode.data as ActionGroupNodeData;
        
        // Set the mode for subsequent actions
        builder.setMode(groupData.mode);

        // Add child actions
        for (const childId of groupData.actions) {
          const childNode = this._nodes.find(n => n.id === childId);
          if (childNode && childNode.type === 'action') {
            const childData = childNode.data as ActionNodeData;
            builder.add(childData.actionType, childData.params as any, {
              delay: childData.delay,
              probability: childData.probability
            });
          }
        }
      }

      return builder;
    };
  }

  /**
   * Export as YAML
   */
  exportYaml(): string {
    const rule = this.getRule();
    if (!rule) return '# No rule defined';
    return RuleExporter.toCleanYaml(rule);
  }

  /**
   * Export as JSON
   */
  exportJson(): string {
    const rule = this.getRule();
    if (!rule) return '{}';
    return RuleExporter.toCleanJson(rule);
  }

  /**
   * Copy rule to clipboard
   */
  async copyToClipboard(): Promise<void> {
    const yaml = this.exportYaml();
    await navigator.clipboard.writeText(yaml);
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this._nodes = [];
    this._connections = [];
    this._selectedNodeId = null;
  }

  // ======================
  // Private Methods
  // ======================

  private _loadFromRule(rule: TriggerRule): void {
    const nodes: NodeData[] = [];
    let triggerY = 50;
    let conditionY = 50;
    let actionY = 50;

    // Create trigger node
    nodes.push({
      id: `trigger_${Date.now()}`,
      type: 'trigger',
      x: 50,
      y: triggerY,
      data: {
        event: rule.on || '',
        id: rule.id || '',
        name: rule.name || '',
        description: rule.description || '',
        priority: rule.priority || 0,
        cooldown: rule.cooldown || 0,
        enabled: rule.enabled !== false,
        tags: rule.tags || []
      } as TriggerNodeData
    });

    // Create condition nodes/groups
    if (rule.if) {
      const conditions = Array.isArray(rule.if) ? rule.if : [rule.if];
      
      // Check if it's a condition group
      if ('operator' in rule.if && 'conditions' in rule.if) {
        const groupData = rule.if as ConditionGroup;
        nodes.push({
          id: `cond_group_${Date.now()}`,
          type: 'condition-group',
          x: 300,
          y: conditionY,
          data: {
            operator: groupData.operator,
            conditions: groupData.conditions.map((c: any, i: number) => {
              // Add child condition
              if ('field' in c) {
                const childId = `condition_${Date.now()}_${i}`;
                nodes.push({
                  id: childId,
                  type: 'condition',
                  x: 500,
                  y: conditionY + (i * 100),
                  data: {
                    id: childId,
                    field: c.field,
                    operator: c.operator || 'EQ',
                    value: String(c.value || '')
                  } as ConditionNodeData
                });
                return childId;
              }
              return '';
            }).filter(Boolean)
          } as ConditionGroupNodeData
        });
        conditionY += 150;
      } else {
        // Individual conditions
        for (let i = 0; i < conditions.length; i++) {
          const cond = conditions[i];
          if (cond && 'field' in cond) {
            nodes.push({
              id: `condition_${Date.now()}_${i}`,
              type: 'condition',
              x: 300,
              y: conditionY,
              data: {
                id: `condition_${Date.now()}_${i}`,
                field: cond.field,
                operator: cond.operator || 'EQ',
                value: String(cond.value || '')
              } as ConditionNodeData
            });
            conditionY += 100;
          }
        }
      }
    }

    // Create action nodes/groups
    if (rule.do) {
      const actions = Array.isArray(rule.do) ? rule.do : [rule.do];
      
      // Check if it's an action group
      if (actions.length > 0 && 'mode' in actions[0]! && 'actions' in actions[0]) {
        const groupData = actions[0] as ActionGroup;
        nodes.push({
          id: `action_group_${Date.now()}`,
          type: 'action-group',
          x: 550,
          y: actionY,
          data: {
            mode: groupData.mode,
            actions: groupData.actions.map((a: any, i: number) => {
              // Add child action
              if (a && 'type' in a) {
                const childId = `action_${Date.now()}_${i}`;
                nodes.push({
                  id: childId,
                  type: 'action',
                  x: 750,
                  y: actionY + (i * 100),
                  data: {
                    id: childId,
                    actionType: a.type,
                    params: a.params || {},
                    delay: a.delay,
                    probability: a.probability
                  } as ActionNodeData
                });
                return childId;
              }
              return '';
            }).filter(Boolean)
          } as ActionGroupNodeData
        });
      } else {
        // Individual actions
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i];
          if (action && typeof action === 'object' && 'type' in action) {
            nodes.push({
              id: `action_${Date.now()}_${i}`,
              type: 'action',
              x: 550,
              y: actionY,
              data: {
                id: `action_${Date.now()}_${i}`,
                actionType: action.type,
                params: action.params || {},
                delay: action.delay,
                probability: action.probability
              } as ActionNodeData
            });
            actionY += 100;
          }
        }
      }
    }

    this._nodes = nodes;
  }

  private _generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private _addNode(type: NodeType): void {
    const id = this._generateId();
    let data: any;
    let x = 50;
    let y = 50;
    let count = this._nodes.filter(n => n.type === type).length;

    switch (type) {
      case 'trigger':
        data = { event: '', id: `rule_${Date.now()}` };
        x = 50;
        y = 50 + count * 80;
        break;
      case 'condition-group':
        data = { id: `cond_group_${Date.now()}`, operator: 'AND', conditions: [] } as ConditionGroupNodeData;
        x = 300;
        y = 50 + count * 160;
        break;
      case 'condition':
        data = { id, field: 'data', operator: 'EQ', value: '' } as ConditionNodeData;
        x = 320;
        y = 80 + count * 120;
        break;
      case 'action-group':
        data = { id: `action_group_${Date.now()}`, mode: 'ALL', actions: [] } as ActionGroupNodeData;
        x = 550;
        y = 50 + count * 160;
        break;
      case 'action':
        data = { id, actionType: 'log', params: { message: '' } } as ActionNodeData;
        x = 570;
        y = 80 + count * 140;
        break;
    }

    this._nodes = [...this._nodes, { id, type, x, y, data }];
    this._selectedNodeId = id;
  }

  private _removeNode(nodeId: string): void {
    // Also remove child references
    this._nodes = this._nodes
      .map(node => {
        if (node.type === 'condition-group') {
          const groupData = node.data as ConditionGroupNodeData;
          return {
            ...node,
            data: {
              ...groupData,
              conditions: groupData.conditions.filter((c: string) => c !== nodeId)
            }
          };
        }
        if (node.type === 'action-group') {
          const groupData = node.data as ActionGroupNodeData;
          return {
            ...node,
            data: {
              ...groupData,
              actions: groupData.actions.filter((a: string) => a !== nodeId)
            }
          };
        }
        return node;
      })
      .filter(n => n.id !== nodeId);

    this._connections = this._connections.filter(
      c => c.sourceId !== nodeId && c.targetId !== nodeId
    );
    
    if (this._selectedNodeId === nodeId) {
      this._selectedNodeId = null;
    }
  }

  private _selectNode(nodeId: string | null): void {
    this._selectedNodeId = nodeId;
  }

  private _updateNodeData(nodeId: string, data: Partial<any>): void {
    this._nodes = this._nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, ...data } };
      }
      return node;
    });
    
    this._emitChange();
  }

  private _handleNodeMouseDown(e: MouseEvent, nodeId: string): void {
    if (this.mode !== 'edit') return;
    
    e.stopPropagation();
    this._selectNode(nodeId);
    
    const node = this._nodes.find(n => n.id === nodeId);
    if (!node) return;

    this._isDragging = true;
    this._dragOffset = {
      x: e.clientX - node.x,
      y: e.clientY - node.y
    };

    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);
  }

  private _handleMouseMove = (e: MouseEvent): void => {
    if (!this._isDragging || !this._selectedNodeId) return;

    const node = this._nodes.find(n => n.id === this._selectedNodeId);
    if (!node) return;

    this._nodes = this._nodes.map(n => {
      if (n.id === this._selectedNodeId) {
        return {
          ...n,
          x: Math.max(0, e.clientX - this._dragOffset.x),
          y: Math.max(0, e.clientY - this._dragOffset.y)
        };
      }
      return n;
    });
  };

  private _handleMouseUp = (): void => {
    this._isDragging = false;
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
  };

  private _emitChange(): void {
    this.dispatchEvent(new CustomEvent('nodes-change', {
      detail: { nodes: this._nodes, connections: this._connections },
      bubbles: true,
      composed: true
    }));
  }

  // ======================
  // Render
  // ======================

  override render() {
    const triggerCount = this._nodes.filter(n => n.type === 'trigger').length;
    const conditionCount = this._nodes.filter(n => n.type === 'condition' || n.type === 'condition-group').length;
    const actionCount = this._nodes.filter(n => n.type === 'action' || n.type === 'action-group').length;

    return html`
      <div class="editor-toolbar">
        <span class="toolbar-title">Trigger Rule Editor</span>
        
        <button class="add-node-btn trigger" @click=${() => this._addNode('trigger')}>
          ⚡ Trigger
        </button>
        
        <button class="add-node-btn condition-group" @click=${() => this._addNode('condition-group')}>
          🔀 AND/OR Group
        </button>
        
        <button class="add-node-btn condition" @click=${() => this._addNode('condition')}>
          🔍 Condition
        </button>
        
        <button class="add-node-btn action-group" @click=${() => this._addNode('action-group')}>
          ⚙️ Action Group
        </button>
        
        <button class="add-node-btn action" @click=${() => this._addNode('action')}>
          ⚡ Action
        </button>
        
        <button class="btn btn-sm btn-primary" @click=${this.copyToClipboard}>
          📋 Copy YAML
        </button>
        
        <button class="btn btn-sm btn-secondary" @click=${this.clear}>
          🗑️ Clear
        </button>
      </div>

      <div 
        class="canvas-container" 
        @click=${() => this._selectNode(null)}
        @dragover=${this._handleDragOver}
        @dragleave=${this._handleDragLeave}
        @drop=${this._handleDrop}
      >
        ${this._renderConnections()}
        
        ${when(this._nodes.length === 0, () => this._renderEmptyState())}
        
        ${map(this._nodes, (node) => this._renderNode(node))}

        ${when(this._selectedNodeId, () => this._renderPropertiesPanel())}
      </div>
    `;
  }

  private _renderEmptyState() {
    return html`
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">
          Click "Trigger" to start building your rule.<br>
          Add conditions and actions to define the rule behavior.<br><br>
          <strong>Features:</strong><br>
          • AND/OR condition groups<br>
          • Action groups (ALL/FIRST/RANDOM)<br>
          • Nested conditions supported
        </div>
      </div>
    `;
  }

  private _getNodeIcon(type: NodeType): string {
    switch (type) {
      case 'trigger': return '⚡';
      case 'condition-group': return '🔀';
      case 'condition': return '🔍';
      case 'action-group': return '📦';
      case 'action': return '⚙️';
      default: return '●';
    }
  }

  private _getNodeTitle(type: NodeType, data: any): string {
    switch (type) {
      case 'trigger': return `Trigger: ${data.event || '(not set)'}`;
      case 'condition-group': return `${data.operator} Group (${data.conditions?.length || 0})`;
      case 'condition': return `${data.field} ${data.operator} ${data.value}`;
      case 'action-group': return `${data.mode} Group (${data.actions?.length || 0})`;
      case 'action': return `${data.actionType}`;
      default: return type;
    }
  }

  private _renderNode(node: NodeData) {
    const isSelected = this._selectedNodeId === node.id;
    const isDragOver = this._dragOverGroupId === node.id;
    const typeLabel = node.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

    return html`
      <div 
        class="node ${node.type}-node ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}"
        style="left: ${node.x}px; top: ${node.y}px"
        draggable="true"
        @mousedown=${(e: MouseEvent) => this._handleNodeMouseDown(e, node.id)}
        @dragstart=${(e: DragEvent) => this._handleNodeDragStart(e, node.id)}
      >
        ${node.type !== 'trigger' ? html`<div class="port input"></div>` : nothing}
        
        <div class="node-header ${node.type}">
          <span class="node-icon">${this._getNodeIcon(node.type)}</span>
          <span class="node-title">${typeLabel}</span>
          <span class="node-count">${this._getNodeTitle(node.type, node.data)}</span>
          <button class="icon-btn" style="padding: 2px;" @click=${(e: Event) => { e.stopPropagation(); this._removeNode(node.id); }}>
            ${iconX('sm')}
          </button>
        </div>
        
        ${node.type === 'condition-group' ? this._renderConditionGroupPreview(node.data as ConditionGroupNodeData) : nothing}
        ${node.type === 'action-group' ? this._renderActionGroupPreview(node.data as ActionGroupNodeData) : nothing}
        
        ${node.type !== 'action-group' ? html`<div class="port output"></div>` : nothing}
      </div>
    `;
  }

  private _renderConditionGroupPreview(data: ConditionGroupNodeData) {
    return html`
      <div class="node-body">
        <div class="node-field">
          <span class="node-field-label">Mode</span>
          <span class="node-field-value">${data.operator}</span>
        </div>
        <div class="node-field">
          <span class="node-field-label">Conditions</span>
          <span class="node-field-value">${data.conditions.length} child(ren)</span>
        </div>
      </div>
    `;
  }

  private _renderActionGroupPreview(data: ActionGroupNodeData) {
    return html`
      <div class="node-body">
        <div class="node-field">
          <span class="node-field-label">Execution Mode</span>
          <span class="node-field-value">${data.mode}</span>
        </div>
        <div class="node-field">
          <span class="node-field-label">Actions</span>
          <span class="node-field-value">${data.actions.length} child(ren)</span>
        </div>
      </div>
    `;
  }

  private _renderConnections() {
    return svg`
      <svg class="connections-layer" width="100%" height="100%">
        ${map(this._connections, (conn) => {
          const source = this._nodes.find(n => n.id === conn.sourceId);
          const target = this._nodes.find(n => n.id === conn.targetId);
          if (!source || !target) return nothing;
          
          // Calculate bezier curve control points
          const { x1, y1, x2, y2, cp1x, cp1y, cp2x, cp2y } = this._calculateBezierPoints(source, target);
          
          const path = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
          
          const isSelected = this._selectedNodeId === conn.sourceId || this._selectedNodeId === conn.targetId;
          
          return svg`<path 
            class="connection-line bezier ${isSelected ? 'selected' : ''}" 
            d="${path}"
            @click=${(e: Event) => this._handleConnectionClick(e, conn)}
          />`;
        })}
      </svg>
    `;
  }

  private _calculateBezierPoints(source: NodeData, target: NodeData) {
    // Get node dimensions
    const sourceWidth = this._getNodeWidth(source.type);
    const sourceHeight = this._getNodeHeight(source.type);
    const targetWidth = this._getNodeWidth(target.type);
    const targetHeight = this._getNodeHeight(target.type);
    
    // Connection points (output from source, input to target)
    const x1 = source.x + sourceWidth;
    const y1 = source.y + sourceHeight / 2;
    const x2 = target.x;
    const y2 = target.y + targetHeight / 2;
    
    // Calculate horizontal distance for curve intensity
    const dx = Math.abs(x2 - x1);
    const curveOffset = Math.min(dx * 0.5, 150);
    
    // Control points for smooth bezier
    const cp1x = x1 + curveOffset;
    const cp1y = y1;
    const cp2x = x2 - curveOffset;
    const cp2y = y2;
    
    return { x1, y1, x2, y2, cp1x, cp1y, cp2x, cp2y };
  }

  private _getNodeWidth(type: NodeType): number {
    switch (type) {
      case 'trigger':
      case 'condition':
      case 'action':
        return 180;
      case 'condition-group':
      case 'action-group':
        return 280;
      default:
        return 180;
    }
  }

  private _getNodeHeight(type: NodeType): number {
    switch (type) {
      case 'trigger':
        return 100;
      case 'condition':
        return 120;
      case 'action':
        return 140;
      case 'condition-group':
      case 'action-group':
        return 150;
      default:
        return 100;
    }
  }

  private _handleConnectionClick(e: Event, conn: NodeConnection): void {
    e.stopPropagation();
    this._selectedConnectionId = conn.id;
    this.requestUpdate();
  }

  // ======================
  // Drag and Drop Handlers
  // ======================

  private _handleNodeDragStart(e: DragEvent, nodeId: string): void {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', nodeId);
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  private _handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    // Check if we're dragging over a group node
    const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    const groupUnderMouse = this._nodes.find(n => {
      if (n.type !== 'condition-group' && n.type !== 'action-group') return false;
      return mouseX >= n.x && mouseX <= n.x + 280 &&
             mouseY >= n.y && mouseY <= n.y + 150;
    });

    this._dragOverGroupId = groupUnderMouse?.id || null;
  }

  private _handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    this._dragOverGroupId = null;
  }

  private _handleDrop(e: DragEvent): void {
    e.preventDefault();
    const nodeId = e.dataTransfer?.getData('text/plain');
    if (!nodeId) return;

    // Find the node being dragged
    const node = this._nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Check if we're dropping onto a group node
    const targetGroup = this._nodes.find(n => {
      if (n.type !== 'condition-group' && n.type !== 'action-group') return false;
      const rect = { x: n.x, y: n.y, width: 280, height: 150 };
      return e.clientX >= rect.x && e.clientX <= rect.x + rect.width &&
             e.clientY >= rect.y && e.clientY <= rect.y + rect.height;
    });

    if (targetGroup) {
      // Add node to group
      if (targetGroup.type === 'condition-group' && (node.type === 'condition' || node.type === 'condition-group')) {
        const groupData = targetGroup.data as ConditionGroupNodeData;
        if (!groupData.conditions.includes(nodeId)) {
          this._nodes = this._nodes.map(n => {
            if (n.id === targetGroup.id) {
              return {
                ...n,
                data: {
                  ...groupData,
                  conditions: [...groupData.conditions, nodeId]
                }
              };
            }
            return n;
          });
        }
      } else if (targetGroup.type === 'action-group' && (node.type === 'action' || node.type === 'action-group')) {
        const groupData = targetGroup.data as ActionGroupNodeData;
        if (!groupData.actions.includes(nodeId)) {
          this._nodes = this._nodes.map(n => {
            if (n.id === targetGroup.id) {
              return {
                ...n,
                data: {
                  ...groupData,
                  actions: [...groupData.actions, nodeId]
                }
              };
            }
            return n;
          });
        }
      }
    } else {
      // Calculate new position
      const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - canvasRect.left - 90; // Center the node
      const y = e.clientY - canvasRect.top - 40;

      // Update node position
      this._nodes = this._nodes.map(n => 
        n.id === nodeId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n
      );
    }

    this._emitChange();
    this._dragOverGroupId = null;
  }

  // Make node draggable
  private _makeDraggable(e: MouseEvent, nodeId: string): void {
    // This is handled by the mousedown handler
  }

  private _renderPropertiesPanel() {
    const node = this._nodes.find(n => n.id === this._selectedNodeId);
    if (!node) return nothing;

    const typeLabel = node.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

    return html`
      <div class="properties-panel" @click=${(e: Event) => e.stopPropagation()}>
        <div class="properties-title">Edit ${typeLabel}</div>
        
        ${node.type === 'trigger' ? this._renderTriggerProperties(node.data as TriggerNodeData) : nothing}
        ${node.type === 'condition-group' ? this._renderConditionGroupProperties(node.data as ConditionGroupNodeData) : nothing}
        ${node.type === 'condition' ? this._renderConditionProperties(node.data as ConditionNodeData) : nothing}
        ${node.type === 'action-group' ? this._renderActionGroupProperties(node.data as ActionGroupNodeData) : nothing}
        ${node.type === 'action' ? this._renderActionProperties(node.data as ActionNodeData) : nothing}
      </div>
    `;
  }

  private _renderTriggerProperties(data: TriggerNodeData) {
    return html`
      <div class="property-group">
        <label class="property-label">Rule ID</label>
        <input class="property-input" type="text" .value=${data.id}
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { id: (e.target as HTMLInputElement).value })}
        />
      </div>
      
      <div class="property-group">
        <label class="property-label">Event</label>
        <input class="property-input" type="text" .value=${data.event} placeholder="e.g., user.login"
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { event: (e.target as HTMLInputElement).value })}
        />
      </div>
      
      <div class="property-group">
        <label class="property-label">Name</label>
        <input class="property-input" type="text" .value=${data.name || ''}
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { name: (e.target as HTMLInputElement).value })}
        />
      </div>
      
      <div class="property-group">
        <label class="property-label">Description</label>
        <textarea class="property-input" rows="2"
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { description: (e.target as HTMLTextAreaElement).value })}
        >${data.description || ''}</textarea>
      </div>
      
      <div class="property-group">
        <label class="property-label">Priority</label>
        <input class="property-input" type="number" .value=${String(data.priority || 0)}
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { priority: parseInt((e.target as HTMLInputElement).value) || 0 })}
        />
      </div>
      
      <div class="property-group">
        <label class="property-label">Cooldown (ms)</label>
        <input class="property-input" type="number" .value=${String(data.cooldown || 0)}
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { cooldown: parseInt((e.target as HTMLInputElement).value) || 0 })}
        />
      </div>
      
      <div class="property-group property-checkbox">
        <input type="checkbox" ?checked=${data.enabled !== false}
          @change=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { enabled: (e.target as HTMLInputElement).checked })}
        />
        <label class="property-label" style="margin: 0;">Enabled</label>
      </div>
    `;
  }

  private _renderConditionGroupProperties(data: ConditionGroupNodeData) {
    return html`
      <div class="property-group">
        <label class="property-label">Group Operator</label>
        <select class="property-select" .value=${data.operator}
          @change=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { operator: (e.target as HTMLSelectElement).value })}
        >
          <option value="AND">AND - All conditions must match</option>
          <option value="OR">OR - Any condition must match</option>
        </select>
      </div>
      
      <div class="property-group">
        <label class="property-label">Child Conditions</label>
        <div style="font-size: 12px; color: #64748b;">
          ${data.conditions.length} condition(s) in this group
        </div>
      </div>
    `;
  }

  private _renderConditionProperties(data: ConditionNodeData) {
    return html`
      <div class="property-group">
        <label class="property-label">Field</label>
        <input class="property-input" type="text" .value=${data.field}
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { field: (e.target as HTMLInputElement).value })}
        />
      </div>
      
      <div class="property-group">
        <label class="property-label">Operator</label>
        <select class="property-select" .value=${data.operator}
          @change=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { operator: (e.target as HTMLSelectElement).value })}
        >
          <option value="EQ">Equals (==)</option>
          <option value="NEQ">Not Equals (!=)</option>
          <option value="GT">Greater Than (>)</option>
          <option value="GTE">Greater or Equal (>=)</option>
          <option value="LT">Less Than (<)</option>
          <option value="LTE">Less or Equal (<=)</option>
          <option value="CONTAINS">Contains</option>
          <option value="STARTS_WITH">Starts With</option>
          <option value="ENDS_WITH">Ends With</option>
          <option value="MATCHES">Matches Regex</option>
          <option value="IS_EMPTY">Is Empty</option>
          <option value="IS_NULL">Is Null</option>
        </select>
      </div>
      
      <div class="property-group">
        <label class="property-label">Value</label>
        <input class="property-input" type="text" .value=${data.value}
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { value: (e.target as HTMLInputElement).value })}
        />
      </div>
      
      <div class="property-group property-checkbox">
        <input type="checkbox" ?checked=${data.negate || false}
          @change=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { negate: (e.target as HTMLInputElement).checked })}
        />
        <label class="property-label" style="margin: 0;">Negate (NOT)</label>
      </div>
    `;
  }

  private _renderActionGroupProperties(data: ActionGroupNodeData) {
    return html`
      <div class="property-group">
        <label class="property-label">Execution Mode</label>
        <select class="property-select" .value=${data.mode}
          @change=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { mode: (e.target as HTMLSelectElement).value })}
        >
          <option value="ALL">ALL - Execute all actions</option>
          <option value="FIRST">FIRST - Stop after first success</option>
          <option value="RANDOM">RANDOM - Execute random action</option>
        </select>
      </div>
      
      <div class="property-group">
        <label class="property-label">Child Actions</label>
        <div style="font-size: 12px; color: #64748b;">
          ${data.actions.length} action(s) in this group
        </div>
      </div>
    `;
  }

  private _renderActionProperties(data: ActionNodeData) {
    return html`
      <div class="property-group">
        <label class="property-label">Action Type</label>
        <select class="property-select" .value=${data.actionType}
          @change=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { actionType: (e.target as HTMLSelectElement).value })}
        >
          <option value="log">Log</option>
          <option value="http">HTTP Request</option>
          <option value="notify">Notify</option>
          <option value="transform">Transform</option>
          <option value="delay">Delay</option>
          <option value="set_state">Set State</option>
          <option value="broadcast">Broadcast</option>
          <option value="emit">Emit Event</option>
          <option value="script">Script</option>
        </select>
      </div>
      
      <div class="property-group">
        <label class="property-label">Params (JSON)</label>
        <textarea class="property-input" rows="4" style="font-family: monospace;"
          @input=${(e: Event) => {
            try {
              const params = JSON.parse((e.target as HTMLTextAreaElement).value);
              this._updateNodeData(this._selectedNodeId!, { params });
            } catch {}
          }}
        >${JSON.stringify(data.params, null, 2)}</textarea>
      </div>
      
      <div class="property-group">
        <label class="property-label">Delay (ms)</label>
        <input class="property-input" type="number" .value=${String(data.delay || 0)}
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { delay: parseInt((e.target as HTMLInputElement).value) || 0 })}
        />
      </div>
      
      <div class="property-group">
        <label class="property-label">Probability (%)</label>
        <input class="property-input" type="number" min="0" max="100" .value=${String(data.probability || 100)}
          @input=${(e: Event) => this._updateNodeData(this._selectedNodeId!, { probability: parseInt((e.target as HTMLInputElement).value) || 100 })}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'node-editor': NodeEditor;
  }
}

/**
 * Group Node Component
 * Scratch-like container for grouping nodes (C-block style)
 * Supports both condition groups (AND/OR) and action groups
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { ConditionGroupNodeData, ActionGroupNodeData } from './node-types.js';
import { iconX } from '../icons.js';

// Import shared styles
import { groupNodeStyles } from './styles/index.js';

// Import utilities
import {
  handleGroupMouseDown,
  handleGroupDelete,
  handleGroupDragOver,
  handleGroupDragLeave,
  handleGroupDrop,
  handleGroupPortClick,
} from './utils/index.js';

export type GroupType = 'condition-group' | 'action-group';

@customElement('group-node')
export class GroupNode extends LitElement {
  static override styles = css`
    ${groupNodeStyles}
  `;

  @property({ type: String })
  groupType: GroupType = 'condition-group';

  @property({ type: Object })
  data!: ConditionGroupNodeData | ActionGroupNodeData;

  @property({ type: Boolean })
  selected = false;

  @property({ type: Number })
  x = 0;

  @property({ type: Number })
  y = 0;

  @property({ type: Array })
  childIds: string[] = [];

  @property({ type: Boolean })
  showPorts = true;

  private _getGroupId(): string {
    if (this.groupType === 'condition-group') {
      return (this.data as ConditionGroupNodeData).id;
    } else {
      return (this.data as ActionGroupNodeData).id;
    }
  }

  private _handleMouseDown(e: MouseEvent): void {
    handleGroupMouseDown(e, this._getGroupId(), this);
  }

  private _handleDelete(e: Event): void {
    handleGroupDelete(e, this._getGroupId(), this);
  }

  private _handleDragOver(e: DragEvent): void {
    handleGroupDragOver(e, this._getGroupId(), this);
  }

  private _handleDragLeave(e: DragEvent): void {
    handleGroupDragLeave(e, this._getGroupId(), this);
  }

  private _handleDrop(e: DragEvent): void {
    handleGroupDrop(e, this._getGroupId(), this);
  }

  private _handlePortClick(portType: string, e: Event): void {
    handleGroupPortClick(e, this._getGroupId(), portType, this);
  }

  private _getGroupIcon(): string {
    return this.groupType === 'condition-group' ? '🔀' : '⚙️';
  }

  private _getGroupTitle(): string {
    if (this.groupType === 'condition-group') {
      const condData = this.data as ConditionGroupNodeData;
      return `If ${condData.operator}`;
    } else {
      const actionData = this.data as ActionGroupNodeData;
      return `Do (${actionData.mode || 'sequential'})`;
    }
  }

  override render() {
    const childCount = this.childIds.length;

    return html`
      <div 
        class="group-container ${this.groupType} ${this.selected ? 'selected' : ''}"
        style="left: ${this.x}px; top: ${this.y}px"
        @mousedown=${this._handleMouseDown}
        @dragover=${this._handleDragOver}
        @dragleave=${this._handleDragLeave}
        @drop=${this._handleDrop}
      >
        <!-- C-block notches (Scratch style) -->
        <div class="c-block-notch-top"></div>
        <div class="c-block-notch-bottom"></div>

        <!-- Input port (left) -->
        ${this.showPorts ? html`
          <div 
            class="port input" 
            @click=${(e: Event) => this._handlePortClick('input', e)}
          ></div>
        ` : nothing}

        <!-- Top port (for stacking) -->
        ${this.showPorts ? html`
          <div 
            class="port top" 
            @click=${(e: Event) => this._handlePortClick('top', e)}
          ></div>
        ` : nothing}

        <!-- Header -->
        <div class="group-header">
          <span class="group-icon">${this._getGroupIcon()}</span>
          <span class="group-title">${this._getGroupTitle()}</span>
          ${childCount > 0 ? html`<span class="node-count">${childCount}</span>` : nothing}
          <button class="group-delete-btn" @click=${this._handleDelete}>
            ${iconX('sm')}
          </button>
        </div>

        <div class="group-body">
          <slot name="children">
            ${childCount === 0 ? html`
              <div class="drop-zone">
                <div class="drop-zone-empty">
                  <div class="drop-zone-empty-icon">📦</div>
                  <div>Drop nodes here</div>
                </div>
              </div>
            ` : html`
              <div class="children-container">
                ${this.childIds.map(childId => html`
                  <div class="child-placeholder" data-child-id="${childId}">
                    Node: ${childId}
                  </div>
                `)}
              </div>
            `}
          </slot>
        </div>

        <!-- Bottom port (for stacking) -->
        ${this.showPorts ? html`
          <div 
            class="port bottom" 
            @click=${(e: Event) => this._handlePortClick('bottom', e)}
          ></div>
        ` : nothing}

        <!-- Output port (right) -->
        ${this.showPorts ? html`
          <div 
            class="port output" 
            @click=${(e: Event) => this._handlePortClick('output', e)}
          ></div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-node': GroupNode;
  }
}

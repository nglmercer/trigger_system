/**
 * Condition Node Component
 * Visual node for defining conditions
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { ConditionNodeData } from './node-types.js';
import { iconX } from '../icons.js';

// Import shared styles
import { nodeSharedStyles } from './styles/index.js';

// Import utilities
import {
  handleNodeMouseDown,
  handleDeleteClick,
  handlePortClick,
} from './utils/index.js';

@customElement('condition-node')
export class ConditionNode extends LitElement {
  static override styles = css`
    ${nodeSharedStyles}
    
    /* Condition-specific overrides */
    .node {
      --node-border-color: #34d399;
      border: 2px solid #34d399;
    }

    .node-header {
      background: #34d399;
    }

    .port {
      background: #6ee7b7;
    }

    .port:hover {
      background: #10b981;
    }
  `;

  @property({ type: Object })
  data!: ConditionNodeData;

  @property({ type: Boolean })
  selected = false;

  @property({ type: Number })
  x = 0;

  @property({ type: Number })
  y = 0;

  private _handleMouseDown(e: MouseEvent): void {
    handleNodeMouseDown(e, this.data.id, this);
  }

  private _handleDelete(e: Event): void {
    handleDeleteClick(e, this.data.id, this);
  }

  override render() {
    return html`
      <div 
        class="node ${this.selected ? 'selected' : ''}"
        style="left: ${this.x}px; top: ${this.y}px"
        @mousedown=${this._handleMouseDown}
      >
        <div class="port input" @click=${(e: Event) => handlePortClick(e, this.data.id, 'input', this)}></div>
        
        <div class="node-header">
          <span class="node-icon">🔍</span>
          <span class="node-title">Condition</span>
          ${this.data.negate ? html`<span class="negate-badge">NOT</span>` : nothing}
          <button class="icon-btn" @click=${this._handleDelete}>${iconX('sm')}</button>
        </div>
        
        <div class="node-body">
          <div class="node-field">
            <span class="node-field-label">Field</span>
            <span class="node-field-value">${this.data.field}</span>
          </div>
          <div class="node-field">
            <span class="node-field-label">Operator</span>
            <span class="node-field-value">${this.data.operator}</span>
          </div>
          <div class="node-field">
            <span class="node-field-label">Value</span>
            <span class="node-field-value">${this.data.value || '(empty)'}</span>
          </div>
        </div>
        
        <div class="port output" @click=${(e: Event) => handlePortClick(e, this.data.id, 'output', this)}></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'condition-node': ConditionNode;
  }
}

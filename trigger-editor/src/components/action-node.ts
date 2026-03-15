/**
 * Action Node Component
 * Visual node for defining actions
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { ActionNodeData } from './node-types.js';
import { iconX } from '../icons.js';

// Import shared styles
import { nodeSharedStyles, nodeColors } from './styles/index.js';

// Import utilities
import {
  handleNodeMouseDown,
  handleDeleteClick,
  handlePortClick,
  formatJsonForDisplay,
} from './utils/index.js';

@customElement('action-node')
export class ActionNode extends LitElement {
  static override styles = css`
    ${nodeSharedStyles}
    
    /* Action-specific overrides */
    .node {
      --node-border-color: #fbbf24;
      border: 2px solid #fbbf24;
    }

    .node-header {
      background: #fbbf24;
    }

    .port {
      background: #fcd34d;
    }

    .port:hover {
      background: #f59e0b;
    }
  `;

  @property({ type: Object })
  data!: ActionNodeData;

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
    const hasOptions = this.data.delay || this.data.probability !== 100;

    return html`
      <div 
        class="node ${this.selected ? 'selected' : ''}"
        style="left: ${this.x}px; top: ${this.y}px"
        @mousedown=${this._handleMouseDown}
      >
        <div class="port input" @click=${(e: Event) => handlePortClick(e, this.data.id, 'input', this)}></div>
        
        <div class="node-header">
          <span class="node-icon">⚙️</span>
          <span class="node-title">Action</span>
          ${hasOptions ? html`<span class="options-badge">⚡</span>` : nothing}
          <button class="icon-btn" @click=${this._handleDelete}>${iconX('sm')}</button>
        </div>
        
        <div class="node-body">
          <div class="node-field">
            <span class="node-field-label">Type</span>
            <span class="node-field-value">${this.data.actionType}</span>
          </div>
          <div class="node-field">
            <span class="node-field-label">Params</span>
            <span class="node-field-value">${formatJsonForDisplay(this.data.params, 40)}</span>
          </div>
          ${this.data.delay ? html`
            <div class="node-field">
              <span class="node-field-label">Delay</span>
              <span class="node-field-value">${this.data.delay}ms</span>
            </div>
          ` : nothing}
          ${this.data.probability && this.data.probability !== 100 ? html`
            <div class="node-field">
              <span class="node-field-label">Probability</span>
              <span class="node-field-value">${this.data.probability}%</span>
            </div>
          ` : nothing}
        </div>
        
        <div class="port output" @click=${(e: Event) => handlePortClick(e, this.data.id, 'output', this)}></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'action-node': ActionNode;
  }
}

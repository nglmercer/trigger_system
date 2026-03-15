/**
 * Trigger Node Component
 * Visual node for defining trigger/event
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { TriggerNodeData } from './node-types.js';
import { iconX } from '../icons.js';

// Import shared styles
import { nodeSharedStyles } from './styles/index.js';

// Import utilities
import {
  handleNodeMouseDown,
  handleDeleteClick,
  handlePortClick,
} from './utils/index.js';

@customElement('trigger-node')
export class TriggerNode extends LitElement {
  static override styles = css`
    ${nodeSharedStyles}
    
    /* Trigger-specific overrides */
    .node {
      --node-border-color: #8b5cf6;
      border: 2px solid #8b5cf6;
    }

    .node-header {
      background: #8b5cf6;
    }

    .port {
      background: #a78bfa;
    }

    .port:hover {
      background: #8b5cf6;
    }
  `;

  @property({ type: Object })
  data!: TriggerNodeData;

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
        <div class="node-header">
          <span class="node-icon">⚡</span>
          <span class="node-title">Trigger</span>
          <button class="icon-btn" @click=${this._handleDelete}>${iconX('sm')}</button>
        </div>
        
        <div class="node-body">
          <div class="node-field">
            <span class="node-field-label">Event</span>
            <span class="node-field-value">${this.data.event || '(not set)'}</span>
          </div>
          <div class="node-field">
            <span class="node-field-label">ID</span>
            <span class="node-field-value">${this.data.id || '(not set)'}</span>
          </div>
          ${this.data.name ? html`
            <div class="node-field">
              <span class="node-field-label">Name</span>
              <span class="node-field-value">${this.data.name}</span>
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
    'trigger-node': TriggerNode;
  }
}

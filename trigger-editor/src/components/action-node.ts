/**
 * Action Node Component
 * Visual node for defining actions
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { ActionNodeData } from './node-types.js';
import { iconX } from '../icons.js';

@customElement('action-node')
export class ActionNode extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .node {
      position: absolute;
      min-width: 180px;
      background: var(--color-surface, #ffffff);
      border: 2px solid #fbbf24;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      cursor: move;
      user-select: none;
    }

    .node:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .node.selected {
      border-color: var(--color-primary, #2563eb);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    .node-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #fbbf24;
      color: white;
      border-radius: 6px 6px 0 0;
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

    .port {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #e2e8f0;
      border: 2px solid #ffffff;
      border-radius: 50%;
      cursor: crosshair;
      z-index: 10;
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

    .port:hover {
      background: #2563eb;
      transform: translateY(-50%) scale(1.3);
    }

    .icon-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 2px;
      color: white;
      opacity: 0.8;
    }

    .icon-btn:hover {
      opacity: 1;
    }

    .options-badge {
      font-size: 10px;
      background: rgba(255,255,255,0.3);
      padding: 2px 4px;
      border-radius: 4px;
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
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('node-select', {
      detail: { nodeId: this.data.id },
      bubbles: true,
      composed: true
    }));
  }

  private _handleDelete(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('node-delete', {
      detail: { nodeId: this.data.id },
      bubbles: true,
      composed: true
    }));
  }

  override render() {
    const hasOptions = this.data.delay || this.data.probability !== 100;

    return html`
      <div 
        class="node ${this.selected ? 'selected' : ''}"
        style="left: ${this.x}px; top: ${this.y}px"
        @mousedown=${this._handleMouseDown}
      >
        <div class="port input" @click=${(e: Event) => {
          e.stopPropagation();
          this.dispatchEvent(new CustomEvent('port-click', {
            detail: { nodeId: this.data.id, portType: 'input' },
            bubbles: true,
            composed: true
          }));
        }}></div>
        
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
            <span class="node-field-value">${JSON.stringify(this.data.params).slice(0, 40)}${JSON.stringify(this.data.params).length > 40 ? '...' : ''}</span>
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
        
        <div class="port output" @click=${(e: Event) => {
          e.stopPropagation();
          this.dispatchEvent(new CustomEvent('port-click', {
            detail: { nodeId: this.data.id, portType: 'output' },
            bubbles: true,
            composed: true
          }));
        }}></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'action-node': ActionNode;
  }
}

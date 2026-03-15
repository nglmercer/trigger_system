/**
 * Trigger Node Component
 * Visual node for defining trigger/event
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { TriggerNodeData } from './node-types.js';
import { iconX } from '../icons.js';

@customElement('trigger-node')
export class TriggerNode extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .node {
      position: absolute;
      min-width: 180px;
      background: var(--color-surface, #ffffff);
      border: 2px solid #8b5cf6;
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
      background: #8b5cf6;
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
      top: 50%;
      right: -6px;
      transform: translateY(-50%);
      cursor: crosshair;
      z-index: 10;
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
        
        <div class="port" @click=${(e: Event) => {
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
    'trigger-node': TriggerNode;
  }
}

import { nothing } from 'lit';

/**
 * Rule List Component
 * Displays a list of trigger rules
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import type { TriggerRule } from '../types.js';

@customElement('rule-list')
export class RuleList extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      --primary-color: #2563eb;
      --success-color: #16a34a;
      --text: #1e293b;
      --text-secondary: #64748b;
      --border: #e2e8f0;
      --surface: #f8fafc;
      --radius: 6px;
    }

    :host([darkmode]) {
      --text: #f1f5f9;
      --text-secondary: #94a3b8;
      --border: #475569;
      --surface: #334155;
    }

    .rule-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .rule-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      gap: 12px;
    }

    .rule-item:last-child {
      border-bottom: none;
    }

    .rule-info {
      flex: 1;
      min-width: 0;
    }

    .rule-id {
      font-weight: 600;
      color: var(--text);
      font-size: 14px;
    }

    .rule-meta {
      display: flex;
      gap: 8px;
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .rule-event {
      background: var(--primary-color);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
    }

    .rule-enabled {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--success-color);
    }

    .rule-disabled {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--text-secondary);
    }

    .rule-actions {
      display: flex;
      gap: 4px;
    }

    .icon-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: var(--radius);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .icon-btn:hover {
      background: var(--surface);
      color: var(--text);
    }

    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  `;

  @property({ type: Array })
  rules: TriggerRule[] = [];

  // --- Event Handlers ---

  private _emitEdit(rule: TriggerRule): void {
    this.dispatchEvent(new CustomEvent('rule-edit', {
      detail: rule,
      bubbles: true,
      composed: true
    }));
  }

  private _emitDelete(rule: TriggerRule): void {
    this.dispatchEvent(new CustomEvent('rule-delete', {
      detail: rule,
      bubbles: true,
      composed: true
    }));
  }

  // --- Render ---

  override render() {
    if (this.rules.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No rules defined yet</p>
        </div>
      `;
    }

    return html`
      <div class="rule-list">
        ${map(this.rules, (rule) => html`
          <div class="rule-item">
            <div class="${rule.enabled ? 'rule-enabled' : 'rule-disabled'}"></div>
            
            <div class="rule-info">
              <div class="rule-id">${rule.id}</div>
              <div class="rule-meta">
                <span class="rule-event">on: ${rule.on}</span>
                ${rule.name ? html`<span>${rule.name}</span>` : nothing}
                ${rule.priority ? html`<span>Priority: ${rule.priority}</span>` : nothing}
              </div>
            </div>
            
            <div class="rule-actions">
              <button class="icon-btn" title="Edit" @click=${() => this._emitEdit(rule)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="icon-btn" title="Delete" @click=${() => this._emitDelete(rule)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rule-list': RuleList;
  }
}

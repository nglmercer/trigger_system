/**
 * Rule List Component
 * Displays a list of trigger rules
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import type { TriggerRule } from '../types.js';

// Import constants
import {
  LABELS,
  CLASS_NAMES,
  EVENTS,
} from '../constants.js';

// Import styles
import {
  baseComponentStyles,
  iconButtonStyles,
  listStyles,
  emptyStateStyles,
  combineStyles,
} from '../styles.js';

// Import icons
import { iconEdit, iconTrash } from '../icons.js';

@customElement('rule-list')
export class RuleList extends LitElement {
  // Combine styles
  static override styles = combineStyles(
    baseComponentStyles,
    iconButtonStyles,
    listStyles,
    emptyStateStyles
  );

  @property({ type: Array })
  rules: TriggerRule[] = [];

  // --- Event Handlers ---

  private _emitEdit(rule: TriggerRule): void {
    this.dispatchEvent(new CustomEvent(EVENTS.RULE_EDIT, {
      detail: rule,
      bubbles: true,
      composed: true
    }));
  }

  private _emitDelete(rule: TriggerRule): void {
    this.dispatchEvent(new CustomEvent(EVENTS.RULE_DELETE, {
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
          <p>${LABELS.NO_RULES}</p>
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
              <button class="icon-btn" title=${LABELS.TOOLTIP_EDIT} @click=${() => this._emitEdit(rule)}>
                ${iconEdit('md')}
              </button>
              <button class="icon-btn" title=${LABELS.TOOLTIP_DELETE} @click=${() => this._emitDelete(rule)}>
                ${iconTrash('md')}
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

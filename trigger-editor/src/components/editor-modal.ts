/**
 * Editor Modal Component
 * A modal dialog for the rule editor
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

// Import constants
import {
  COLORS,
  SIZES,
  TYPOGRAPHY,
  ANIMATION,
  Z_INDEX,
  SHADOWS,
  LABELS,
  CLASS_NAMES,
  EVENTS,
} from '../constants.js';

// Import styles
import {
  baseComponentStyles,
  buttonStyles,
  iconButtonStyles,
  modalStyles,
  combineStyles,
} from '../styles.js';

// Import icons
import { iconX } from '../icons.js';

@customElement('editor-modal')
export class EditorModal extends LitElement {
  // Combine styles
  static override styles = combineStyles(
    baseComponentStyles,
    buttonStyles,
    iconButtonStyles,
    modalStyles
  );

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: String })
  modalTitle = '';

  @property({ type: String })
  confirmText = LABELS.SAVE;

  @property({ type: Boolean })
  isEdit = false;

  @state()
  private _showFooter = true;

  // --- Event Handlers ---

  private _handleOverlayClick(e: Event): void {
    if (e.target === e.currentTarget) {
      this._emitClose();
    }
  }

  private _emitClose(): void {
    this.dispatchEvent(new CustomEvent(EVENTS.MODAL_CLOSE, {
      bubbles: true,
      composed: true
    }));
  }

  private _emitConfirm(): void {
    this.dispatchEvent(new CustomEvent(EVENTS.MODAL_CONFIRM, {
      bubbles: true,
      composed: true
    }));
  }

  // --- Render ---

  override render() {
    return when(this.open, () => html`
      <div class="modal-overlay" @click=${this._handleOverlayClick}>
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">
              ${this.isEdit ? LABELS.EDIT_RULE_TITLE : LABELS.NEW_RULE_TITLE}
            </h2>
            <button class="icon-btn" @click=${this._emitClose} title=${LABELS.CLOSE}>
              ${iconX('lg')}
            </button>
          </div>
          
          <div class="modal-body">
            <slot></slot>
          </div>
          
          ${when(this._showFooter, () => html`
            <div class="modal-footer">
              <button class="btn btn-secondary" @click=${this._emitClose}>${LABELS.CANCEL}</button>
              <button class="btn btn-primary" @click=${this._emitConfirm}>
                ${this.confirmText}
              </button>
            </div>
          `)}
        </div>
      </div>
    `);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-modal': EditorModal;
  }
}

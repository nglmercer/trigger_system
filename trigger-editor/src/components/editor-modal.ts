/**
 * Editor Modal Component
 * A modal dialog for the rule editor
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

@customElement('editor-modal')
export class EditorModal extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      --text: #1e293b;
      --border: #e2e8f0;
      --background: #ffffff;
    }

    :host([darkmode]) {
      --text: #f1f5f9;
      --border: #475569;
      --background: #1e293b;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: var(--background);
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      width: 90%;
      max-width: 700px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 16px 20px;
      border-top: 1px solid var(--border);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: #f8fafc;
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .icon-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
    }

    .icon-btn:hover {
      background: #f1f5f9;
      color: var(--text);
    }
  `;

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: String })
  modalTitle = '';

  @property({ type: String })
  confirmText = 'Save';

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
    this.dispatchEvent(new CustomEvent('modal-close', {
      bubbles: true,
      composed: true
    }));
  }

  private _emitConfirm(): void {
    this.dispatchEvent(new CustomEvent('modal-confirm', {
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
              ${this.isEdit ? 'Edit Rule' : 'New Rule'}
            </h2>
            <button class="icon-btn" @click=${this._emitClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <slot></slot>
          </div>
          
          ${when(this._showFooter, () => html`
            <div class="modal-footer">
              <button class="btn btn-secondary" @click=${this._emitClose}>Cancel</button>
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

/**
 * CSS Builder Utility
 * A fluent API for building LitElement CSS in a more maintainable way
 * Uses CSS custom properties for theming with prefers-color-scheme support
 */

import { css, type CSSResultGroup } from 'lit';

// Re-export everything from constants for convenience
export * from './constants.js';

// ======================
// CSS Custom Properties (Theme Variables)
// ======================

/**
 * CSS Variables for theming:
 * 
 * Light theme:
 *   --color-primary: #2563eb
 *   --color-primary-hover: #1d4ed8
 *   --color-success: #16a34a
 *   --color-danger: #dc2626
 *   --color-text: #1e293b
 *   --color-text-secondary: #64748b
 *   --color-border: #e2e8f0
 *   --color-background: #ffffff
 *   --color-surface: #f8fafc
 * 
 * Dark theme (prefers-color-scheme: dark or [darkmode]):
 *   --color-text: #f1f5f9
 *   --color-text-secondary: #94a3b8
 *   --color-border: #475569
 *   --color-background: #1e293b
 *   --color-surface: #334155
 */

// ======================
// Pre-built Style Mixins
// These use CSS variables for proper light/dark theme support
// ======================

/**
 * Common button styles
 */
export const buttonStyles: CSSResultGroup = css`
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-primary {
    background: var(--color-primary, #2563eb);
    color: #ffffff;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover, #1d4ed8);
  }

  .btn-secondary {
    background: var(--color-surface, #f8fafc);
    color: var(--color-text, #1e293b);
    border: 1px solid var(--color-border, #e2e8f0);
  }

  .btn-secondary:hover {
    background: var(--color-border, #e2e8f0);
  }

  .btn-sm {
    padding: 4px 8px;
    font-size: 12px;
  }

  .btn-danger {
    background: var(--color-danger, #dc2626);
    color: #ffffff;
  }

  .btn-danger:hover {
    background: #ef4444;
  }
`;

/**
 * Common icon button styles
 */
export const iconButtonStyles: CSSResultGroup = css`
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
    color: var(--color-text-secondary, #64748b);
    transition: all 0.15s ease;
  }

  .icon-btn:hover {
    background: var(--color-surface, #f8fafc);
    color: var(--color-text, #1e293b);
  }
`;

/**
 * Common form input styles
 */
export const formInputStyles: CSSResultGroup = css`
  .form-input,
  .form-select,
  .form-textarea {
    padding: 8px 12px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px;
    font-size: 14px;
    background: var(--color-background, #ffffff);
    color: var(--color-text, #1e293b);
    transition: all 0.15s ease;
  }

  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    border-color: var(--color-primary, #2563eb);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-textarea {
    resize: vertical;
    min-height: 60px;
  }
`;

/**
 * Common form label styles
 */
export const formLabelStyles: CSSResultGroup = css`
  .form-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text, #1e293b);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
`;

/**
 * Common modal styles
 */
export const modalStyles: CSSResultGroup = css`
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
    background: var(--color-background, #ffffff);
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
    border-bottom: 1px solid var(--color-border, #e2e8f0);
  }

  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text, #1e293b);
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
    border-top: 1px solid var(--color-border, #e2e8f0);
  }
`;

/**
 * Base component styles (font family, colors)
 * This defines the CSS custom properties for theming
 * Supports: light theme, dark theme via [darkmode] attribute or prefers-color-scheme
 */
export const baseComponentStyles: CSSResultGroup = css`
  :host {
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    
    /* Light theme (default) */
    --color-text: #1e293b;
    --color-text-secondary: #64748b;
    --color-border: #e2e8f0;
    --color-background: #ffffff;
    --color-surface: #f8fafc;
    --color-primary: #2563eb;
    --color-primary-hover: #1d4ed8;
    --color-success: #16a34a;
    --color-danger: #dc2626;
    --radius: 6px;
  }

  /* Dark theme via attribute on host */
  :host([darkmode]) {
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-border: #475569;
    --color-background: #1e293b;
    --color-surface: #334155;
  }

  /* Dark theme via attribute on any ancestor (for nested components) */
  :host-context([darkmode]) {
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-border: #475569;
    --color-background: #1e293b;
    --color-surface: #334155;
  }

  /* Auto dark mode based on system preference */
  @media (prefers-color-scheme: dark) {
    :host {
      --color-text: #f1f5f9;
      --color-text-secondary: #94a3b8;
      --color-border: #475569;
      --color-background: #1e293b;
      --color-surface: #334155;
    }
  }
`; // End of baseComponentStyles

/**
 * List styles
 */
export const listStyles: CSSResultGroup = css`
  .rule-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .rule-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border, #e2e8f0);
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
    color: var(--color-text, #1e293b);
    font-size: 14px;
  }

  .rule-meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: var(--color-text-secondary, #64748b);
    margin-top: 4px;
  }

  .rule-event {
    background: var(--color-primary, #2563eb);
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
  }

  .rule-enabled {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-success, #16a34a);
  }

  .rule-disabled {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-text-secondary, #64748b);
  }

  .rule-actions {
    display: flex;
    gap: 4px;
  }
`;

/**
 * Empty state styles
 */
export const emptyStateStyles: CSSResultGroup = css`
  .empty-state {
    padding: 48px 20px;
    text-align: center;
    color: var(--color-text-secondary, #64748b);
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
`;

/**
 * Form section styles
 */
export const formSectionStyles: CSSResultGroup = css`
  .form-section {
    margin-bottom: 20px;
  }

  .form-section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text, #1e293b);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .form-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .form-checkbox input {
    width: 16px;
    height: 16px;
  }
`;

/**
 * Condition/Action list styles
 */
export const conditionListStyles: CSSResultGroup = css`
  .condition-list,
  .action-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .condition-item,
  .action-item {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 12px;
    background: var(--color-surface, #f8fafc);
    border-radius: 6px;
    flex-wrap: wrap;
  }

  .condition-item .form-input,
  .condition-item .form-select,
  .action-item .form-input,
  .action-item .form-select {
    flex: 1;
    min-width: 100px;
  }

  .condition-value {
    flex: 2;
    min-width: 150px;
  }
`;

/**
 * Tags input styles
 */
export const tagsInputStyles: CSSResultGroup = css`
  .tags-input {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px;
    min-height: 40px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--color-primary, #2563eb);
    color: #ffffff;
    border-radius: 3px;
    font-size: 12px;
  }

  .tag-remove {
    cursor: pointer;
    opacity: 0.7;
  }

  .tag-remove:hover {
    opacity: 1;
  }

  .tag-input {
    border: none;
    outline: none;
    flex: 1;
    min-width: 80px;
    font-size: 14px;
    background: transparent;
    color: var(--color-text, #1e293b);
  }
`;

/**
 * Validation error styles
 */
export const validationErrorStyles: CSSResultGroup = css`
  .validation-error {
    color: var(--color-danger, #dc2626);
    font-size: 12px;
    margin-top: 4px;
  }
`;

/**
 * Preview section styles
 */
export const previewStyles: CSSResultGroup = css`
  .preview-section {
    margin-top: 16px;
    padding: 12px;
    background: var(--color-surface, #1e1e1e);
    border-radius: 6px;
    overflow-x: auto;
  }

  .preview-code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    color: var(--color-text, #d4d4d4);
    white-space: pre;
    margin: 0;
  }
`;

/**
 * Toolbar styles
 */
export const toolbarStyles: CSSResultGroup = css`
  .toolbar {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: var(--color-surface, #f8fafc);
    border-bottom: 1px solid var(--color-border, #e2e8f0);
    align-items: center;
    flex-wrap: wrap;
  }

  .toolbar-title {
    font-weight: 600;
    color: var(--color-text, #1e293b);
    margin-right: auto;
  }
`;

/**
 * Editor container styles
 */
export const editorStyles: CSSResultGroup = css`
  .editor {
    background: var(--color-background, #ffffff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px;
    overflow: hidden;
  }
`;

// ======================
// Utility Functions
// ======================

/**
 * Combine multiple CSSResultGroup into one
 */
export function combineStyles(...styles: CSSResultGroup[]): CSSResultGroup {
  return styles.flat();
}

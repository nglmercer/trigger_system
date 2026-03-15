/**
 * Node Component Styles
 * Shared CSS for all node components in the visual editor
 * Uses CSS custom properties for theming
 */

import { css, type CSSResultGroup } from 'lit';

export const nodeSharedStyles: CSSResultGroup = css`
  :host {
    display: block;
  }

  /* Base Node Container */
  .node {
    position: absolute;
    min-width: 180px;
    background: var(--color-surface, #ffffff);
    border: 2px solid var(--node-border-color, #e2e8f0);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: move;
    user-select: none;
    transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  }

  .node:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .node.selected {
    border-color: var(--color-primary, #2563eb);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }

  /* Node Header */
  .node-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--node-header-bg, #64748b);
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

  /* Node Body */
  .node-body {
    padding: 12px;
  }

  /* Node Fields */
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

  /* Ports */
  .port {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #e2e8f0;
    border: 2px solid #ffffff;
    border-radius: 50%;
    cursor: crosshair;
    transition: background 0.15s ease, transform 0.15s ease;
    z-index: 10;
  }

  .port:hover {
    background: #2563eb;
    transform: scale(1.3);
  }

  .port.input {
    top: 50%;
    left: -6px;
    transform: translateY(-50%);
  }

  .port.input:hover {
    transform: translateY(-50%) scale(1.3);
  }

  .port.output {
    top: 50%;
    right: -6px;
    transform: translateY(-50%);
  }

  .port.output:hover {
    transform: translateY(-50%) scale(1.3);
  }

  /* Icon Button */
  .icon-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px;
    color: white;
    opacity: 0.8;
    transition: opacity 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    opacity: 1;
  }

  /* Badge */
  .options-badge,
  .negate-badge {
    font-size: 10px;
    background: rgba(255, 255, 255, 0.3);
    padding: 2px 4px;
    border-radius: 4px;
  }

  /* Node Count Badge */
  .node-count {
    font-size: 10px;
    background: rgba(255, 255, 255, 0.3);
    padding: 2px 6px;
    border-radius: 8px;
  }

  /* Dark Mode */
  :host([darkmode]) .node {
    background: #1e293b;
    border-color: #475569;
  }

  :host([darkmode]) .node-field-value {
    background: #334155;
    color: #f1f5f9;
  }

  :host([darkmode]) .port {
    background: #475569;
    border-color: #1e293b;
  }

  :host([darkmode]) .port:hover {
    background: #3b82f6;
  }
`;

// Node type colors configuration
export const nodeColors = {
  trigger: {
    border: '#8b5cf6',
    headerBg: '#8b5cf6',
    port: '#a78bfa',
    portHover: '#8b5cf6',
  },
  condition: {
    border: '#34d399',
    headerBg: '#34d399',
    port: '#6ee7b7',
    portHover: '#10b981',
  },
  conditionGroup: {
    border: '#10b981',
    headerBg: '#10b981',
    port: '#6ee7b7',
    portHover: '#059669',
  },
  action: {
    border: '#fbbf24',
    headerBg: '#fbbf24',
    port: '#fcd34d',
    portHover: '#f59e0b',
  },
  actionGroup: {
    border: '#f59e0b',
    headerBg: '#f59e0b',
    port: '#fcd34d',
    portHover: '#d97706',
  },
} as const;

// Node type icons
export const nodeIcons = {
  trigger: '⚡',
  condition: '🔍',
  conditionGroup: '🔀',
  action: '⚙️',
  actionGroup: '📦',
} as const;

// Node type titles
export const nodeTitles = {
  trigger: 'Trigger',
  condition: 'Condition',
  conditionGroup: 'If',
  action: 'Action',
  actionGroup: 'Do',
} as const;

export default nodeSharedStyles;

/**
 * Group Node Styles
 * Shared CSS for group/container nodes (C-block style)
 */

import { css, type CSSResultGroup } from 'lit';

export const groupNodeStyles: CSSResultGroup = css`
  :host {
    display: block;
  }

  .group-container {
    position: relative;
    min-width: 280px;
    min-height: 120px;
    background: var(--color-surface, #ffffff);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: move;
    user-select: none;
    transition: box-shadow 0.15s ease;
  }

  .group-container:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .group-container.selected {
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  /* Condition Group Styles - Green C-Block */
  .group-container.condition-group {
    border: 2px solid #10b981;
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  }

  .group-container.condition-group .group-header {
    background: #10b981;
  }

  /* Action Group Styles - Yellow/Orange C-Block */
  .group-container.action-group {
    border: 2px solid #f59e0b;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  }

  .group-container.action-group .group-header {
    background: #f59e0b;
  }

  /* Top bar (like Scratch C-block) */
  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px 10px 0 0;
    color: white;
  }

  .group-icon {
    font-size: 16px;
  }

  .group-title {
    font-size: 14px;
    font-weight: 600;
    flex: 1;
  }

  .group-badge {
    font-size: 10px;
    background: rgba(255,255,255,0.3);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .group-delete-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px;
    color: white;
    opacity: 0.8;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .group-delete-btn:hover {
    opacity: 1;
    background: rgba(255,255,255,0.2);
  }

  /* C-block notch (top) - Scratch style */
  .c-block-notch-top {
    position: absolute;
    top: -10px;
    left: 30px;
    width: 24px;
    height: 10px;
    background: inherit;
    border-radius: 4px 4px 0 0;
  }

  .group-container.condition-group .c-block-notch-top {
    background: #10b981;
  }

  .group-container.action-group .c-block-notch-top {
    background: #f59e0b;
  }

  /* C-block notch (bottom) - Scratch style */
  .c-block-notch-bottom {
    position: absolute;
    bottom: -10px;
    left: 30px;
    width: 24px;
    height: 10px;
    background: inherit;
    border-radius: 0 0 4px 4px;
  }

  .group-container.condition-group .c-block-notch-bottom {
    background: #10b981;
  }

  .group-container.action-group .c-block-notch-bottom {
    background: #f59e0b;
  }

  /* Body container for child nodes */
  .group-body {
    padding: 20px 16px 24px 16px;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Drop zone indicator */
  .drop-zone {
    min-height: 50px;
    border: 2px dashed transparent;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .drop-zone.drag-over {
    border-color: var(--color-primary, #2563eb);
    background: rgba(37, 99, 235, 0.1);
  }

  .drop-zone-empty {
    color: var(--color-text-secondary, #64748b);
    font-size: 12px;
    text-align: center;
  }

  .drop-zone-empty-icon {
    font-size: 24px;
    margin-bottom: 4px;
    opacity: 0.5;
  }

  /* Input/Output ports */
  .port {
    position: absolute;
    width: 14px;
    height: 14px;
    background: #e2e8f0;
    border: 2px solid #ffffff;
    border-radius: 4px;
    cursor: crosshair;
    transition: all 0.15s ease;
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .port:hover {
    transform: scale(1.2);
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }

  /* Condition group ports */
  .group-container.condition-group .port {
    background: #34d399;
  }

  .group-container.condition-group .port:hover {
    background: #10b981;
  }

  /* Action group ports */
  .group-container.action-group .port {
    background: #fbbf24;
  }

  .group-container.action-group .port:hover {
    background: #f59e0b;
  }

  /* Input port (left side) */
  .port.input {
    top: 50%;
    left: -7px;
    transform: translateY(-50%);
  }

  .port.input:hover {
    transform: translateY(-50%) scale(1.2);
  }

  /* Output port (right side) */
  .port.output {
    top: 50%;
    right: -7px;
    transform: translateY(-50%);
  }

  .port.output:hover {
    transform: translateY(-50%) scale(1.2);
  }

  /* Top port (for C-block input) */
  .port.top {
    top: -7px;
    left: 50%;
    transform: translateX(-50%);
  }

  .port.top:hover {
    transform: translateX(-50%) scale(1.2);
  }

  /* Bottom port (for C-block output) */
  .port.bottom {
    bottom: -7px;
    left: 50%;
    transform: translateX(-50%);
  }

  .port.bottom:hover {
    transform: translateX(-50%) scale(1.2);
  }

  /* Children slots */
  .children-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .child-placeholder {
    padding: 8px 12px;
    background: rgba(255,255,255,0.7);
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
  }

  /* Node count badge */
  .node-count {
    font-size: 10px;
    background: rgba(255,255,255,0.3);
    padding: 2px 6px;
    border-radius: 8px;
  }

  /* Dark mode */
  :host([darkmode]) .group-container {
    background: #1e293b;
  }

  :host([darkmode]) .group-container.condition-group {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
  }

  :host([darkmode]) .group-container.action-group {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
  }

  :host([darkmode]) .group-body {
    background: rgba(255,255,255,0.05);
  }

  :host([darkmode]) .drop-zone-empty {
    color: #94a3b8;
  }
`;

export default groupNodeStyles;

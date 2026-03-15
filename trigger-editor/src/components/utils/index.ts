/**
 * Node Component Utilities
 * Shared utility functions for node components
 */

/**
 * Dispatch a custom event for node selection
 */
export function createNodeSelectEvent(nodeId: string): CustomEvent {
  return new CustomEvent('node-select', {
    detail: { nodeId },
    bubbles: true,
    composed: true,
  });
}

/**
 * Dispatch a custom event for node deletion
 */
export function createNodeDeleteEvent(nodeId: string): CustomEvent {
  return new CustomEvent('node-delete', {
    detail: { nodeId },
    bubbles: true,
    composed: true,
  });
}

/**
 * Dispatch a custom event for port click
 */
export function createPortClickEvent(nodeId: string, portType: 'input' | 'output'): CustomEvent {
  return new CustomEvent('port-click', {
    detail: { nodeId, portType },
    bubbles: true,
    composed: true,
  });
}

/**
 * Dispatch a custom event for group selection
 */
export function createGroupSelectEvent(groupId: string): CustomEvent {
  return new CustomEvent('group-select', {
    detail: { groupId },
    bubbles: true,
    composed: true,
  });
}

/**
 * Dispatch a custom event for group deletion
 */
export function createGroupDeleteEvent(groupId: string): CustomEvent {
  return new CustomEvent('group-delete', {
    detail: { groupId },
    bubbles: true,
    composed: true,
  });
}

/**
 * Dispatch a custom event for group drag over
 */
export function createGroupDragOverEvent(groupId: string): CustomEvent {
  return new CustomEvent('group-drag-over', {
    detail: { groupId },
    bubbles: true,
    composed: true,
  });
}

/**
 * Dispatch a custom event for group drag leave
 */
export function createGroupDragLeaveEvent(groupId: string): CustomEvent {
  return new CustomEvent('group-drag-leave', {
    detail: { groupId },
    bubbles: true,
    composed: true,
  });
}

/**
 * Dispatch a custom event for group drop
 */
export function createGroupDropEvent(groupId: string, nodeId: string): CustomEvent {
  return new CustomEvent('group-drop', {
    detail: { groupId, nodeId },
    bubbles: true,
    composed: true,
  });
}

/**
 * Dispatch a custom event for group port click
 */
export function createGroupPortClickEvent(groupId: string, portType: string): CustomEvent {
  return new CustomEvent('port-click', {
    detail: { groupId, portType },
    bubbles: true,
    composed: true,
  });
}

/**
 * Handle mouse down event for node selection
 */
export function handleNodeMouseDown(e: MouseEvent, nodeId: string, target: EventTarget): void {
  e.stopPropagation();
  const event = createNodeSelectEvent(nodeId);
  (target as HTMLElement).dispatchEvent(event);
}

/**
 * Handle delete button click
 */
export function handleDeleteClick(e: Event, nodeId: string, target: EventTarget): void {
  e.stopPropagation();
  const event = createNodeDeleteEvent(nodeId);
  (target as HTMLElement).dispatchEvent(event);
}

/**
 * Handle port click
 */
export function handlePortClick(e: Event, nodeId: string, portType: 'input' | 'output', target: EventTarget): void {
  e.stopPropagation();
  const event = createPortClickEvent(nodeId, portType);
  (target as HTMLElement).dispatchEvent(event);
}

/**
 * Handle group mouse down
 */
export function handleGroupMouseDown(e: MouseEvent, groupId: string, target: EventTarget): void {
  e.stopPropagation();
  const event = createGroupSelectEvent(groupId);
  (target as HTMLElement).dispatchEvent(event);
}

/**
 * Handle group delete
 */
export function handleGroupDelete(e: Event, groupId: string, target: EventTarget): void {
  e.stopPropagation();
  const event = createGroupDeleteEvent(groupId);
  (target as HTMLElement).dispatchEvent(event);
}

/**
 * Handle group drag over
 */
export function handleGroupDragOver(e: DragEvent, groupId: string, target: EventTarget): void {
  e.preventDefault();
  e.stopPropagation();
  const event = createGroupDragOverEvent(groupId);
  (target as HTMLElement).dispatchEvent(event);
}

/**
 * Handle group drag leave
 */
export function handleGroupDragLeave(e: DragEvent, groupId: string, target: EventTarget): void {
  e.preventDefault();
  e.stopPropagation();
  const event = createGroupDragLeaveEvent(groupId);
  (target as HTMLElement).dispatchEvent(event);
}

/**
 * Handle group drop
 */
export function handleGroupDrop(e: DragEvent, groupId: string, target: EventTarget): void {
  e.preventDefault();
  e.stopPropagation();
  const nodeId = e.dataTransfer?.getData('text/plain');
  if (nodeId) {
    const event = createGroupDropEvent(groupId, nodeId);
    (target as HTMLElement).dispatchEvent(event);
  }
}

/**
 * Handle group port click
 */
export function handleGroupPortClick(e: Event, groupId: string, portType: string, target: EventTarget): void {
  e.stopPropagation();
  const event = createGroupPortClickEvent(groupId, portType);
  (target as HTMLElement).dispatchEvent(event);
}

/**
 * Generate a unique ID for nodes
 */
export function generateNodeId(prefix: string = 'node'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format JSON for display
 */
export function formatJsonForDisplay(obj: unknown, maxLength: number = 40): string {
  const json = JSON.stringify(obj);
  return truncateText(json, maxLength);
}

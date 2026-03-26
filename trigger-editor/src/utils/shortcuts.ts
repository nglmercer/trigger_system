export type ShortcutAction =
  | 'UNDO'
  | 'REDO'
  | 'COPY'
  | 'PASTE'
  | 'DELETE'
  | 'EXPORT'
  | 'SAVE'
  | 'CLEAR'
  | 'ADD_PARAM'
  | 'REMOVE_PARAM';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
}

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, ShortcutConfig> = {
  UNDO: { key: 'z', ctrl: true, meta: true, description: 'shortcuts.undo' },
  REDO: { key: 'z', ctrl: true, meta: true, shift: true, description: 'shortcuts.redo' },
  COPY: { key: 'c', ctrl: true, meta: true, description: 'shortcuts.copy' },
  PASTE: { key: 'v', ctrl: true, meta: true, description: 'shortcuts.paste' },
  DELETE: { key: 'Backspace', description: 'shortcuts.delete' }, // Also handled by React Flow for nodes
  EXPORT: { key: 'e', ctrl: true, meta: true, description: 'shortcuts.export' },
  SAVE: { key: 's', ctrl: true, meta: true, description: 'shortcuts.save' },
  CLEAR: { key: 'l', ctrl: true, meta: true, shift: true, description: 'shortcuts.clear' },
  ADD_PARAM: { key: 'n', alt: true, description: 'paramsModal.addParam' },
  REMOVE_PARAM: { key: 'Delete', description: 'paramsModal.remove' },
};

/**
 * Checks if a keyboard event matches a shortcut configuration.
 */
export function isShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  const isCtrlOrMeta = config.ctrl || config.meta;
  const eventCtrlOrMeta = event.ctrlKey || event.metaKey;

  if (isCtrlOrMeta && !eventCtrlOrMeta) return false;
  if (!isCtrlOrMeta && eventCtrlOrMeta) return false;

  if (!!config.shift !== event.shiftKey) return false;
  if (!!config.alt !== event.altKey) return false;

  // For 'Delete' and 'Backspace', we usually want to support both if they mean "remove"
  if (config.key === 'Backspace' && (event.key === 'Backspace' || event.key === 'Delete')) return true;

  return event.key.toLowerCase() === config.key.toLowerCase();
}

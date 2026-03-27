import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsProps {
  selectedId: string | null;
  deleteElement: (id: string) => void;
  onSave?: () => void;
}

export function useKeyboardShortcuts({ selectedId, deleteElement, onSave }: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        deleteElement(selectedId);
      }
    }
    if (e.key === 'Escape') {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        // This should be handled by the component
      }
    }
    if (e.key === ' ') {
      e.preventDefault();
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    }
  }, [selectedId, deleteElement, onSave]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
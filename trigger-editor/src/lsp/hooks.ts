/**
 * React hooks for the LSP engine.
 * Provides reactive access to LSP features in components.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  onContextChange,
  getCompletions,
  getHoverInfo,
  getCompletionTrigger,
  applyCompletion,
  applyValueCompletion
} from './engine.ts';
import type { CompletionItem, HoverInfo } from './types.ts';

/**
 * Returns all available completion items for a given text value.
 * Reactively updates when context changes.
 */
export function useCompletions(value: string, cursorOffset?: number): {
  items: CompletionItem[];
  term: string | null;
  isOpen: boolean;
} {
  const [items, setItems] = useState<CompletionItem[]>([]);
  const [, forceUpdate] = useState(0);

  // Recompute when context changes
  useEffect(() => {
    return onContextChange(() => forceUpdate(n => n + 1));
  }, []);

  const term = getCompletionTrigger(value, cursorOffset);
  const isOpen = term !== null;

  useEffect(() => {
    if (term !== null) {
      setItems(getCompletions(term!));
    } else {
      setItems([]);
    }
  }, [value, term]);

  return { items, term: term ?? null, isOpen };
}

/**
 * Returns hover info for a specific variable path.
 * Reactively updates when context changes.
 */
export function useHoverInfo(variable: string | undefined): HoverInfo | undefined {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return onContextChange(() => forceUpdate(n => n + 1));
  }, []);

  if (!variable) return undefined;
  return getHoverInfo(variable);
}

/**
 * Provides a handler to apply a completion item to a current text value.
 * Uses variable reference mode (${variable}).
 */
export function useApplyCompletion(
  value: string,
  onChange: (newValue: string) => void,
  cursorOffset?: number
): (item: CompletionItem) => void {
  return useCallback(
    (item: CompletionItem) => {
      onChange(applyCompletion(value, item, cursorOffset));
    },
    [value, onChange, cursorOffset]
  );
}

/**
 * Provides a handler to apply a completion item by inserting the RAW VALUE
 * instead of ${} reference. Useful for fields like Condition Value.
 */
export function useApplyValueCompletion(
  value: string,
  onChange: (newValue: string) => void,
  cursorOffset?: number
): (item: CompletionItem) => void {
  return useCallback(
    (item: CompletionItem) => {
      onChange(applyValueCompletion(value, item, cursorOffset));
    },
    [value, onChange, cursorOffset]
  );
}

/**
 * Filter completion items to only include primitive types (string, number, boolean).
 */
export function usePrimitiveCompletions(value: string, cursorOffset?: number): {
  items: CompletionItem[];
  term: string | null;
  isOpen: boolean;
} {
  const { items, term, isOpen } = useCompletions(value, cursorOffset);
  
  const primitiveItems = items.filter(
    item => item.kind === 'string' || item.kind === 'number' || item.kind === 'boolean'
  );
  
  return { items: primitiveItems, term, isOpen };
}

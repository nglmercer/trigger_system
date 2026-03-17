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
export function useCompletions(value: string): {
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

  const term = getCompletionTrigger(value);
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
  onChange: (newValue: string) => void
): (item: CompletionItem) => void {
  return useCallback(
    (item: CompletionItem) => {
      onChange(applyCompletion(value, item));
    },
    [value, onChange]
  );
}

/**
 * Provides a handler to apply a completion item by inserting the RAW VALUE
 * instead of ${} reference. Useful for fields like Condition Value.
 * 
 * - Strings are inserted as "value"
 * - Numbers are inserted as 123
 * - Booleans as true/false
 * - Arrays/Objects as JSON
 */
export function useApplyValueCompletion(
  value: string,
  onChange: (newValue: string) => void
): (item: CompletionItem) => void {
  return useCallback(
    (item: CompletionItem) => {
      onChange(applyValueCompletion(value, item));
    },
    [value, onChange]
  );
}

/**
 * Filter completion items to only include primitive types (string, number, boolean).
 * Useful for value fields where you want to insert actual values.
 */
export function usePrimitiveCompletions(value: string): {
  items: CompletionItem[];
  term: string | null;
  isOpen: boolean;
} {
  const { items, term, isOpen } = useCompletions(value);
  
  // Filter to only show primitive types
  const primitiveItems = items.filter(
    item => item.kind === 'string' || item.kind === 'number' || item.kind === 'boolean'
  );
  
  return { items: primitiveItems, term, isOpen };
}

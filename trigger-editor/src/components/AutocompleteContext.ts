/**
 * Backwards-compatible adapter that bridges the old AutocompleteContext API
 * to the new LSP engine. Use `lsp/index.ts` for new code.
 */
import { useState, useEffect } from 'react';
import { loadContext, getContext, onContextChange, getHoverInfo } from '../lsp/engine.ts';
import type { LSPContext } from '../lsp/types.ts';

// ─── Legacy API compatibility ─────────────────────────────────────────────────

/** @deprecated Use `loadContext` from `lsp/engine.ts` instead */
export const setGlobalContextData = loadContext;

/** @deprecated Use `getContext` from `lsp/engine.ts` instead */
export const getGlobalContextData = getContext;

/** @deprecated Use `getHoverInfo` from `lsp/engine.ts` instead */
export const resolveAutocompleteValue = (path: string) => {
  const info = getHoverInfo(path);
  return info?.value;
};

/** @deprecated Use `useCompletions` from `lsp/hooks.ts` instead */
export const useAutocompletePaths = (): string[] => {
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const rebuild = () => {
      const ctx = getContext();
      const out: string[] = [];
      function recurse(obj: any, prefix: string) {
        if (!prefix) return;
        out.push(prefix);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          for (const [k, v] of Object.entries(obj)) {
            recurse(v, `${prefix}.${k}`);
          }
        }
      }
      const hasNativeData = ctx && 'data' in ctx && Object.keys(ctx).length === 1;
      if (hasNativeData) {
        recurse(ctx.data, 'data');
      } else {
        recurse(ctx, 'data');
      }
      setPaths(out);
    };

    rebuild();
    return onContextChange(rebuild);
  }, []);

  return paths;
};

import { useState, useEffect } from 'react';

type ContextData = Record<string, any>;

let globalContextData: ContextData = {};
let listeners: (() => void)[] = [];

export const setGlobalContextData = (data: ContextData) => {
  globalContextData = data;
  listeners.forEach(l => l());
};

export const getGlobalContextData = () => globalContextData;

export const resolveAutocompleteValue = (path: string): any => {
  if (!path) return undefined;
  let keys = path.split('.');
  
  // If the path starts with 'data' but the actual JSON doesn't have a top-level 'data' object
  // (because we artificially wrapped it), we drop the 'data' part to resolve it.
  const hasNativelyData = globalContextData && typeof globalContextData === 'object' && 'data' in globalContextData && Object.keys(globalContextData).length === 1;
  if (!hasNativelyData && keys[0] === 'data') {
    keys.shift();
  }

  let current = globalContextData;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
};

export const useAutocompletePaths = (): string[] => {
  const [paths, setPaths] = useState<string[]>([]);
  
  useEffect(() => {
    const updatePaths = () => {
      const newPaths: string[] = ['data'];
      function recurse(obj: any, currentPath: string) {
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          for (const [key, value] of Object.entries(obj)) {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            newPaths.push(newPath);
            recurse(value, newPath);
          }
        }
      }
      
      // If the user's uploaded JSON already has { "data": { ... } } at the root,
      // unwrap it so we don't get 'data.data.xyz'.
      if (globalContextData && typeof globalContextData === 'object' && 'data' in globalContextData && Object.keys(globalContextData).length === 1) {
        recurse(globalContextData.data, 'data');
      } else {
        recurse(globalContextData, 'data');
      }
      
      setPaths(newPaths);
    };

    updatePaths();
    listeners.push(updatePaths);
    return () => { listeners = listeners.filter(l => l !== updatePaths); };
  }, []);
  
  return paths;
};

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n.ts';
import './style.css';

// Import ImportManager to initialize LSP data from localStorage immediately
// This ensures autocomplete works even before any React components mount
import './lsp/ImportManager.ts';

// Suppress the benign "ResizeObserver loop" error.
// This is a known browser warning (W3C spec) that fires when a ResizeObserver
// callback triggers layout changes that can't all be delivered in one frame.
// React Flow's internal ResizeObserver causes this during panel resizing.
const resizeObserverErr = (e: ErrorEvent) => {
  if (e.message?.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
};
window.addEventListener('error', resizeObserverErr);

const container = document.getElementById('root');
if (container) {
  // Use a global to store the root to avoid re-creation during HMR if needed,
  // though standard React 18 patterns usually handle this if we don't re-execute this script.
  // In many dev environments, we can just check if it's already there or let it be.
  // But to be really safe and avoid the console warning:
  const root = (window as any)._reactRoot || createRoot(container);
  (window as any)._reactRoot = root;
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

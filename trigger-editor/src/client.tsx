import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n.ts';
import './style.css';

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

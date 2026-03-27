import { createRoot } from 'react-dom/client';
import AlertEditor from './AlertEditor';
import './index.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<AlertEditor />);
}

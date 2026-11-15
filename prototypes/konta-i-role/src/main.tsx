import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './review-bridge.css';

declare global {
  interface Window {
    __PROTOTYPE_START__?: () => boolean;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Prototype root element was not found.');

createRoot(root).render(<App />);

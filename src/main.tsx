import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept all fetch requests to /api/ or /auth/ to route them to the backend server if hosted on Vercel
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    value: function (input: any, init: any) {
      let url = typeof input === 'string' ? input : (input && typeof input === 'object' ? (input as any).url : '');
      if (url && (url.startsWith('/api/') || url.startsWith('/auth/'))) {
        const backendUrl = localStorage.getItem('api_backend_url') || '';
        if (backendUrl) {
          const cleanBackendUrl = backendUrl.replace(/\/$/, '');
          if (typeof input === 'string') {
            input = `${cleanBackendUrl}${url}`;
          } else {
            // Handle Request objects
            try {
              input = new Request(`${cleanBackendUrl}${url}`, input as any);
            } catch (e) {
              if (input && typeof input === 'object') {
                (input as any).url = `${cleanBackendUrl}${url}`;
              }
            }
          }
        }
      }
      return originalFetch(input, init);
    },
    writable: true,
    configurable: true
  });
} catch (e) {
  console.warn("[FETCH INTERCEPT] Failed to redefine window.fetch with defineProperty, trying direct assignment:", e);
  try {
    (window as any).fetch = function (input: any, init: any) {
      let url = typeof input === 'string' ? input : (input && typeof input === 'object' ? (input as any).url : '');
      if (url && (url.startsWith('/api/') || url.startsWith('/auth/'))) {
        const backendUrl = localStorage.getItem('api_backend_url') || '';
        if (backendUrl) {
          const cleanBackendUrl = backendUrl.replace(/\/$/, '');
          if (typeof input === 'string') {
            input = `${cleanBackendUrl}${url}`;
          } else {
            try {
              input = new Request(`${cleanBackendUrl}${url}`, input as any);
            } catch (err) {
              if (input && typeof input === 'object') {
                (input as any).url = `${cleanBackendUrl}${url}`;
              }
            }
          }
        }
      }
      return originalFetch(input, init);
    };
  } catch (err2) {
    console.error("[FETCH INTERCEPT] Completely failed to override fetch:", err2);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

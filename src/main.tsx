import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suprimir errores de extensiones del navegador en desarrollo
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const errorString = args.join(' ');
    // Filtrar errores conocidos de extensiones del navegador
    if (
      errorString.includes('Extension context invalidated') ||
      errorString.includes('content.js')
    ) {
      return; // Ignorar estos errores
    }
    originalError.apply(console, args);
  };

  // También suprimir en el window.onerror
  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('Extension context invalidated') ||
      event.filename?.includes('content.js')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

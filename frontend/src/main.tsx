import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ColorModeProvider } from './theme/ColorModeContext';

// Cuando un chunk lazy ya no existe (nuevo deploy), recarga una vez para obtener el index.html fresco
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message ?? '';
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
    const reloadedKey = 'sigam_chunk_reload';
    if (!sessionStorage.getItem(reloadedKey)) {
      sessionStorage.setItem(reloadedKey, '1');
      window.location.reload();
    }
  }
});

// Si la app cargó bien, limpiar la marca para que futuros deploys puedan recargar de nuevo
sessionStorage.removeItem('sigam_chunk_reload');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ColorModeProvider>
        <App />
      </ColorModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

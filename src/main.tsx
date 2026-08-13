// 1. Inter font weights
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

// 2. Kendo base theme — must load BEFORE applyBeghouTheme so our :root overrides win
import '@progress/kendo-theme-default/dist/all.css';

// 3. Apply Beghou tokens as CSS custom properties on :root
import { applyBeghouTheme } from './theme/applyBeghouTheme';
applyBeghouTheme();

// 4. Project-level CSS (chrome + page styles)
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

// `import.meta.env.BASE_URL` follows Vite's `base` config. In dev it's '/',
// in build it's '/beghou-app-specs/' — BrowserRouter strips the trailing
// slash itself, but Vite returns it with one. Trim so basename is canonical.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// 1. Inter (variable). The Beghou theme sets `--kendo-font-family: inherit`, so
//    the app must supply the font itself (see beghou-theme-adoption.md step 4).
import '@fontsource-variable/inter/index.css';

// 2. Beghou Kendo theme (built in ThemeBuilder). kendo-theme-default is baked
//    into this file — do NOT also import it. Must load before the app's own CSS.
import './beghou-theme/dist/css/beghou-theme.css';

// 3. Project-level CSS (chrome + page styles). Uses the theme's --kendo-* vars
//    directly; no JS theme step.
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

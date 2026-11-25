import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const baseUrl = import.meta.env.BASE_URL;
const { pathname, search, hash } = window.location;
const relativePath = pathname.slice(baseUrl.length);

// GitHub Pages serves 404.html for old album URLs. Move the route into the hash.
if (pathname.startsWith(baseUrl) && /^album\/[^/]+\/?$/.test(relativePath)) {
  window.location.replace(`${baseUrl}#/${relativePath.replace(/\/$/, '')}${search}${hash}`);
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

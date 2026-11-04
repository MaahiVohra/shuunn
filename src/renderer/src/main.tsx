import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/plus-jakarta-sans';
import App from './App.jsx';
import '../index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root DOM element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

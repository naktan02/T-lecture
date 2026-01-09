// src/app/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { ErrorBoundary } from '../shared/ui';
import { initSentry } from '../config/sentry';

// Sentry 초기화 (에러 추적 - VITE_SENTRY_DSN 설정 시 활성화)
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

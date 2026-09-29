import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary
      area="Application"
      fallback={(error, reset) => (
        <div className="fatal" role="alert">
          <h1>Something went wrong</h1>
          <p>{error.message}</p>
          <p>Your diagrams are stored locally in this browser and have not been lost.</p>
          <div className="fatal__actions">
            <button type="button" className="btn btn--primary" onClick={reset}>
              Try again
            </button>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )}
    >
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);

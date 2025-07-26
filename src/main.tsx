import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { preloadCriticalResources, clearUnusedCache } from '@/lib/performance-utils';

// Create a client with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // Data is fresh for 10 minutes
      cacheTime: 1000 * 60 * 60, // Cache persists for 1 hour
      refetchOnWindowFocus: false,
      retry: 0, // Disable retries for faster response
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Performance optimizations
preloadCriticalResources();
clearUnusedCache();

// Enable concurrent features
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
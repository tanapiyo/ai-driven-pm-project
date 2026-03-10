'use client';

/**
 * @layer app
 * @what グローバルプロバイダー
 * @why React Query などのプロバイダーをまとめて提供
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureApiClient } from '@monorepo/api-contract';
import { initializeAuthStore } from '@/features/auth';
import { getConfig } from '@/shared/config/env';
import { ThemeProvider } from '@/shared/providers';
import { ToastProvider } from '@/shared/ui';

interface ProvidersProps {
  children: ReactNode;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(getQueryClient);
  const initialized = useRef(false);

  useEffect(() => {
    // Ensure initialization runs only once
    if (initialized.current) return;
    initialized.current = true;

    // Configure API client with the base URL from environment
    const { apiBaseUrl } = getConfig();
    configureApiClient({ baseUrl: apiBaseUrl });

    // Initialize auth store from localStorage (synchronous)
    // This sets hasPotentialSession flag before protected layouts render
    initializeAuthStore();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

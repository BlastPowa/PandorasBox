"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { InstallTip, PwaInstallProvider } from "@/components/pwa/install-manager";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <PwaInstallProvider>
      <QueryClientProvider client={client}>
        {children}
        <InstallTip />
        <Toaster
          theme="dark"
          position="bottom-right"
          mobileOffset={{
            bottom: "calc(var(--app-bottom-nav-height) + 12px)",
            left: "max(12px, var(--safe-left))",
            right: "max(12px, var(--safe-right))",
          }}
          offset={{ bottom: "max(24px, var(--safe-bottom))", right: "max(24px, var(--safe-right))" }}
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            },
          }}
        />
      </QueryClientProvider>
    </PwaInstallProvider>
  );
}

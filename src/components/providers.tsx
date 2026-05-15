"use client";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/lib/i18n";
import { useAuthStore } from "@/store/auth-store";
import { ToastContainer } from "@/components/ui/toast";

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  React.useEffect(() => {
    hydrate();
  }, [hydrate]);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ToastContainer>
        <AuthHydrator>{children}</AuthHydrator>
      </ToastContainer>
    </QueryClientProvider>
  );
}

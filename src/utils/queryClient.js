import { QueryClient } from "@tanstack/react-query";

const shouldRetry = (failureCount, error) => {
  if (error?.name === "AbortError") return false;
  const status = Number(error?.status);
  if (Number.isFinite(status) && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: 0,
    },
  },
});

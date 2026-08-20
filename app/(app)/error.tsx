"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/components/error-fallback";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorFallback error={error} resetErrorBoundary={unstable_retry} />;
}

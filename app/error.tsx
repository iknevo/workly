"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/components/error-fallback";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-6">
          <ErrorFallback error={error} resetErrorBoundary={unstable_retry} />
        </div>
      </body>
    </html>
  );
}

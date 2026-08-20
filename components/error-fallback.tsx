"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error?: Error;
  resetErrorBoundary?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-xs text-muted-foreground">
            {error?.message ?? "An unexpected error occurred."}
          </p>
        </div>
        {resetErrorBoundary && (
          <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { ErrorFallback };

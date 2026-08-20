import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <Card className="absolute top-1/2 left-1/2 flex h-90/100 w-90/100 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-6xl font-semibold tracking-tight text-muted-foreground">404</p>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Page not found</p>
            <p className="text-xs text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

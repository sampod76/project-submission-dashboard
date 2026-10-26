"use client";

import type { ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function ErrorAlert({ message, action }: { message: ReactNode; action?: ReactNode }) {
  return (
    <Alert variant="destructive" className="flex items-start gap-3 border-red-200 bg-red-50">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <AlertDescription className="flex flex-1 flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        {action}
      </AlertDescription>
    </Alert>
  );
}

export function Spinner() {
  return (
    <span role="status" className="inline-flex">
      <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
      <span className="sr-only">Loading...</span>
    </span>
  );
}

export function ContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading content" className="w-full space-y-3 py-4">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-4 w-full last:w-2/3" />
      ))}
    </div>
  );
}

export function EmptyState({ description = "No data" }: { description?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground"
    >
      <Inbox className="h-10 w-10 text-slate-300" />
      {description}
    </div>
  );
}

export function MissingRecord({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="space-y-3 py-12 text-center">
      <p className="text-6xl font-semibold text-slate-300">404</p>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      <div className="text-primary">{action}</div>
    </div>
  );
}

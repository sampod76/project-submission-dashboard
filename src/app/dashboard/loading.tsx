"use client";
import { ContentSkeleton } from "@/components/shared/feedback";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div role="status" aria-label="Loading dashboard content" className="space-y-6 p-4 sm:p-6">
      <span className="sr-only">Loading dashboard content...</span>
      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="my-2 h-6 w-36 max-w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-sky-100 bg-white p-5">
              <ContentSkeleton rows={1} />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-sky-100 bg-white p-6">
          <ContentSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}

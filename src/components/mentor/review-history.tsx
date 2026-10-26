"use client";
import { useState } from "react";
import { useGetReviewsQuery } from "@/redux/features/review/reviewApi";
import { RequestError, SubmissionBadge } from "@/components/student/submission-shared";
import { ContentSkeleton, EmptyState } from "@/components/shared/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/student-submissions";

export default function ReviewHistory({ submissionId }: { submissionId: string }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const query = useGetReviewsQuery(
    { id: submissionId, params: { page, limit } },
    { refetchOnMountOrArgChange: true },
  );
  const response = query.currentData;
  return (
    <Card id="reviews" className="scroll-mt-24 rounded-xl border-slate-200 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">Review history</h2>
        {query.isError ? (
          <RequestError
            error={query.error}
            busy={query.isFetching}
            retry={() => void query.refetch()}
          />
        ) : !response ? (
          <ContentSkeleton rows={4} />
        ) : (
          <>
            {!response.data.length ? (
              <EmptyState description="There are no review records on this page." />
            ) : (
              <ol className="space-y-4">
                {response.data.map((review) => {
                  const name =
                    review.reviewer.role === "MENTOR"
                      ? review.reviewer.mentor
                      : review.reviewer.admin;
                  return (
                    <li key={review.id} className="rounded-lg border bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <SubmissionBadge status={review.previousStatus} />
                        <span aria-label="changed to">→</span>
                        <SubmissionBadge status={review.status} />
                        <time
                          className="ml-auto text-xs text-muted-foreground"
                          dateTime={review.createdAt}
                        >
                          {new Date(review.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <p className="mt-3 break-words text-sm font-medium">
                        {name ? `${name.firstName} ${name.lastName}` : review.reviewer.email}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">
                        {review.reviewer.email} · {review.reviewer.role}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                        {review.feedback || "No feedback provided."}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Updated {formatDate(review.updatedAt)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>
                {response.meta.total} reviews · Page {response.meta.page} of{" "}
                {Math.max(1, Math.ceil(response.meta.total / response.meta.limit))}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    page >= Math.ceil(response.meta.total / response.meta.limit) || query.isFetching
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
                <select
                  aria-label="Reviews per page"
                  className="h-9 rounded-md border bg-white px-2"
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 20, 50].map((value) => (
                    <option key={value} value={value}>
                      {value} / page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, FolderOpen, XCircle } from "lucide-react";
import {
  useGetSubmissionStatisticsQuery,
  useGetSubmissionsQuery,
} from "@/redux/features/submission/submissionApi";
import {
  StudentPageHeading as PageHeading,
  RequestError,
  SubmissionBadge,
} from "@/components/student/submission-shared";
import { ContentSkeleton, EmptyState } from "@/components/shared/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/student-submissions";

export default function MentorDashboard() {
  const stats = useGetSubmissionStatisticsQuery(undefined, { refetchOnMountOrArgChange: true });
  const recent = useGetSubmissionsQuery(
    { page: 1, limit: 5, status: "PENDING", sortBy: "createdAt", sortOrder: "asc" },
    { refetchOnMountOrArgChange: true },
  );
  const counts = stats.currentData?.data;
  return (
    <>
      <PageHeading
        title="Mentor dashboard"
        description="Help students move their work forward. Start with the projects waiting for your review."
        action={
          <Button asChild>
            <Link href="/mentor/submissions?status=PENDING">
              Review pending projects <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      {stats.isError ? (
        <RequestError
          error={stats.error}
          busy={stats.isFetching}
          retry={() => void stats.refetch()}
        />
      ) : !counts ? (
        <ContentSkeleton rows={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total submissions",
                value: counts.total,
                icon: FolderOpen,
                tone: "bg-blue-50 text-blue-600",
                href: "/mentor/submissions",
              },
              {
                label: "Pending review",
                value: counts.pending,
                icon: Clock3,
                tone: "bg-amber-50 text-amber-600",
                href: "/mentor/submissions?status=PENDING",
              },
              {
                label: "Approved",
                value: counts.approved,
                icon: CheckCircle2,
                tone: "bg-emerald-50 text-emerald-600",
                href: "/mentor/submissions?status=APPROVED",
              },
              {
                label: "Rejected",
                value: counts.rejected,
                icon: XCircle,
                tone: "bg-rose-50 text-rose-600",
                href: "/mentor/submissions?status=REJECTED",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`rounded-lg p-2 ${item.tone}`}>
                    <item.icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  {item.value.toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
          {counts.revisionRequired > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              The total includes {counts.revisionRequired} legacy revision-required submissions.
              These cannot be reviewed through the current API.
            </p>
          )}
          {counts.total === 0 && (
            <EmptyState description="No submissions yet. Student projects will appear here when submitted." />
          )}
        </>
      )}
      <Card className="mt-7 rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Next in the review queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The five oldest pending projects, so nobody gets left behind.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/mentor/reviews">Review history</Link>
            </Button>
          </div>
          {recent.isError ? (
            <RequestError
              error={recent.error}
              busy={recent.isFetching}
              retry={() => void recent.refetch()}
            />
          ) : !recent.currentData ? (
            <ContentSkeleton rows={5} />
          ) : !recent.currentData.data.length ? (
            <EmptyState description="No projects are waiting for review." />
          ) : (
            <ul className="divide-y">
              {recent.currentData.data.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      className="break-words font-medium hover:text-primary hover:underline"
                      href={`/mentor/submissions/${s.id}`}
                    >
                      {s.projectName}
                    </Link>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {s.student.firstName} {s.student.lastName} · {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <SubmissionBadge status={s.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/mentor/submissions/${s.id}`}>
                      Review <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

"use client";
import Link from "next/link";
import {
  useGetMySubmissionsQuery,
  useGetSubmissionStatisticsQuery,
} from "@/redux/features/submission/submissionApi";
import { useAppSelector } from "@/redux/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentSkeleton, EmptyState } from "@/components/shared/feedback";
import {
  RequestError,
  StudentPageHeading,
  SubmissionBadge,
} from "@/components/student/submission-shared";
import { formatDate } from "@/lib/student-submissions";

export default function StudentDashboard() {
  const user = useAppSelector((state) => state.auth.user);
  const statistics = useGetSubmissionStatisticsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const recent = useGetMySubmissionsQuery(
    { page: 1, limit: 5 },
    { refetchOnMountOrArgChange: true },
  );
  const counts = statistics.currentData?.data;
  const metrics = [
    { label: "Total submissions", value: counts?.total, color: "bg-blue-50 text-blue-700" },
    { label: "Pending", value: counts?.pending, color: "bg-amber-50 text-amber-700" },
    { label: "Approved", value: counts?.approved, color: "bg-emerald-50 text-emerald-700" },
    { label: "Rejected", value: counts?.rejected, color: "bg-rose-50 text-rose-700" },
    {
      label: "Revision required",
      value: counts?.revisionRequired,
      color: "bg-cyan-50 text-cyan-700",
    },
  ];
  return (
    <>
      <StudentPageHeading
        title={`Welcome, ${user?.name || "Student"}`}
        description="Keep building. Submit a project and follow its progress from your workspace."
        action={
          <Button asChild className="h-10">
            <Link href="/student/submissions/new">Submit Project</Link>
          </Button>
        }
      />
      {statistics.isError && (
        <div className="mb-4">
          <RequestError
            error={statistics.error}
            retry={() => void statistics.refetch()}
            busy={statistics.isFetching}
          />
        </div>
      )}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ label, value, color }) => (
          <Card key={label} className="rounded-xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              {statistics.isError ? (
                <div className="mt-3">
                  <span className="text-xs text-destructive">Unavailable</span>
                </div>
              ) : statistics.isLoading ? (
                <ContentSkeleton rows={1} />
              ) : (
                <p className={`mt-3 w-fit rounded-lg px-3 py-1 text-3xl font-semibold ${color}`}>
                  {value ?? "—"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent submissions</h2>
            <Link
              href="/student/submissions"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all submissions →
            </Link>
          </div>
          {recent.isError ? (
            <RequestError error={recent.error} retry={() => void recent.refetch()} />
          ) : !recent.currentData ? (
            <ContentSkeleton rows={4} />
          ) : recent.currentData.data.length ? (
            <ul className="divide-y">
              {recent.currentData.data.map((submission) => (
                <li
                  key={submission.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <Link
                      className="break-words font-medium hover:text-primary"
                      href={`/student/submissions/${submission.id}`}
                    >
                      {submission.projectName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Submitted {formatDate(submission.createdAt)}
                    </p>
                  </div>
                  <SubmissionBadge status={submission.status} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center">
              <EmptyState description="No projects yet. Submit your first project to get started." />
              <Button asChild>
                <Link href="/student/submissions/new">Submit your first project</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

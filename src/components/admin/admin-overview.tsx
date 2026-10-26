"use client";
import Link from "next/link";
import { useGetUsersQuery } from "@/redux/features/user/userApi";
import { useGetMentorsQuery } from "@/redux/features/mentor/mentorApi";
import { useGetAuditLogsQuery } from "@/redux/features/auditLog/auditLogApi";
import { useGetHealthQuery } from "@/redux/features/health/healthApi";
import { RequestError } from "@/components/student/submission-shared";
import { ContentSkeleton, EmptyState } from "@/components/shared/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminOverview() {
  const users = useGetUsersQuery({ page: 1, limit: 1 }, { refetchOnMountOrArgChange: true });
  const mentors = useGetMentorsQuery({ page: 1, limit: 1 }, { refetchOnMountOrArgChange: true });
  const audit = useGetAuditLogsQuery(
    { page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" },
    { refetchOnMountOrArgChange: true },
  );
  const health = useGetHealthQuery();
  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-2">
      <Card className="rounded-xl">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Account overview</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "User accounts", query: users, href: "/admin/users" },
              { label: "Mentor profiles", query: mentors, href: "/admin/mentors" },
            ].map(({ label, query, href }) => (
              <div key={label} className="rounded-lg border p-4">
                <Link className="font-medium text-primary hover:underline" href={href}>
                  {label}
                </Link>
                {query.isError ? (
                  <RequestError
                    error={query.error}
                    busy={query.isFetching}
                    retry={() => void query.refetch()}
                  />
                ) : !query.currentData ? (
                  <ContentSkeleton rows={1} />
                ) : (
                  <p className="mt-2 text-2xl font-semibold">
                    {query.currentData.meta.total.toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/mentors/new">Create Mentor</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/admins/new">Create Admin</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/students">Student management</Link>
            </Button>
          </div>
          <div className="border-t pt-4 text-sm">
            <p className="font-medium">API connectivity</p>
            {health.isError ? (
              <RequestError
                error={health.error}
                busy={health.isFetching}
                retry={() => void health.refetch()}
              />
            ) : health.currentData ? (
              <p className="mt-1 text-muted-foreground">
                Connected · Server time {new Date(health.currentData.time).toLocaleString()}
              </p>
            ) : (
              <p role="status">Checking service…</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Connectivity does not confirm database readiness.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent audit activity</h2>
            <Link href="/admin/audit-logs" className="text-sm text-primary hover:underline">
              View all logs
            </Link>
          </div>
          {audit.isError ? (
            <RequestError
              error={audit.error}
              busy={audit.isFetching}
              retry={() => void audit.refetch()}
            />
          ) : !audit.currentData ? (
            <ContentSkeleton rows={5} />
          ) : !audit.currentData.data.length ? (
            <EmptyState description="No audit activity is available." />
          ) : (
            <ul className="divide-y">
              {audit.currentData.data.map((log) => (
                <li key={log.id} className="py-3">
                  <Link
                    href={`/admin/audit-logs/${log.id}`}
                    className="break-words font-medium text-primary hover:underline"
                  >
                    {log.action}
                  </Link>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {log.actor?.email ?? "Unknown actor"} · {log.entityType}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

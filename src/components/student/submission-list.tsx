"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useGetMySubmissionsQuery } from "@/redux/features/submission/submissionApi";
import type { SubmissionRecord } from "@/types/submission.types";
import type { SubmissionStatus } from "@/types/common.types";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentSkeleton, EmptyState } from "@/components/shared/feedback";
import {
  ProjectLink,
  RequestError,
  StudentPageHeading,
  SubmissionBadge,
} from "./submission-shared";
import { formatDate, statusLabel, submissionStatuses } from "@/lib/student-submissions";

export default function SubmissionList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<SubmissionStatus | "">("");
  const query = useGetMySubmissionsQuery(
    { page, limit, ...(status ? { status } : {}) },
    { refetchOnMountOrArgChange: true },
  );
  const response = query.currentData;
  const columns = useMemo<ColumnDef<SubmissionRecord>[]>(
    () => [
      {
        accessorKey: "projectName",
        header: "Project",
        size: 240,
        cell: ({ row }) => (
          <Link
            className="font-medium text-slate-900 hover:text-primary hover:underline"
            href={`/student/submissions/${row.original.id}`}
          >
            {row.original.projectName}
          </Link>
        ),
      },
      {
        accessorKey: "repoUrl",
        header: "Repository",
        size: 220,
        cell: ({ row }) => (
          <ProjectLink href={row.original.repoUrl}>{row.original.repoFullName}</ProjectLink>
        ),
      },
      {
        accessorKey: "liveUrl",
        header: "Live project",
        size: 130,
        cell: ({ row }) => <ProjectLink href={row.original.liveUrl}>Open project</ProjectLink>,
      },
      {
        accessorKey: "createdAt",
        header: "Submitted",
        size: 140,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 160,
        cell: ({ row }) => <SubmissionBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <Link
            className="text-primary hover:underline"
            href={`/student/submissions/${row.original.id}`}
          >
            View
          </Link>
        ),
      },
    ],
    [],
  );
  const totalPages = response
    ? Math.max(1, Math.ceil(response.meta.total / response.meta.limit))
    : 1;
  return (
    <>
      <StudentPageHeading
        title="My submissions"
        description="Track every project you submit. Your newest projects appear first."
        action={
          <Button asChild>
            <Link href="/student/submissions/new">Submit Project</Link>
          </Button>
        }
      />
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm font-medium">
              Status
              <select
                aria-label="Filter by status"
                className="h-10 rounded-md border bg-white px-3 text-sm"
                value={status}
                disabled={query.isFetching}
                onChange={(event) => {
                  setStatus(event.target.value as SubmissionStatus | "");
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {submissionStatuses.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-muted-foreground">
              {response ? `${response.meta.total} matching submissions` : "Your projects"}
            </p>
          </div>
          {query.isError ? (
            <RequestError
              error={query.error}
              busy={query.isFetching}
              retry={() => void query.refetch()}
            />
          ) : !response ? (
            <ContentSkeleton rows={6} />
          ) : response.data.length === 0 ? (
            <>
              <EmptyState
                description={
                  response.meta.total
                    ? "This page is empty. Return to an earlier page."
                    : status
                      ? "No submissions with this status yet."
                      : "Your first project belongs here."
                }
              />
              {response.meta.total > 0 ? (
                <Button onClick={() => setPage(Math.min(totalPages, 1000000))}>
                  Go to last available page
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/student/submissions/new">Submit a project</Link>
                </Button>
              )}
            </>
          ) : (
            <DataTable
              data={response.data}
              columns={columns}
              meta={response.meta}
              page={response.meta.page}
              limit={response.meta.limit}
              setPage={setPage}
              setLimit={(value) => {
                setLimit(value);
                setPage(1);
              }}
              isFetching={query.isFetching}
              urlParamsUpdate={false}
              minWidth={950}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

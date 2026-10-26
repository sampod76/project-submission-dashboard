"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useGetSubmissionsQuery } from "@/redux/features/submission/submissionApi";
import type { ListSubmissionsQuery, SubmissionRecord } from "@/types/submission.types";
import type { SubmissionStatus } from "@/types/common.types";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentSkeleton } from "@/components/shared/feedback";
import {
  ProjectLink,
  RequestError,
  StudentPageHeading as PageHeading,
  SubmissionBadge,
} from "@/components/student/submission-shared";
import { formatDate, statusLabel, submissionStatuses } from "@/lib/student-submissions";
import { useDebounced } from "@/hooks/use-debounce";

export default function SubmissionQueue({
  history = false,
  workspace = "mentor",
}: {
  history?: boolean;
  workspace?: "mentor" | "admin";
}) {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubmissionStatus | "">(() => {
    const value = searchParams.get("status");
    return submissionStatuses.includes(value as SubmissionStatus)
      ? (value as SubmissionStatus)
      : history
        ? "APPROVED"
        : "";
  });
  const [sortBy, setSortBy] = useState<NonNullable<ListSubmissionsQuery["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const searchTerm = useDebounced({ searchQuery: search, delay: 350 });
  const query = useGetSubmissionsQuery(
    {
      page,
      limit,
      searchTerm: searchTerm.trim(),
      ...(status ? { status } : {}),
      sortBy,
      sortOrder,
    },
    { refetchOnMountOrArgChange: true },
  );
  const response = query.currentData;
  const columns = useMemo<ColumnDef<SubmissionRecord>[]>(
    () => [
      {
        accessorKey: "projectName",
        header: "Project",
        enableSorting: true,
        size: 210,
        cell: ({ row }) => (
          <Link
            className="font-medium text-slate-900 hover:text-primary hover:underline"
            href={`/${workspace}/submissions/${row.original.id}${history ? "#reviews" : ""}`}
          >
            {row.original.projectName}
          </Link>
        ),
      },
      {
        id: "student",
        header: "Student",
        size: 230,
        cell: ({ row: { original: s } }) => (
          <div>
            <Link
              className="font-medium hover:text-primary"
              href={`/${workspace}/students/${s.student.userId}`}
            >
              {s.student.firstName} {s.student.lastName}
            </Link>
            <p className="break-all text-xs text-muted-foreground">{s.student.user.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "repoUrl",
        header: "Repository",
        size: 200,
        cell: ({ row }) => (
          <ProjectLink href={row.original.repoUrl}>{row.original.repoFullName}</ProjectLink>
        ),
      },
      {
        accessorKey: "liveUrl",
        header: "Live project",
        size: 140,
        cell: ({ row }) => <ProjectLink href={row.original.liveUrl}>Open project</ProjectLink>,
      },
      {
        accessorKey: "createdAt",
        header: "Submitted",
        enableSorting: true,
        size: 140,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: true,
        size: 170,
        cell: ({ row }) => <SubmissionBadge status={row.original.status} />,
      },
      {
        id: "review",
        header: "Review information",
        size: 160,
        cell: ({ row }) =>
          row.original.status === "PENDING" ? (
            <span className="text-muted-foreground">Awaiting review</span>
          ) : (
            <Link
              className="text-primary hover:underline"
              href={`/${workspace}/submissions/${row.original.id}#reviews`}
            >
              View review history
            </Link>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <Link
            className="text-primary hover:underline"
            href={`/${workspace}/submissions/${row.original.id}${history ? "#reviews" : ""}`}
          >
            {row.original.status === "PENDING" ? "Review" : "View"}
          </Link>
        ),
      },
    ],
    [history, workspace],
  );
  return (
    <>
      <PageHeading
        title={history ? "Review history" : "Project submissions"}
        description={
          history
            ? "Choose a project to read its review decisions, reviewer details, and feedback. History is available within each submission."
            : "Inspect student projects and make an approval or rejection decision on pending submissions."
        }
      />
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end gap-4">
            <label className="min-w-0 flex-1 text-sm font-medium">
              Search projects or student names
              <Input
                aria-label="Search submissions"
                className="mt-2"
                placeholder="Project, repository, description, or student name"
                maxLength={100}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="text-sm font-medium">
              Status
              <select
                aria-label="Submission status"
                className="mt-2 block h-10 rounded-md border bg-white px-3"
                value={status}
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
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatus("PENDING");
                setPage(1);
              }}
            >
              Pending reviews
            </Button>
          </div>
          {query.isError ? (
            <RequestError
              error={query.error}
              busy={query.isFetching}
              retry={() => void query.refetch()}
            />
          ) : !response ? (
            <ContentSkeleton rows={8} />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground" role="status">
                {response.meta.total} matching submissions
              </p>
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
                sortBy={sortBy}
                sortOrder={sortOrder}
                setSortBy={(value) => {
                  setSortBy(value as typeof sortBy);
                  setPage(1);
                }}
                setSortOrder={(value) => {
                  setSortOrder(value as typeof sortOrder);
                  setPage(1);
                }}
                isFetching={query.isFetching}
                urlParamsUpdate={false}
                minWidth={1300}
              />
              {!response.data.length && response.meta.total > 0 && (
                <Button variant="outline" onClick={() => setPage(1)}>
                  Return to first page
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

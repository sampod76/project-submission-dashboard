"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useGetAuditLogsQuery } from "@/redux/features/auditLog/auditLogApi";
import { useAppSelector } from "@/redux/hooks";
import type { AuditLogRecord, ListAuditLogsQuery } from "@/types/audit-log.types";
import { ownReviewAuditQuery, isOwnReviewAudit } from "@/lib/mentor";
import { adminAuditFiltersSchema, type AdminAuditFilterValues } from "@/schema/admin.schema";
import {
  RequestError,
  StudentPageHeading as PageHeading,
} from "@/components/student/submission-shared";
import { ContentSkeleton, ErrorAlert } from "@/components/shared/feedback";
import DataTable from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const emptyFilters: AdminAuditFilterValues = {
  action: "",
  entityType: "",
  actorUserId: "",
  entityId: "",
  fromDate: "",
  toDate: "",
};
export default function AuditActivity({
  workspace = "mentor",
}: {
  workspace?: "mentor" | "admin";
}) {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id;
  const full = workspace === "admin" && user?.role === "ADMIN";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState(emptyFilters);
  const form = useForm<AdminAuditFilterValues>({
    resolver: zodResolver(adminAuditFiltersSchema),
    defaultValues: emptyFilters,
  });
  const params: ListAuditLogsQuery = {
    page,
    limit,
    sortBy: "createdAt",
    sortOrder,
    ...(full && filters.action ? { action: filters.action } : {}),
    ...(full && filters.entityType ? { entityType: filters.entityType } : {}),
    ...(full && filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
    ...(filters.entityId ? { entityId: filters.entityId } : {}),
    ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
    ...(filters.toDate ? { toDate: filters.toDate } : {}),
  };
  const query = useGetAuditLogsQuery(full ? params : ownReviewAuditQuery(userId ?? "", params), {
    skip: !userId,
    refetchOnMountOrArgChange: true,
  });
  const response = query.currentData;
  const columns = useMemo<ColumnDef<AuditLogRecord>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Recorded at",
        enableSorting: true,
        size: 210,
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      { accessorKey: "action", header: "Action", size: 200 },
      {
        accessorKey: "entityId",
        header: "Entity",
        size: 300,
        cell: ({ row }) =>
          row.original.entityId &&
          (row.original.entityType === "Submission" ||
            (full && row.original.entityType === "User")) ? (
            <Link
              className="break-all text-primary hover:underline"
              href={`/${workspace}/${row.original.entityType === "User" ? "users" : "submissions"}/${row.original.entityId}`}
            >
              {row.original.entityId}
            </Link>
          ) : (
            (row.original.entityId ?? "Unavailable")
          ),
      },
      ...(full
        ? [
            { accessorKey: "entityType", header: "Entity type", size: 130 },
            {
              id: "actor",
              header: "Actor",
              size: 240,
              cell: ({ row }: { row: { original: AuditLogRecord } }) =>
                row.original.actor?.email ?? "Unavailable",
            },
          ]
        : []),
      {
        id: "actions",
        header: "Details",
        size: 100,
        cell: ({ row }) => (
          <Link
            className="text-primary hover:underline"
            href={`/${workspace}/audit-logs/${row.original.id}`}
          >
            Inspect
          </Link>
        ),
      },
    ],
    [workspace, full],
  );
  const unexpectedScope = !full && response?.data.some((row) => !isOwnReviewAudit(row, userId));
  return (
    <>
      <PageHeading
        title={full ? "Audit logs" : "My review activity"}
        description={
          full
            ? "All visible audit entries. Filters use exact values and inclusive UTC calendar days."
            : "Your own submission-review audit entries. Date filters use inclusive UTC calendar days."
        }
      />
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <form
            noValidate
            aria-label={full ? "Filter audit logs" : "Filter my review activity"}
            className="mb-5"
            onSubmit={form.handleSubmit((values) => {
              setFilters(values);
              setPage(1);
            })}
          >
            <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-[1fr_180px_180px]">
              <Field
                label={full ? "Entity ID (optional)" : "Submission ID (optional)"}
                error={form.formState.errors.entityId?.message}
              >
                <Input {...form.register("entityId")} placeholder="Exact submission ID" />
              </Field>
              <Field label="From date (UTC)" error={form.formState.errors.fromDate?.message}>
                <Input type="date" {...form.register("fromDate")} />
              </Field>
              <Field label="To date (UTC)" error={form.formState.errors.toDate?.message}>
                <Input type="date" {...form.register("toDate")} />
              </Field>
            </div>
            {full && (
              <div className="grid gap-x-4 sm:grid-cols-3">
                <Field label="Action (exact)" error={form.formState.errors.action?.message}>
                  <Input
                    {...form.register("action")}
                    maxLength={100}
                    placeholder="e.g. USER_STATUS_CHANGED"
                  />
                </Field>
                <Field
                  label="Entity type (exact)"
                  error={form.formState.errors.entityType?.message}
                >
                  <Input {...form.register("entityType")} maxLength={100} placeholder="e.g. User" />
                </Field>
                <Field
                  label="Actor User ID (exact)"
                  error={form.formState.errors.actorUserId?.message}
                >
                  <Input {...form.register("actorUserId")} />
                </Field>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={query.isFetching}>
                Apply filters
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset(emptyFilters);
                  setFilters(emptyFilters);
                  setPage(1);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
          {query.isError ? (
            <RequestError
              error={query.error}
              busy={query.isFetching}
              retry={() => void query.refetch()}
            />
          ) : unexpectedScope ? (
            <ErrorAlert message="Review activity outside your permitted scope was returned. This data cannot be displayed." />
          ) : !response ? (
            <ContentSkeleton rows={8} />
          ) : (
            <>
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
                sortBy="createdAt"
                sortOrder={sortOrder}
                setSortBy={() => setPage(1)}
                setSortOrder={(value) => {
                  setSortOrder(value as typeof sortOrder);
                  setPage(1);
                }}
                isFetching={query.isFetching}
                urlParamsUpdate={false}
                minWidth={850}
              />
              {!response.data.length && response.meta.total > 0 && (
                <Button onClick={() => setPage(1)}>Return to first page</Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

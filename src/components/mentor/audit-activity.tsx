"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useGetAuditLogsQuery } from "@/redux/features/auditLog/auditLogApi";
import { useAppSelector } from "@/redux/hooks";
import type { AuditLogRecord } from "@/types/audit-log.types";
import { ownReviewAuditQuery, isOwnReviewAudit } from "@/lib/mentor";
import { auditFiltersSchema, type AuditFilterValues } from "@/schema/mentor.schema";
import { RequestError, StudentPageHeading as PageHeading } from "@/components/student/submission-shared";
import { ContentSkeleton, ErrorAlert } from "@/components/shared/feedback";
import DataTable from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const emptyFilters: AuditFilterValues = { entityId: "", fromDate: "", toDate: "" };
export default function AuditActivity() {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState(emptyFilters);
  const form = useForm<AuditFilterValues>({ resolver: zodResolver(auditFiltersSchema), defaultValues: emptyFilters });
  const query = useGetAuditLogsQuery(ownReviewAuditQuery(userId ?? "", { page, limit, sortBy: "createdAt", sortOrder, ...(filters.entityId ? { entityId: filters.entityId } : {}), ...(filters.fromDate ? { fromDate: filters.fromDate } : {}), ...(filters.toDate ? { toDate: filters.toDate } : {}) }), { skip: !userId, refetchOnMountOrArgChange: true });
  const response = query.currentData;
  const columns = useMemo<ColumnDef<AuditLogRecord>[]>(() => [
    { accessorKey: "createdAt", header: "Reviewed at", enableSorting: true, size: 210, cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
    { accessorKey: "action", header: "Activity", size: 200, cell: () => "Submission reviewed" },
    { accessorKey: "entityId", header: "Submission", size: 300, cell: ({ row }) => row.original.entityId ? <Link className="break-all text-primary hover:underline" href={`/mentor/submissions/${row.original.entityId}`}>{row.original.entityId}</Link> : "Unavailable" },
    { id: "actions", header: "Details", size: 100, cell: ({ row }) => <Link className="text-primary hover:underline" href={`/mentor/audit-logs/${row.original.id}`}>Inspect</Link> },
  ], []);
  const unexpectedScope = response?.data.some((row) => !isOwnReviewAudit(row, userId));
  return <><PageHeading title="My review activity" description="Your own submission-review audit entries. Date filters use inclusive UTC calendar days." /><Card className="rounded-xl border-slate-200 shadow-sm"><CardContent className="p-4 sm:p-6"><form noValidate aria-label="Filter my review activity" className="mb-5" onSubmit={form.handleSubmit((values) => { setFilters(values); setPage(1); })}><div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-[1fr_180px_180px]"><Field label="Submission ID (optional)" error={form.formState.errors.entityId?.message}><Input {...form.register("entityId")} placeholder="Exact submission ID" /></Field><Field label="From date (UTC)" error={form.formState.errors.fromDate?.message}><Input type="date" {...form.register("fromDate")} /></Field><Field label="To date (UTC)" error={form.formState.errors.toDate?.message}><Input type="date" {...form.register("toDate")} /></Field></div><div className="flex gap-2"><Button type="submit" disabled={query.isFetching}>Apply filters</Button><Button type="button" variant="outline" onClick={() => { form.reset(emptyFilters); setFilters(emptyFilters); setPage(1); }}>Clear</Button></div></form>
    {query.isError ? <RequestError error={query.error} busy={query.isFetching} retry={() => void query.refetch()} /> : unexpectedScope ? <ErrorAlert message="Review activity outside your permitted scope was returned. This data cannot be displayed." /> : !response ? <ContentSkeleton rows={8} /> : <><DataTable data={response.data} columns={columns} meta={response.meta} page={response.meta.page} limit={response.meta.limit} setPage={setPage} setLimit={(value) => { setLimit(value); setPage(1); }} sortBy="createdAt" sortOrder={sortOrder} setSortBy={() => setPage(1)} setSortOrder={(value) => { setSortOrder(value as typeof sortOrder); setPage(1); }} isFetching={query.isFetching} urlParamsUpdate={false} minWidth={850} />{!response.data.length && response.meta.total > 0 && <Button onClick={() => setPage(1)}>Return to first page</Button>}</>}
  </CardContent></Card></>;
}

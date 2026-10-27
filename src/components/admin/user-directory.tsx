"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useGetUsersQuery } from "@/redux/features/user/userApi";
import type { ListUsersQuery, UserListItem } from "@/types/api-contracts";
import { userFiltersSchema, type UserFilterValues } from "@/schema/admin.schema";
import {
  RequestError,
  StudentPageHeading as PageHeading,
} from "@/components/student/submission-shared";
import { ContentSkeleton } from "@/components/shared/feedback";
import DataTable from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/student-submissions";

const emptyFilters: UserFilterValues = {
  search: "",
  role: "",
  isActive: "",
  ids: "",
  fromDate: "",
  toDate: "",
};
export default function UserDirectory() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<NonNullable<ListUsersQuery["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState(emptyFilters);
  const form = useForm<UserFilterValues>({
    resolver: zodResolver(userFiltersSchema),
    defaultValues: emptyFilters,
  });
  const query = useGetUsersQuery(
    {
      page,
      limit,
      sortBy,
      sortOrder,
      search: filters.search,
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.isActive ? { isActive: filters.isActive } : {}),
      ...(filters.ids
        ? {
            ids: filters.ids
              .split(",")
              .map((value) => value.trim())
              .join(","),
          }
        : {}),
      ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
      ...(filters.toDate ? { toDate: filters.toDate } : {}),
    },
    { refetchOnMountOrArgChange: true },
  );
  const response = query.currentData;
  const columns = useMemo<ColumnDef<UserListItem>[]>(
    () => [
      {
        accessorKey: "email",
        header: "User email",
        enableSorting: true,
        size: 280,
        cell: ({ row }) => (
          <Link
            className="break-all font-medium text-primary hover:underline"
            href={`/admin/users/${row.original.id}`}
          >
            {row.original.email}
          </Link>
        ),
      },
      { accessorKey: "role", header: "Role", enableSorting: true, size: 130 },
      {
        accessorKey: "isActive",
        header: "Account status",
        enableSorting: true,
        size: 150,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "green" : "red"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        enableSorting: true,
        size: 150,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        enableSorting: true,
        size: 150,
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "Actions",
        size: 160,
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/users/${row.original.id}`}>
            Manage account
          </Link>
        ),
      },
    ],
    [],
  );
  return (
    <>
      <PageHeading
        title="User management"
        description="Manage account email, password, role, and access. Search matches email only."
      />
      <Card className="rounded-xl">
        <CardContent className="p-4 sm:p-6">
          <form
            noValidate
            aria-label="Filter User accounts"
            className="mb-5"
            onSubmit={form.handleSubmit((values) => {
              setFilters(values);
              setPage(1);
            })}
          >
            <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Email search" error={form.formState.errors.search?.message}>
                <Input {...form.register("search")} maxLength={100} />
              </Field>
              <Field label="Role" error={form.formState.errors.role?.message}>
                <select
                  className="h-10 w-full rounded-md border bg-white px-3"
                  {...form.register("role")}
                >
                  <option value="">All roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MENTOR">Mentor</option>
                  <option value="STUDENT">Student</option>
                </select>
              </Field>
              <Field label="Account status" error={form.formState.errors.isActive?.message}>
                <select
                  className="h-10 w-full rounded-md border bg-white px-3"
                  {...form.register("isActive")}
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
              <Field label="User IDs (comma-separated)" error={form.formState.errors.ids?.message}>
                <Input {...form.register("ids")} />
              </Field>
              <Field label="From date (UTC)" error={form.formState.errors.fromDate?.message}>
                <Input type="date" {...form.register("fromDate")} />
              </Field>
              <Field label="To date (UTC)" error={form.formState.errors.toDate?.message}>
                <Input type="date" {...form.register("toDate")} />
              </Field>
            </div>
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
                minWidth={1050}
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

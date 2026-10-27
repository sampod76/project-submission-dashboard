"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useGetAdminsQuery } from "@/redux/features/admin/adminApi";
import { useGetMentorsQuery } from "@/redux/features/mentor/mentorApi";
import type {
  AdminRecord,
  ListAdminsQuery,
  MentorRecord,
  ListMentorsQuery,
} from "@/types/api-contracts";
import {
  adminDirectoryFiltersSchema,
  type AdminDirectoryFilterValues,
} from "@/schema/admin.schema";
import { useDebounced } from "@/hooks/use-debounce";
import {
  StudentPageHeading as PageHeading,
  RequestError,
} from "@/components/student/submission-shared";
import { ContentSkeleton } from "@/components/shared/feedback";
import DataTable from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/student-submissions";

const emptyFilters: AdminDirectoryFilterValues = {
  search: "",
  userId: "",
  fromDate: "",
  toDate: "",
};
export function AdminDirectory() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<NonNullable<ListAdminsQuery["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState(emptyFilters);
  const form = useForm<AdminDirectoryFilterValues>({
    resolver: zodResolver(adminDirectoryFiltersSchema),
    defaultValues: emptyFilters,
  });
  const query = useGetAdminsQuery(
    {
      page,
      limit,
      sortBy,
      sortOrder,
      search: filters.search,
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
      ...(filters.toDate ? { toDate: filters.toDate } : {}),
    },
    { refetchOnMountOrArgChange: true },
  );
  const response = query.currentData;
  const columns = useMemo<ColumnDef<AdminRecord>[]>(
    () => [
      {
        accessorKey: "firstName",
        header: "First name",
        enableSorting: true,
        size: 160,
        cell: ({ row }) => (
          <Link
            className="font-medium text-primary hover:underline"
            href={`/admin/admins/${row.original.id}`}
          >
            {row.original.firstName}
          </Link>
        ),
      },
      { accessorKey: "lastName", header: "Last name", enableSorting: true, size: 160 },
      {
        accessorKey: "phone",
        header: "Phone",
        enableSorting: true,
        size: 160,
        cell: ({ row }) => row.original.phone || "—",
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        enableSorting: true,
        size: 140,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "account",
        header: "User account",
        size: 160,
        cell: ({ row }) => (
          <Link
            className="text-primary hover:underline"
            href={`/admin/users/${row.original.userId}`}
          >
            Manage account
          </Link>
        ),
      },
      {
        id: "actions",
        header: "Profile",
        size: 140,
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/admins/${row.original.id}`}>
            View / edit
          </Link>
        ),
      },
    ],
    [],
  );
  return (
    <>
      <PageHeading
        title="Admin management"
        description="Manage administrator profiles and their linked User accounts."
        action={
          <Button asChild>
            <Link href="/admin/admins/new">Create Admin</Link>
          </Button>
        }
      />
      <Card className="rounded-xl">
        <CardContent className="p-4 sm:p-6">
          <form
            noValidate
            aria-label="Filter Admin directory"
            className="mb-5"
            onSubmit={form.handleSubmit((values) => {
              setFilters(values);
              setPage(1);
            })}
          >
            <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Search names or phone" error={form.formState.errors.search?.message}>
                <Input {...form.register("search")} maxLength={100} />
              </Field>
              <Field label="User ID (optional)" error={form.formState.errors.userId?.message}>
                <Input {...form.register("userId")} />
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
          <p className="mb-4 text-sm text-muted-foreground">
            Profiles can remain after an account is deleted or its role changes. Open a profile to
            check its linked account.
          </p>
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
                minWidth={950}
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

export function MentorDirectory() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<NonNullable<ListMentorsQuery["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<MentorRecord | null>(null);
  const searchTerm = useDebounced({ searchQuery: search, delay: 350 });
  const query = useGetMentorsQuery(
    { page, limit, searchTerm: searchTerm.trim(), sortBy, sortOrder },
    { refetchOnMountOrArgChange: true },
  );
  const response = query.currentData;
  const columns = useMemo<ColumnDef<MentorRecord>[]>(
    () => [
      { accessorKey: "firstName", header: "First name", enableSorting: true, size: 150 },
      { accessorKey: "lastName", header: "Last name", enableSorting: true, size: 150 },
      {
        id: "email",
        header: "Email",
        size: 230,
        cell: ({ row }) => <span className="break-all">{row.original.user.email}</span>,
      },
      {
        accessorKey: "phone",
        header: "Phone",
        size: 150,
        cell: ({ row }) => row.original.phone || "—",
      },
      {
        id: "status",
        header: "Account status",
        size: 140,
        cell: ({ row }) => (
          <Badge variant={row.original.user.isActive ? "green" : "red"}>
            {row.original.user.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        enableSorting: true,
        size: 140,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        size: 220,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setSelected(row.original)}
            >
              Profile
            </button>
            <Link
              className="text-primary hover:underline"
              href={`/admin/mentors/${row.original.userId}`}
            >
              Manage account
            </Link>
          </div>
        ),
      },
    ],
    [],
  );
  return (
    <>
      <PageHeading
        title="Mentor management"
        description="Create Mentors, inspect their profiles, and manage their account access."
        action={
          <Button asChild>
            <Link href="/admin/mentors/new">Create Mentor</Link>
          </Button>
        }
      />
      <Card className="rounded-xl">
        <CardContent className="p-4 sm:p-6">
          <label className="mb-5 block max-w-lg text-sm font-medium">
            Search names, email, or phone
            <Input
              aria-label="Search Mentors"
              className="mt-2"
              maxLength={100}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
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
                minWidth={1180}
              />
              {!response.data.length && response.meta.total > 0 && (
                <Button onClick={() => setPage(1)}>Return to first page</Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90svh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.firstName} {selected?.lastName}
            </DialogTitle>
            <DialogDescription>Mentor profile information</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <dl className="space-y-3">
                {[
                  ["Email", selected.user.email],
                  ["Phone", selected.phone],
                  ["Gender", selected.gender],
                  ["Bio", selected.bio],
                  ["Created", formatDate(selected.createdAt)],
                  ["Updated", formatDate(selected.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="whitespace-pre-wrap break-words">{value || "Not provided"}</dd>
                  </div>
                ))}
              </dl>
              <Badge variant={selected.user.isActive ? "green" : "red"}>
                {selected.user.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button asChild className="w-full">
                <Link href={`/admin/mentors/${selected.userId}`}>Manage Mentor account</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

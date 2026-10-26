"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useGetStudentsQuery } from "@/redux/features/student/studentApi";
import { useGetUsersQuery } from "@/redux/features/user/userApi";
import type { ListStudentsQuery, StudentRecord } from "@/types/student.types";
import type { ListUsersQuery, UserListItem } from "@/types/user.types";
import { useDebounced } from "@/hooks/use-debounce";
import {
  StudentPageHeading as PageHeading,
  RequestError,
} from "@/components/student/submission-shared";
import { ContentSkeleton } from "@/components/shared/feedback";
import DataTable from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/student-submissions";

function Directory({ workspace }: { workspace: "mentor" | "admin" }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<NonNullable<ListStudentsQuery["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const searchTerm = useDebounced({ searchQuery: search, delay: 350 });
  const query = useGetStudentsQuery(
    { page, limit, searchTerm: searchTerm.trim(), sortBy, sortOrder },
    { refetchOnMountOrArgChange: true },
  );
  const response = query.currentData;
  const columns = useMemo<ColumnDef<StudentRecord>[]>(
    () => [
      { accessorKey: "firstName", header: "First name", enableSorting: true, size: 160 },
      { accessorKey: "lastName", header: "Last name", enableSorting: true, size: 160 },
      {
        id: "email",
        header: "Email",
        size: 240,
        cell: ({ row }) => <span className="break-all">{row.original.user.email}</span>,
      },
      {
        accessorKey: "phone",
        header: "Phone",
        size: 140,
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
        header: "Joined",
        enableSorting: true,
        size: 140,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        size: 190,
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setSelected(row.original)}
            >
              Profile
            </button>
            <Link
              className="text-primary hover:underline"
              href={`/${workspace}/students/${row.original.userId}`}
            >
              Manage account
            </Link>
          </div>
        ),
      },
    ],
    [workspace],
  );
  return (
    <>
      <label className="mb-5 block max-w-lg text-sm font-medium">
        Search student names, email, or phone
        <Input
          aria-label="Search student directory"
          className="mt-2"
          value={search}
          maxLength={100}
          placeholder="Find a student"
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
            minWidth={1150}
          />
          {!response.data.length && response.meta.total > 0 && (
            <Button onClick={() => setPage(1)}>Return to first page</Button>
          )}
        </>
      )}
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
            <DialogDescription>Student profile information from the directory.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-3">
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all">{selected.user.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{selected.phone || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Gender</dt>
                  <dd>{selected.gender || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Bio</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {selected.bio || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd>{formatDate(selected.createdAt)}</dd>
                </div>
              </dl>
              <Badge variant={selected.user.isActive ? "green" : "red"}>
                {selected.user.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button asChild className="w-full">
                <Link href={`/${workspace}/students/${selected.userId}`}>
                  Manage Student account
                </Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Accounts({ workspace }: { workspace: "mentor" | "admin" }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState<NonNullable<ListUsersQuery["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const searchTerm = useDebounced({ searchQuery: search, delay: 350 });
  const query = useGetUsersQuery(
    {
      page,
      limit,
      role: "STUDENT",
      search: searchTerm.trim(),
      ...(active ? { isActive: active } : {}),
      sortBy,
      sortOrder,
    },
    { refetchOnMountOrArgChange: true },
  );
  const response = query.currentData;
  const columns = useMemo<ColumnDef<UserListItem>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Student email",
        enableSorting: true,
        size: 280,
        cell: ({ row }) => (
          <Link
            className="break-all font-medium text-primary hover:underline"
            href={`/${workspace}/students/${row.original.id}`}
          >
            {row.original.email}
          </Link>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Account status",
        enableSorting: true,
        size: 160,
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
        size: 170,
        cell: ({ row }) => (
          <Link
            className="text-primary hover:underline"
            href={`/${workspace}/students/${row.original.id}`}
          >
            Manage account
          </Link>
        ),
      },
    ],
    [workspace],
  );
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <label className="min-w-0 flex-1 text-sm font-medium">
          Search Student account email
          <Input
            aria-label="Search Student accounts"
            className="mt-2"
            value={search}
            maxLength={100}
            placeholder="student@example.com"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="text-sm font-medium">
          Account status
          <select
            aria-label="Student account status"
            className="mt-2 block h-10 rounded-md border bg-white px-3"
            value={active}
            onChange={(event) => {
              setActive(event.target.value as typeof active);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
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
            minWidth={900}
          />
          {!response.data.length && response.meta.total > 0 && (
            <Button onClick={() => setPage(1)}>Return to first page</Button>
          )}
        </>
      )}
    </>
  );
}

export default function StudentDirectory({
  workspace = "mentor",
}: {
  workspace?: "mentor" | "admin";
}) {
  const [tab, setTab] = useState<"directory" | "accounts">("directory");
  return (
    <>
      <PageHeading
        title="Student directory"
        description="Find students, view their profile information, and manage permitted Student account settings."
      />
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Student views">
        {(
          [
            ["directory", "Directory"],
            ["accounts", "Account management"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? "default" : "outline"}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {tab === "directory" ? (
            <Directory workspace={workspace} />
          ) : (
            <Accounts workspace={workspace} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

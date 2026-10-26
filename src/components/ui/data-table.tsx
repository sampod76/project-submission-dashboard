"use client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { TMeta } from "@/types";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "./table";
import { Pagination, PaginationContent, PaginationItem } from "./pagination";
import { Button } from "./button";
import { OptionSelect } from "./option-select";
import { EmptyState, Spinner } from "@/components/shared/feedback";

type DataTableProps<TData> = {
  data?: TData[];
  columns: ColumnDef<TData>[];
  meta?: TMeta;
  isLoading?: boolean;
  isFetching?: boolean;
  page?: number;
  limit?: number;
  setPage?: (page: number) => void;
  setLimit?: (limit: number) => void;
  sortBy?: string;
  sortOrder?: string;
  setSortBy?: (field: string) => void;
  setSortOrder?: (order: string) => void;
  showSizeChanger?: boolean;
  urlParamsUpdate?: boolean;
  pagination?: boolean;
  minWidth?: number;
};
export default function DataTable<TData extends { _id: string }>({
  data = [],
  columns,
  meta,
  isLoading,
  isFetching,
  page = 1,
  limit = 10,
  setPage,
  setLimit,
  sortBy = "createdAt",
  sortOrder = "desc",
  setSortBy,
  setSortOrder,
  showSizeChanger = true,
  urlParamsUpdate = true,
  pagination = true,
  minWidth = 1100,
}: DataTableProps<TData>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];
  const paginationState = { pageIndex: page - 1, pageSize: limit };
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row._id,
    defaultColumn: { enableSorting: false },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableMultiSort: false,
    sortDescFirst: false,
    rowCount: meta?.total ?? 0,
    state: { pagination: paginationState, sorting },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(paginationState) : updater;
      const nextPage = next.pageSize !== limit ? 1 : next.pageIndex + 1;
      setPage?.(nextPage);
      setLimit?.(next.pageSize);
      if (urlParamsUpdate) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(nextPage));
        params.set("limit", String(next.pageSize));
        router.push(`?${params.toString()}`);
      }
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSortBy?.(next[0]?.id ?? "createdAt");
      setSortOrder?.(next[0] ? (next[0].desc ? "desc" : "asc") : "desc");
    },
  });
  const total = meta?.total ?? 0;
  const pending = isLoading || isFetching;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="custom-data-table relative min-w-0" aria-busy={pending}>
      {pending && (
        <div
          role="status"
          aria-label="Loading records"
          className="absolute inset-x-0 top-10 z-20 flex min-h-24 justify-center bg-white/65 p-8"
        >
          <Spinner />
        </div>
      )}
      <Table style={{ minWidth, tableLayout: "fixed" }}>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={`h-auto whitespace-nowrap bg-[#f2f3f5] px-4 py-2.5 font-semibold text-foreground ${header.column.id === "actions" ? "sticky right-0 z-10 text-center" : ""}`}
                  aria-sort={
                    header.column.getIsSorted() === "asc"
                      ? "ascending"
                      : header.column.getIsSorted() === "desc"
                        ? "descending"
                        : undefined
                  }
                >
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-primary" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDown className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group border-0 odd:bg-white even:bg-slate-50">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={`overflow-hidden border-b-[6px] border-transparent px-4 py-[9px] leading-[22px] ${cell.column.id === "actions" ? "sticky right-0 z-10 bg-inherit text-center" : ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}>
                {pending ? <div className="h-24" /> : <EmptyState />}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {pagination && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            {total && data.length ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, total)} of{" "}
            {total} items
          </span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous page"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeft />
                </Button>
              </PaginationItem>
              {Array.from(
                { length: Math.min(5, pageCount) },
                (_, index) => Math.min(Math.max(1, page - 2), Math.max(1, pageCount - 4)) + index,
              ).map((number) => (
                <PaginationItem key={number}>
                  <Button
                    variant={number === page ? "secondary" : "ghost"}
                    size="icon"
                    aria-label={`Page ${number}`}
                    aria-current={number === page ? "page" : undefined}
                    onClick={() => table.setPageIndex(number - 1)}
                  >
                    {number}
                  </Button>
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next page"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRight />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          {showSizeChanger && (
            <OptionSelect
              aria-label="Rows per page"
              className="w-28"
              value={String(limit)}
              onChange={(value) => {
                if (value) table.setPageSize(Number(value));
              }}
              options={[10, 20, 50].map((value) => ({
                value: String(value),
                label: `${value} / page`,
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

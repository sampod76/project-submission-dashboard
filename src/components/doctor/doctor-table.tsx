import Table from "@/components/ui/data-table";
import type { TMeta } from "@/types";
import type { DoctorSortBy, DoctorSortOrder, TDoctor } from "@/types/doctor";
import { useDoctorColumns } from "./doctor-table-columns";

import { useState } from "react";
import EditDoctorForm from "./edit-doctor-form";

type DoctorTableProps = {
  doctors: TDoctor[];
  meta: TMeta | undefined;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  sortBy: DoctorSortBy;
  sortOrder: DoctorSortOrder;
  changeSortBy: (field: string) => void;
  changeSortOrder: (order: string) => void;
};

export default function DoctorTable({
  doctors,
  meta,
  isLoading,
  isFetching,
  page,
  limit,
  setPage,
  setLimit,
  sortBy,
  sortOrder,
  changeSortBy,
  changeSortOrder,
}: DoctorTableProps) {
  const [editingDoctor, setEditingDoctor] = useState<TDoctor>();
  const { columns, confirmation } = useDoctorColumns({
    onEdit: setEditingDoctor,
  });
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-blue-200 sm:p-5">
      {confirmation}
      <Table<TDoctor>
        data={doctors}
        meta={meta}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        setSortBy={changeSortBy}
        setSortOrder={changeSortOrder}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
      {editingDoctor && (
        <EditDoctorForm doctor={editingDoctor} onClose={() => setEditingDoctor(undefined)} />
      )}
    </div>
  );
}

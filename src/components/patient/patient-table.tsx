import Table from "@/components/ui/data-table";
import type { TMeta } from "@/types";
import type { PatientSortBy, PatientSortOrder, TPatient } from "@/types/patient";
import { useState } from "react";
import { usePatientColumns } from "./patient-table-columns";
import PatientEditContent from "./patient-edit-content";
import ModalComponent from "@/components/ui/modal";

type PatientTableProps = {
  patients: TPatient[];
  meta: TMeta | undefined;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  sortBy: PatientSortBy;
  sortOrder: PatientSortOrder;
  changeSortBy: (field: string) => void;
  changeSortOrder: (order: string) => void;
};

export default function PatientTable(props: PatientTableProps) {
  const [selectedPatient, setSelectedPatient] = useState<TPatient>();
  const [formLoading, setFormLoading] = useState(false);
  const { columns, confirmation } = usePatientColumns({
    onEdit: setSelectedPatient,
  });
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-blue-200 sm:p-5">
      {confirmation}
      <Table<TPatient>
        data={props.patients}
        meta={props.meta}
        columns={columns}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        page={props.page}
        setPage={props.setPage}
        limit={props.limit}
        setLimit={props.setLimit}
        setSortBy={props.changeSortBy}
        setSortOrder={props.changeSortOrder}
        sortBy={props.sortBy}
        sortOrder={props.sortOrder}
      />
      <ModalComponent
        title="Edit Patient"
        destroyOnClose
        open={Boolean(selectedPatient)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPatient(undefined);
            setFormLoading(false);
          }
        }}
        width={640}
        loading={formLoading}
      >
        {selectedPatient && (
          <PatientEditContent
            key={selectedPatient._id}
            id={selectedPatient._id}
            onLoadingChange={setFormLoading}
          />
        )}
      </ModalComponent>
    </div>
  );
}

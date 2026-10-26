import { Filter, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

type PatientHeaderProps = {
  total?: number;
  onCreate: () => void;
  filterOpen: boolean;
  onOpenFilters: () => void;
};

export default function PatientHeader({
  filterOpen,
  onOpenFilters,
  onCreate,
  total,
}: PatientHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
      <div className="min-w-0">
        <h2 className="m-0 flex items-center gap-2 text-xl font-semibold text-slate-900">
          <Users className="text-orange-500" /> Patients
        </h2>
        <p className="mb-0 mt-1 text-sm text-slate-500">
          {total === undefined
            ? "Manage patients and their treatment"
            : `${total} patients matching the current filters`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="default" onClick={onCreate} className="bg-orange-500 hover:!bg-orange-600">
          <Plus />
          Add Patient
        </Button>
        <button
          type="button"
          aria-label="Filter patients"
          aria-expanded={filterOpen}
          aria-haspopup="dialog"
          onClick={onOpenFilters}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg text-slate-600 hover:bg-slate-50 sm:hidden"
        >
          <Filter />
        </button>
      </div>
    </div>
  );
}

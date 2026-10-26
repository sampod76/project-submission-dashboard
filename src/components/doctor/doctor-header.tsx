import CreateDoctorForm from "@/components/doctor/create-doctor-form";
import ModalComponent from "@/components/ui/modal";
import { Filter, BriefcaseMedical, Plus } from "lucide-react";

type DoctorHeaderProps = {
  filterOpen: boolean;
  onOpenFilters: () => void;
};

export default function DoctorHeader({ filterOpen, onOpenFilters }: DoctorHeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 sm:gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight text-gray-900 sm:text-3xl">
          <BriefcaseMedical className="text-orange-500 sm:hidden" />
          <span className="sm:hidden">Doctors</span>
          <span className="hidden sm:inline">Doctor Management</span>
        </h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ModalComponent
          title="Create Doctor"
          width={500}
          className="doctor-compact-modal"
          button={
            <button
              type="button"
              className="inline-flex min-h-11 w-fit items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-orange-600 hover:shadow-md active:scale-[0.98] sm:min-h-0 sm:gap-2 sm:px-4 sm:py-2.5"
            >
              <Plus className="text-base" />
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create Doctor</span>
            </button>
          }
        >
          <CreateDoctorForm />
        </ModalComponent>
        <button
          type="button"
          aria-label="Filter doctors"
          aria-expanded={filterOpen}
          aria-haspopup="dialog"
          onClick={onOpenFilters}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg text-slate-600 hover:bg-slate-50 sm:hidden"
        >
          <Filter />
        </button>
      </div>
    </div>
  );
}

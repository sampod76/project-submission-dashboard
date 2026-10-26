import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { SPECIALIZATION, type DoctorSortBy, type DoctorSortOrder } from "@/types/doctor";
import { specializationLabel } from "./doctor-table-columns";

const sortOptions: { value: DoctorSortBy; label: string }[] = [
  { value: "createdAt", label: "Created At" },
  { value: "updatedAt", label: "Updated At" },
  { value: "name", label: "Doctor Name" },
  { value: "specialization", label: "Specialization" },
  { value: "hospital", label: "Hospital" },
];

export type DoctorFilterValuesProps = {
  specialization: SPECIALIZATION | undefined;
  isActive: boolean | undefined;
  sortBy: DoctorSortBy;
  sortOrder: DoctorSortOrder;
  setSpecialization: (value: SPECIALIZATION | undefined) => void;
  setIsActive: (value: boolean | undefined) => void;
  setPage: (page: number) => void;
  changeSortBy: (field: string) => void;
  changeSortOrder: (order: string) => void;
  resetFilters: () => void;
};

type DoctorFiltersProps = DoctorFilterValuesProps &
  (
    | { mode?: "desktop"; searchTerm: string; setSearchTerm: (value: string) => void }
    | { mode: "mobile"; searchTerm?: never; setSearchTerm?: never }
  );

export default function DoctorFilters(props: DoctorFiltersProps) {
  const {
    specialization,
    isActive,
    sortBy,
    sortOrder,
    setSpecialization,
    setIsActive,
    setPage,
    changeSortBy,
    changeSortOrder,
    resetFilters,
  } = props;
  const mobile = props.mode === "mobile";
  const controls = (
    <>
      <div className={mobile ? "space-y-1.5" : "w-full xl:w-[210px]"}>
        {mobile && <div className="text-sm font-medium text-slate-700">Specialization</div>}
        <OptionSelect<SPECIALIZATION>
          aria-label="Specialization"
          placeholder="All Specializations"
          clearable
          value={specialization}
          className="w-full"
          options={Object.values(SPECIALIZATION).map((value) => ({
            value,
            label: specializationLabel(value),
          }))}
          onChange={(value) => {
            setSpecialization(value);
            setPage(1);
          }}
        />
      </div>
      <div className={mobile ? "space-y-1.5" : "w-full xl:w-[150px]"}>
        {mobile && <div className="text-sm font-medium text-slate-700">Status</div>}
        <OptionSelect
          aria-label="Active status"
          value={isActive === undefined ? "all" : isActive ? "active" : "inactive"}
          className="w-full"
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          onChange={(value) => {
            setIsActive(value === "all" ? undefined : value === "active");
            setPage(1);
          }}
        />
      </div>
      <div className={mobile ? "space-y-1.5" : "w-full xl:w-[170px]"}>
        {mobile && <div className="text-sm font-medium text-slate-700">Sort By</div>}
        <OptionSelect<DoctorSortBy>
          aria-label="Sort by"
          value={sortBy}
          options={sortOptions}
          onChange={changeSortBy}
          className="w-full"
        />
      </div>
      <div className={mobile ? "space-y-1.5" : "w-full xl:w-[150px]"}>
        {mobile && <div className="text-sm font-medium text-slate-700">Sort Order</div>}
        <OptionSelect<DoctorSortOrder>
          aria-label="Sort order"
          value={sortOrder}
          options={[
            { value: "asc", label: "Ascending" },
            { value: "desc", label: "Descending" },
          ]}
          onChange={changeSortOrder}
          className="w-full"
        />
      </div>
    </>
  );

  if (props.mode === "mobile") return <div className="space-y-4">{controls}</div>;
  const { searchTerm, setSearchTerm } = props;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-blue-200">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <Input
          aria-label="Search doctors"
          placeholder="Search by name, phone or registration no."
          onClear={() => {
            setSearchTerm("");
            setPage(1);
          }}
          leadingIcon={<Search className="text-slate-400" />}
          value={searchTerm}
          className="xl:min-w-[280px] xl:flex-1"
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
        />

        <div className="hidden sm:contents">
          {controls}
          <Button variant="secondary" onClick={resetFilters} className="w-full xl:w-auto">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

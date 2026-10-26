import { Combobox } from "@/components/ui/combobox";
import type { TDoctor } from "@/types/doctor";
import { RotateCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Hint } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/date-picker";

import {
  ENUM_GENDER,
  TREATMENT_STATUS,
  type PatientSortBy,
  type PatientSortOrder,
} from "@/types/patient";
import { formatEnumLabel, renderDoctorRelationTooltip } from "./patient-table-columns";

export type DoctorOption = { value: string; label: string } & Pick<
  TDoctor,
  "medicalRegistrationNo" | "email" | "specialization"
>;

type PatientCommonFilterProps = {
  gender: ENUM_GENDER | undefined;
  treatmentStatus: TREATMENT_STATUS | undefined;
  followUpDate: string | undefined;
  lastVisitAt: string | undefined;
  sortBy: PatientSortBy;
  sortOrder: PatientSortOrder;
  setGender: (value: ENUM_GENDER | undefined) => void;
  setTreatmentStatus: (value: TREATMENT_STATUS | undefined) => void;
  setFollowUpDate: (value: string | undefined) => void;
  setLastVisitAt: (value: string | undefined) => void;
  setPage: (page: number) => void;
  changeSortBy: (field: string) => void;
  changeSortOrder: (order: string) => void;
  resetFilters: () => void;
};

type DoctorFilterProps = {
  doctorId: string | undefined;
  doctorOptions: DoctorOption[];
  doctorSearchTerm: string;
  isDoctorsFetching: boolean;
  doctorError: string | undefined;
  retryDoctors: () => void;
  setDoctorSearchTerm: (value: string) => void;
  changeDoctor: (value: string | undefined) => void;
};

export type PatientFilterValuesProps = PatientCommonFilterProps &
  ({ hideDoctorFilter: true } | ({ hideDoctorFilter?: false } & DoctorFilterProps));

type PatientFiltersProps = PatientFilterValuesProps &
  (
    | { mode?: "desktop"; searchTerm: string; setSearchTerm: (value: string) => void }
    | { mode: "mobile"; searchTerm?: never; setSearchTerm?: never }
  );

const sortOptions: { value: PatientSortBy; label: string }[] = [
  { value: "createdAt", label: "Created At" },
  { value: "updatedAt", label: "Updated At" },
  { value: "name", label: "Patient Name" },
  { value: "followUpDate", label: "Follow Up Date" },
  { value: "lastVisitAt", label: "Last Visit Date" },
  { value: "age", label: "Age" },
];

export default function PatientFilters(props: PatientFiltersProps) {
  const mobile = props.mode === "mobile";
  const fieldClass = (desktop: string) => (mobile ? "space-y-1.5" : `min-w-0 ${desktop}`);
  const controls = (
    <>
      {!props.hideDoctorFilter && (
        <div className={fieldClass("order-2 xl:col-span-3")}>
          {mobile && <div className="text-sm font-medium text-slate-700">Doctor</div>}
          <Combobox
            aria-label="Doctor"
            placeholder="All Doctors"
            clearable
            search={props.doctorSearchTerm}
            onSearchChange={props.setDoctorSearchTerm}
            value={props.doctorId}
            options={props.doctorOptions}
            title="Search doctors by name, email or registration no."
            onChange={props.changeDoctor}
            loading={props.isDoctorsFetching}
            emptyText={props.doctorError ? "Unable to load doctors" : "No doctors found"}
            renderOption={(option) => (
              <Hint content={renderDoctorRelationTooltip({ ...option, name: option.label })}>
                <span>{option.label || "—"}</span>
              </Hint>
            )}
          />
          {props.doctorError && !props.isDoctorsFetching && (
            <div role="alert" className="mt-1 text-xs text-red-600">
              {props.doctorError}{" "}
              <Button variant="link" size="sm" onClick={props.retryDoctors}>
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
      <div className={fieldClass("order-4 xl:col-span-2")}>
        {mobile && <div className="text-sm font-medium text-slate-700">Gender</div>}
        <OptionSelect<ENUM_GENDER>
          aria-label="Gender"
          placeholder="All Gender"
          clearable
          value={props.gender}
          options={Object.values(ENUM_GENDER).map((value) => ({
            value,
            label: formatEnumLabel(value),
          }))}
          onChange={(value) => {
            props.setGender(value);
            props.setPage(1);
          }}
          className="w-full"
        />
      </div>
      <div className={fieldClass("order-3 xl:col-span-3")}>
        {mobile && <div className="text-sm font-medium text-slate-700">Treatment Status</div>}
        <OptionSelect<TREATMENT_STATUS>
          aria-label="Treatment status"
          placeholder="All Treatment Status"
          clearable
          value={props.treatmentStatus}
          options={Object.values(TREATMENT_STATUS).map((value) => ({
            value,
            label: formatEnumLabel(value),
          }))}
          onChange={(value) => {
            props.setTreatmentStatus(value);
            props.setPage(1);
          }}
          className="w-full"
        />
      </div>
      <div className={fieldClass("order-5 xl:col-span-3")}>
        {mobile && <div className="text-sm font-medium text-slate-700">Follow Up Date</div>}
        <DatePicker
          aria-label="Follow up date"
          placeholder="Follow Up Date"
          value={props.followUpDate}
          onChange={(date) => {
            props.setFollowUpDate(date ?? undefined);
            props.setPage(1);
          }}
          className="w-full"
        />
      </div>
      <div className={fieldClass("order-6 xl:col-span-3")}>
        {mobile && <div className="text-sm font-medium text-slate-700">Last Visit Date</div>}
        <DatePicker
          aria-label="Last visit date"
          placeholder="Last Visit Date"
          value={props.lastVisitAt}
          onChange={(date) => {
            props.setLastVisitAt(date ?? undefined);
            props.setPage(1);
          }}
          className="w-full"
        />
      </div>
      <div className={fieldClass("order-7 xl:col-span-2")}>
        {mobile && <div className="text-sm font-medium text-slate-700">Sort By</div>}
        <OptionSelect<PatientSortBy>
          aria-label="Sort by"
          value={props.sortBy}
          options={sortOptions}
          onChange={props.changeSortBy}
          className="w-full"
        />
      </div>
      <div className={fieldClass("order-8 xl:col-span-2")}>
        {mobile && <div className="text-sm font-medium text-slate-700">Sort Order</div>}
        <OptionSelect<PatientSortOrder>
          aria-label="Sort order"
          value={props.sortOrder}
          options={[
            { value: "asc", label: "Ascending" },
            { value: "desc", label: "Descending" },
          ]}
          onChange={props.changeSortOrder}
          className="w-full"
        />
      </div>
    </>
  );

  if (props.mode === "mobile") return <div className="space-y-4">{controls}</div>;
  return (
    <div className="patient-compact-filters rounded-xl border border-[#e8edf3] bg-white/90 p-3">
      <div className="grid min-w-0 grid-cols-1 items-start gap-2.5 sm:grid-cols-2 xl:grid-cols-12">
        <div
          className={
            props.hideDoctorFilter
              ? "order-1 min-w-0 sm:col-span-2 xl:col-span-7"
              : "order-1 min-w-0 sm:col-span-2 xl:col-span-4"
          }
        >
          <Input
            aria-label="Search patients"
            placeholder="Search patients..."
            onClear={() => {
              props.setSearchTerm("");
              props.setPage(1);
            }}
            leadingIcon={<Search className="text-slate-400" />}
            value={props.searchTerm}
            onChange={(event) => {
              props.setSearchTerm(event.target.value);
              props.setPage(1);
            }}
          />
        </div>
        <div className="hidden sm:contents">
          {controls}
          <Button
            variant="ghost"
            onClick={props.resetFilters}
            className="patient-filter-reset order-9 justify-self-end !px-2 !text-slate-500 xl:col-span-2"
          >
            <RotateCw />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

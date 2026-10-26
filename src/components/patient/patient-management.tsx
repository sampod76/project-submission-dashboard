"use client";

import PatientHeader from "@/components/patient/patient-header";
import PatientForm from "./patient-form";
import ModalComponent from "@/components/ui/modal";
import PatientFilters, {
  type DoctorOption,
  type PatientFilterValuesProps,
} from "@/components/patient/patient-filters";
import PatientFilterDrawer from "@/components/patient/patient-filter-drawer";
import PatientTable from "@/components/patient/patient-table";
import { useDebounced } from "@/hooks/use-debounce";
import { useGetDoctorsQuery } from "@/redux/features/doctor/doctorApi";
import { useGetPatientsQuery } from "@/redux/features/patient/patientApi";
import type { DoctorsQueryParams } from "@/types/doctor";
import {
  PATIENT_SORT_FIELDS,
  type ENUM_GENDER,
  type TREATMENT_STATUS,
  type PatientSortBy,
  type PatientSortOrder,
  type PatientsQueryParams,
} from "@/types/patient";
import { apiErrorMessage } from "@/utils/api-error";
import { ErrorAlert } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function PatientManagement({ doctorId: providedDoctorId }: { doctorId?: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [doctorId, setDoctorId] = useState<string>();
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption>();
  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [gender, setGender] = useState<ENUM_GENDER>();
  const [treatmentStatus, setTreatmentStatus] = useState<TREATMENT_STATUS>();
  const [followUpDate, setFollowUpDate] = useState<string>();
  const [lastVisitAt, setLastVisitAt] = useState<string>();
  const [sortBy, setSortBy] = useState<PatientSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<PatientSortOrder>("desc");
  const debouncedSearch = useDebounced({ searchQuery: searchTerm, delay: 350 });
  const debouncedDoctorSearch = useDebounced({ searchQuery: doctorSearchTerm, delay: 350 });

  const params: PatientsQueryParams = { page, limit, sortBy, sortOrder };

  if (searchTerm.trim() && debouncedSearch.trim()) params.searchTerm = debouncedSearch.trim();
  const scopedDoctorId = providedDoctorId ?? doctorId;
  if (scopedDoctorId) params.doctorId = scopedDoctorId;
  if (gender) params.gender = gender;
  if (treatmentStatus) params.treatmentStatus = treatmentStatus;
  if (followUpDate) params.followUpDate = followUpDate;
  if (lastVisitAt) params.lastVisitAt = lastVisitAt;
  const isDebouncing = Boolean(searchTerm.trim()) && searchTerm !== debouncedSearch;
  const {
    currentData: data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPatientsQuery(params, { skip: isDebouncing });

  const doctorParams: DoctorsQueryParams = { page: 1, limit: 10 };
  if (doctorSearchTerm.trim() && debouncedDoctorSearch.trim())
    doctorParams.searchTerm = debouncedDoctorSearch.trim();
  const isDoctorDebouncing =
    Boolean(doctorSearchTerm.trim()) && doctorSearchTerm !== debouncedDoctorSearch;

  const {
    currentData: doctorsData,
    isFetching: isDoctorsFetching,
    error: doctorsError,
    refetch: refetchDoctors,
  } = useGetDoctorsQuery(doctorParams, { skip: Boolean(providedDoctorId) || isDoctorDebouncing });
  const doctorOptions: DoctorOption[] = (doctorsData?.data ?? []).map((doctor) => ({
    value: doctor._id,
    label: doctor.name,
    medicalRegistrationNo: doctor.medicalRegistrationNo,
    specialization: doctor.specialization,
    email: doctor.email,
  }));

  if (selectedDoctor && !doctorOptions.some((option) => option.value === selectedDoctor.value))
    doctorOptions.unshift(selectedDoctor);

  const changeDoctor = (value: string | undefined) => {
    setDoctorId(value);
    setSelectedDoctor(doctorOptions.find((option) => option.value === value));
    setDoctorSearchTerm("");
    setPage(1);
  };
  const changeSortBy = (field: string) => {
    const validField = PATIENT_SORT_FIELDS.find((value) => value === field);
    if (validField) {
      setSortBy(validField);
      if (validField !== sortBy) setPage(1);
    }
  };
  const changeSortOrder = (order: string) => {
    if (order === "asc" || order === "desc") {
      setSortOrder(order);
      if (order !== sortOrder) setPage(1);
    }
  };
  const resetFilters = () => {
    setSearchTerm("");
    setDoctorId(undefined);
    setSelectedDoctor(undefined);
    setDoctorSearchTerm("");
    setGender(undefined);
    setTreatmentStatus(undefined);
    setFollowUpDate(undefined);
    setLastVisitAt(undefined);
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };
  const commonFilters = {
    gender,
    treatmentStatus,
    followUpDate,
    lastVisitAt,
    sortBy,
    sortOrder,
    setGender,
    setTreatmentStatus,
    setFollowUpDate,
    setLastVisitAt,
    setPage,
    changeSortBy,
    changeSortOrder,
    resetFilters,
  };
  const filterProps: PatientFilterValuesProps = providedDoctorId
    ? { ...commonFilters, hideDoctorFilter: true }
    : {
        ...commonFilters,
        doctorId,
        doctorOptions,
        doctorSearchTerm,
        isDoctorsFetching: isDoctorsFetching || isDoctorDebouncing,
        doctorError: doctorsError
          ? apiErrorMessage(doctorsError, "Unable to load doctors.")
          : undefined,
        retryDoctors: () => {
          if (!isDoctorDebouncing) void refetchDoctors();
        },
        setDoctorSearchTerm,
        changeDoctor,
      };

  return (
    <section
      aria-label="Patient management"
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
    >
      <PatientHeader
        filterOpen={filterOpen}
        onOpenFilters={() => setFilterOpen(true)}
        onCreate={() => setCreateOpen(true)}
        total={data?.meta?.total}
      />
      <div className="space-y-2 sm:space-y-4">
        <PatientFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} {...filterProps} />
        {error && !isDebouncing && (
          <ErrorAlert
            message={apiErrorMessage(error, "Unable to load patients.")}
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        )}
        <PatientTable
          patients={data?.data ?? []}
          meta={data?.meta}
          isLoading={isLoading}
          isFetching={isFetching || isDebouncing}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          sortBy={sortBy}
          sortOrder={sortOrder}
          changeSortBy={changeSortBy}
          changeSortOrder={changeSortOrder}
        />
      </div>
      <PatientFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filterProps}
      />
      <ModalComponent
        title="Add Patient"
        destroyOnClose
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setFormLoading(false);
        }}
        width={640}
        loading={formLoading}
      >
        {createOpen && <PatientForm doctorId={providedDoctorId} onLoadingChange={setFormLoading} />}
      </ModalComponent>
    </section>
  );
}

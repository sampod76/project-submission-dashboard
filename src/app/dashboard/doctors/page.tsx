"use client";

import DoctorHeader from "@/components/doctor/doctor-header";
import DoctorFilters from "@/components/doctor/doctor-filters";
import DoctorFilterDrawer from "@/components/doctor/doctor-filter-drawer";
import DoctorTable from "@/components/doctor/doctor-table";
import { useDebounced } from "@/hooks/use-debounce";
import { useGetDoctorsQuery } from "@/redux/features/doctor/doctorApi";
import {
  DOCTOR_SORT_FIELDS,
  SPECIALIZATION,
  type DoctorSortBy,
  type DoctorSortOrder,
  type DoctorsQueryParams,
} from "@/types/doctor";
import { apiErrorMessage } from "@/utils/api-error";
import { ErrorAlert } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ErrorBounderCom from "@/components/shared/ErrorBounder";

export default function DoctorsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const [specialization, setSpecialization] = useState<SPECIALIZATION>();
  const [isActive, setIsActive] = useState<boolean>();
  const [sortBy, setSortBy] = useState<DoctorSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<DoctorSortOrder>("desc");
  const debouncedSearch = useDebounced({ searchQuery: searchTerm, delay: 350 });

  const params: DoctorsQueryParams = { page, limit, sortBy, sortOrder };

  if (searchTerm.trim() && debouncedSearch.trim()) params.searchTerm = debouncedSearch.trim();

  if (specialization !== undefined) params.specialization = specialization;
  if (isActive !== undefined) params.isActive = isActive;
  const isDebouncing = Boolean(searchTerm.trim()) && searchTerm !== debouncedSearch;
  const {
    currentData: data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetDoctorsQuery(params, {
    skip: isDebouncing,
  });

  const changeSortBy = (field: string) => {
    if (DOCTOR_SORT_FIELDS.some((value) => value === field)) {
      setSortBy(field as DoctorSortBy);
      if (field !== sortBy) setPage(1);
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

    setSpecialization(undefined);
    setIsActive(undefined);
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const filterProps = {
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
  };

  return (
    <ErrorBounderCom>
      <div className="min-h-screen bg-transparent p-2 sm:p-6">
        <DoctorHeader filterOpen={filterOpen} onOpenFilters={() => setFilterOpen(true)} />
        <div className="space-y-2 sm:space-y-4">
          <DoctorFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} {...filterProps} />
          {error && !isDebouncing && (
            <ErrorAlert
              message={apiErrorMessage(error, "Unable to load doctors.")}
              action={
                <Button variant="secondary" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          )}

          <DoctorTable
            doctors={data?.data ?? []}
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
        <DoctorFilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={filterProps}
        />
        <div className="mt-4 text-xs text-gray-400">
          Sort: {sortBy} / {sortOrder}
        </div>
      </div>
    </ErrorBounderCom>
  );
}

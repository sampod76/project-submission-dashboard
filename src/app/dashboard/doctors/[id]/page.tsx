"use client";

import PatientManagement from "@/components/patient/patient-management";
import DoctorProfileCard from "@/components/doctor/doctor-profile-card";
import { useGetDoctorByIdQuery } from "@/redux/features/doctor/doctorApi";
import { apiErrorMessage } from "@/utils/api-error";
import { ArrowLeft } from "lucide-react";
import { ErrorAlert } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/shared/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { MissingRecord } from "@/components/shared/feedback";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DoctorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const {
    currentData: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetDoctorByIdQuery(id);
  const notFound =
    (error && "status" in error && error.status === 404) ||
    response?.statusCode === 404 ||
    (!error && !isFetching && response?.success && !response.data);
  return (
    <div className="doctor-details-page min-w-0 p-2 sm:p-6">
      <style jsx global>{`
        .dashboard-content:has(.doctor-details-page) {
          overflow: clip !important;
        }
      `}</style>
      <header className="mb-6">
        <Link
          href="/dashboard/doctors"
          className="inline-flex items-center gap-2 text-sm text-orange-600"
        >
          <ArrowLeft /> Doctors
        </Link>
      </header>
      <div className="grid min-w-0 gap-6">
        <div className="min-w-0">
          {isLoading || (isFetching && !response) ? (
            <div
              aria-label="Loading doctor profile"
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <Skeleton className="mb-4 h-20 w-20 rounded-full" />
              <ContentSkeleton rows={8} />
            </div>
          ) : notFound ? (
            <MissingRecord
              title="Doctor not found"
              description="The doctor may have been removed or is unavailable."
              action={<Link href="/dashboard/doctors">Back to Doctors</Link>}
            />
          ) : error || !response?.success ? (
            <ErrorAlert
              message={apiErrorMessage(
                error,
                response?.message || "Unable to load doctor profile.",
              )}
              action={
                <Button variant="secondary" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          ) : response.data ? (
            <DoctorProfileCard doctor={response.data} />
          ) : null}
        </div>
        {response?.success && response.data && !notFound && (
          <PatientManagement key={id} doctorId={id} />
        )}
      </div>
    </div>
  );
}

"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ErrorAlert } from "@/components/shared/feedback";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/shared/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import DataTable from "@/components/ui/data-table";
import { BriefcaseMedical, Users, CalendarDays, CircleCheck } from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import { useGetDoctorsQuery } from "@/redux/features/doctor/doctorApi";
import { useGetDashboardOverviewQuery } from "@/redux/features/dashboard/dashboardApi";
import { useGetPatientsQuery } from "@/redux/features/patient/patientApi";
import { TREATMENT_STATUS, type TPatient } from "@/types/patient";
import type { TDoctor } from "@/types/doctor";
import { apiErrorMessage } from "@/utils/api-error";
import {
  formatDate,
  formatEnumLabel,
  renderDoctorRelationTooltip,
} from "@/components/patient/patient-table-columns";
import {
  PatientOverviewChart,
  PatientsPerDoctorChart,
  TreatmentStatusChart,
} from "./dashboard-charts";

const recentParams = { page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" } as const;
const panelClass = "min-w-0 rounded-2xl border border-white bg-white/95 p-5 shadow-sm";

function Panel({
  title,
  detail,
  action,
  children,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={panelClass}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function QueryError({ error, retry }: { error: unknown; retry: () => unknown }) {
  return (
    <ErrorAlert
      message={apiErrorMessage(error, "Unable to load dashboard data.")}
      action={
        <Button variant="secondary" size="sm" onClick={() => retry()}>
          Retry
        </Button>
      }
    />
  );
}
function Person({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <UserAvatar size={28} className="shrink-0 bg-blue-50 text-blue-600">
        {name.charAt(0).toUpperCase()}
      </UserAvatar>
      <span className="font-medium text-slate-700">{name}</span>
    </span>
  );
}

export default function DashboardOverview() {
  const user = useAppSelector((state) => state.auth.user);
  const doctors = useGetDoctorsQuery(recentParams);
  const patients = useGetPatientsQuery(recentParams);
  const dashboard = useGetDashboardOverviewQuery();
  const dashboardData = dashboard.data?.data;
  const analyticsInitialLoading = dashboard.isFetching && !dashboard.data;
  const treatmentStatusColors: Record<string, string> = {
    Active: "#3b82f6",
    "Under observation": "#fbbf24",
    Recovered: "#10b981",
  };
  const treatmentStatusData =
    dashboardData?.treatmentStatus.map((item) => ({
      ...item,
      color: treatmentStatusColors[item.name] ?? "#94a3b8",
    })) ?? [];
  const stats = [
    {
      title: "Total Doctors",
      query: doctors,
      value: doctors.data?.meta.total,
      icon: <BriefcaseMedical />,
      accent: "bg-sky-100 text-sky-500",
      detail: "All registered doctors",
    },
    {
      title: "Total Patients",
      query: patients,
      value: patients.data?.meta.total,
      icon: <Users />,
      accent: "bg-emerald-100 text-emerald-500",
      detail: "All registered patients",
    },
    {
      title: "Follow-ups",
      query: dashboard,
      value: dashboardData?.totalFollowUps,
      icon: <CalendarDays />,
      accent: "bg-violet-100 text-violet-500",
      detail: "Total follow-ups",
    },
    {
      title: "Active Doctors",
      query: dashboard,
      value: dashboardData?.activeDoctors,
      icon: <CircleCheck />,
      accent: "bg-amber-100 text-amber-500",
      detail: "Currently active accounts",
    },
  ];
  const doctorRows = doctors.data?.data ?? [];
  const patientRows = patients.data?.data ?? [];
  return (
    <div className="relative min-h-full">
      <div className="min-h-full space-y-5 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              {user?.name ? `Welcome back, ${user.name}!` : "Welcome back!"} Here&apos;s an overview
              of your doctor and patient management system.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ title, query, value, icon, accent, detail }) => (
            <section key={title} className={`${panelClass} flex items-center gap-4`}>
              <span
                className={`${accent} flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl`}
              >
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm text-slate-600">{title}</h2>
                {query.isFetching && !query.data ? (
                  <Skeleton className="my-2 h-6 w-36 max-w-full" />
                ) : (
                  <p className="my-1 text-3xl font-bold text-slate-900">
                    {query.error && !query.data ? "—" : (value?.toLocaleString() ?? "—")}
                  </p>
                )}
                <p className="text-xs text-slate-500">{detail}</p>
                {query.error && (
                  <Button size="sm" variant="link" onClick={() => query.refetch()}>
                    Retry
                  </Button>
                )}
              </div>
            </section>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Panel title="Patients Overview" detail="Last 6 months">
            <div className="h-64 min-w-0">
              {dashboard.error && !dashboard.data ? (
                <QueryError error={dashboard.error} retry={dashboard.refetch} />
              ) : analyticsInitialLoading ? (
                <ContentSkeleton />
              ) : (
                <PatientOverviewChart data={dashboardData?.patientsOverview ?? []} />
              )}
            </div>
          </Panel>
          <Panel title="Patients per Doctor" detail="Live patient counts per doctor">
            <div className="h-64 min-w-0">
              {dashboard.error && !dashboard.data ? (
                <QueryError error={dashboard.error} retry={dashboard.refetch} />
              ) : analyticsInitialLoading ? (
                <ContentSkeleton />
              ) : (
                <PatientsPerDoctorChart data={dashboardData?.patientsPerDoctor ?? []} />
              )}
            </div>
          </Panel>
          <Panel title="Treatment Status" detail="Live patient totals · all time">
            <div className="h-80 min-w-0 sm:h-64 xl:h-80 2xl:h-64">
              {dashboard.error && !dashboard.data ? (
                <QueryError error={dashboard.error} retry={dashboard.refetch} />
              ) : analyticsInitialLoading ? (
                <ContentSkeleton />
              ) : (
                <TreatmentStatusChart data={treatmentStatusData} />
              )}
            </div>
          </Panel>
        </div>
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <Panel
            title="Recent Doctors"
            action={
              <Link
                href="/dashboard/doctors"
                className="shrink-0 text-xs font-medium text-blue-600"
              >
                View All →
              </Link>
            }
          >
            {doctors.error && !doctors.data ? (
              <QueryError error={doctors.error} retry={doctors.refetch} />
            ) : (
              <DataTable<TDoctor>
                pagination={false}
                isFetching={doctors.isFetching}
                data={doctorRows}
                minWidth={620}
                columns={[
                  {
                    header: "Name",
                    accessorKey: "name",
                    size: 180,
                    cell: ({ row: { original: doctor } }) => (
                      <Link href={`/dashboard/doctors/${doctor._id}`}>
                        <Hint
                          content={
                            doctor.medicalRegistrationNo?.trim()
                              ? "Med. Reg. No: " + doctor.medicalRegistrationNo.trim()
                              : undefined
                          }
                        >
                          <span>
                            <Person name={doctor.name} />
                          </span>
                        </Hint>
                      </Link>
                    ),
                  },
                  {
                    header: "Specialization",
                    accessorKey: "specialization",
                    cell: ({ row }) => formatEnumLabel(row.original.specialization),
                  },
                  { header: "Hospital", accessorKey: "hospital" },
                  { header: "Patients", accessorKey: "patientsCount", size: 80 },
                  {
                    header: "Status",
                    accessorKey: "isActive",
                    size: 90,
                    cell: ({ row }) => (
                      <Badge variant={row.original.isActive ? "green" : "red"}>
                        {row.original.isActive ? "Active" : "Inactive"}
                      </Badge>
                    ),
                  },
                ]}
              />
            )}
          </Panel>
          <Panel
            title="Recent Patients"
            action={
              <Link
                href="/dashboard/patients"
                className="shrink-0 text-xs font-medium text-blue-600"
              >
                View All →
              </Link>
            }
          >
            {patients.error && !patients.data ? (
              <QueryError error={patients.error} retry={patients.refetch} />
            ) : (
              <DataTable<TPatient>
                pagination={false}
                isFetching={patients.isFetching}
                data={patientRows}
                minWidth={600}
                columns={[
                  {
                    header: "Name",
                    accessorKey: "name",
                    size: 180,
                    cell: ({ row }) => <Person name={row.original.name} />,
                  },
                  { header: "Age", accessorKey: "age", size: 60 },
                  {
                    header: "Doctor",
                    accessorKey: "doctorId",
                    size: 170,
                    cell: ({ row: { original: patient } }) => {
                      const id = patient.doctorId;
                      const doctor =
                        patient.doctor?.[0] ?? doctorRows.find((item) => item._id === id);
                      return (
                        <Link href={`/dashboard/doctors/${id}`} title={id}>
                          {doctor ? (
                            <Hint content={renderDoctorRelationTooltip(doctor)}>
                              <span>{doctor.name || "—"}</span>
                            </Hint>
                          ) : (
                            "View doctor"
                          )}
                        </Link>
                      );
                    },
                  },
                  {
                    header: "Treatment Status",
                    accessorKey: "treatmentStatus",
                    cell: ({ row }) => (
                      <Badge
                        variant={
                          row.original.treatmentStatus === TREATMENT_STATUS.RECOVERED
                            ? "green"
                            : row.original.treatmentStatus === TREATMENT_STATUS.ACTIVE
                              ? "cyan"
                              : "orange"
                        }
                      >
                        {formatEnumLabel(row.original.treatmentStatus)}
                      </Badge>
                    ),
                  },
                  {
                    header: "Follow-up",
                    accessorKey: "followUpDate",
                    size: 110,
                    cell: ({ row }) => formatDate(row.original.followUpDate),
                  },
                ]}
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

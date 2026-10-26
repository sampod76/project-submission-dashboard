"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ErrorAlert } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { ContentSkeleton } from "@/components/shared/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MissingRecord } from "@/components/shared/feedback";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Trash2,
  Pencil,
  MapPin,
  ExternalLink,
  FileText,
  Heart,
  Mail,
  BriefcaseMedical,
  Phone,
  ShieldCheck,
  RefreshCw,
  User,
  Hospital,
  MessageSquare,
} from "lucide-react";
import { useGetPatientByIdQuery } from "@/redux/features/patient/patientApi";
import { apiErrorMessage } from "@/utils/api-error";
import { formatDate, formatEnumLabel } from "@/components/patient/patient-table-columns";
import { specializationLabel } from "@/components/doctor/doctor-table-columns";
import PatientForm from "@/components/patient/patient-form";
import ModalComponent from "@/components/ui/modal";
import { usePatientColumns } from "@/components/patient/patient-table-columns";

function Section({
  title,
  icon,
  children,
  green = false,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  green?: boolean;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-blue-100 bg-white/90 p-3 sm:p-4">
      <h2
        className={`mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-slate-900 ${green ? "bg-emerald-50" : "bg-blue-50"}`}
      >
        <span className={`text-xl ${green ? "text-emerald-600" : "text-blue-600"}`}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
function Row({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[22px_minmax(0,1fr)] items-start gap-x-3 border-b border-slate-100 px-2 py-2.5 text-sm last:border-0 sm:grid-cols-[22px_minmax(110px,0.8fr)_minmax(0,1.6fr)]">
      <span className="text-lg text-slate-500">{icon}</span>
      <span className="text-slate-500">{label}</span>
      <div className="col-start-2 min-w-0 whitespace-pre-wrap break-words text-slate-900 [overflow-wrap:anywhere] sm:col-start-auto">
        {value ?? "—"}
      </div>
    </div>
  );
}
function dateTime(value?: string | null) {
  if (!value || formatDate(value) === "—") return "—";
  return `${formatDate(value)} • ${new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
const text = (value?: string | null) => value?.trim() || "—";
const initials = (value?: string) =>
  value
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "—";

export default function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const validId = /^[a-f\d]{24}$/i.test(id);
  const {
    currentData: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPatientByIdQuery(id, { skip: !validId });
  const { isDeleting, handleDeleteConfirm, confirmation } = usePatientColumns({
    onEdit: () => setEditOpen(true),
    onDeleted: () => router.push("/dashboard/patients"),
  });
  const notFound =
    !validId ||
    (error && "status" in error && error.status === 404) ||
    response?.statusCode === 404 ||
    (!error && !isFetching && response?.success && !response.data);
  const patient = response?.data;
  const doctor = patient?.doctor;
  const status = patient?.treatmentStatus ? formatEnumLabel(patient.treatmentStatus) : "—";
  const statusColor =
    patient?.treatmentStatus === "RECOVERED"
      ? "green"
      : patient?.treatmentStatus === "UNDER_OBSERVATION"
        ? "orange"
        : "blue";
  return (
    <div className="min-w-0 space-y-4 p-3 sm:p-6 [.dashboard-content:has(&)]:!overflow-clip">
      {confirmation}
      <header className="mb-6">
        <Link
          href="/dashboard/patients"
          className="inline-flex items-center gap-2 text-sm text-orange-600"
        >
          <ArrowLeft /> Patients
        </Link>
      </header>
      {isLoading || (isFetching && !response) ? (
        <div
          aria-label="Loading patient details"
          className="rounded-xl border border-blue-100 bg-white p-6"
        >
          <Skeleton className="mb-4 h-20 w-20 rounded-full" />
          <ContentSkeleton rows={10} />
        </div>
      ) : notFound ? (
        <MissingRecord
          title="Patient not found"
          description="The patient may have been removed or is unavailable."
          action={<Link href="/dashboard/patients">Back to Patients</Link>}
        />
      ) : error || !response?.success ? (
        <ErrorAlert
          message={apiErrorMessage(error, response?.message || "Unable to load patient details.")}
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : patient ? (
        <>
          <header className="flex min-w-0 flex-col gap-5 rounded-xl border border-blue-100 bg-white/90 p-4 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700 sm:h-20 sm:w-20">
                {initials(patient.name)}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="break-words text-2xl font-semibold text-slate-900">
                    {text(patient.name)}
                  </h1>
                  <Badge
                    className={
                      statusColor === "blue"
                        ? "[&&]:!rounded-lg [&&]:!border-blue-100 [&&]:!bg-blue-100 [&&]:!text-blue-600"
                        : "[&&]:!rounded-lg"
                    }
                    variant={statusColor}
                  >
                    {status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span>{patient.age != null ? `${patient.age} years` : "—"}</span>
                  <span>•</span>
                  <span>{patient.gender ? formatEnumLabel(patient.gender) : "—"}</span>
                  <span>•</span>
                  <span>
                    <Phone className="mr-2" />
                    {text(patient.phone)}
                  </span>
                </div>
                <p className="break-words text-sm text-slate-500">
                  <MapPin className="mr-2" />
                  {text(patient.address)}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Link href="/dashboard/patients">
                  <Button variant="secondary">
                    <ArrowLeft />
                    Back
                  </Button>
                </Link>
                <Button variant="default" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Edit Patient
                </Button>
                <Button
                  className="[&&]:!border-red-500 [&&]:!bg-red-500 [&&]:hover:!bg-red-600"
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={() => handleDeleteConfirm(patient)}
                >
                  <Trash2 />
                  Delete Patient
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <CalendarDays className="rounded-lg bg-blue-50 p-3 text-xl text-blue-600" />
                  <div>
                    <p className="text-slate-500">Last Visit</p>
                    <p className="text-slate-900">{dateTime(patient.lastVisitAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="rounded-lg bg-purple-50 p-3 text-xl text-purple-600" />
                  <div>
                    <p className="text-slate-500">Follow Up</p>
                    <p className="text-slate-900">{dateTime(patient.followUpDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="Patient Information" icon={<User />}>
              <Row icon={<User />} label="Full Name" value={text(patient.name)} />
              <Row icon={<Phone />} label="Phone" value={text(patient.phone)} />
              <Row
                icon={<CalendarDays />}
                label="Age"
                value={patient.age != null ? `${patient.age} years` : "—"}
              />
              <Row
                icon={<User />}
                label="Gender"
                value={
                  patient.gender ? (
                    <Badge
                      className="[&&]:!rounded-lg [&&]:!border-blue-100 [&&]:!bg-blue-100 [&&]:!text-blue-600"
                      variant="blue"
                    >
                      {formatEnumLabel(patient.gender)}
                    </Badge>
                  ) : (
                    "—"
                  )
                }
              />
              <Row icon={<MapPin />} label="Address" value={text(patient.address)} />
            </Section>
            <Section title="Medical Information" icon={<FileText />}>
              <Row
                icon={<BriefcaseMedical />}
                label="Patient Complaint"
                value={text(patient.patientComplaint)}
              />
              <Row
                icon={<MessageSquare />}
                label="Doctor Advice"
                value={text(patient.doctorAdvice)}
              />
              <Row icon={<FileText />} label="Notes" value={text(patient.notes)} />
            </Section>
            <Section title="Treatment Information" icon={<Heart />} green>
              <Row
                icon={<Heart />}
                label="Treatment Status"
                value={
                  <Badge
                    className={
                      statusColor === "blue"
                        ? "[&&]:!rounded-lg [&&]:!border-blue-100 [&&]:!bg-blue-100 [&&]:!text-blue-600"
                        : "[&&]:!rounded-lg"
                    }
                    variant={statusColor}
                  >
                    {status}
                  </Badge>
                }
              />
              <Row
                icon={<CalendarDays />}
                label="Last Visit At"
                value={dateTime(patient.lastVisitAt)}
              />
              <Row
                icon={<CalendarDays />}
                label="Follow Up Date"
                value={dateTime(patient.followUpDate)}
              />
              <Row icon={<Clock />} label="Created At" value={dateTime(patient.createdAt)} />
              <Row icon={<RefreshCw />} label="Updated At" value={dateTime(patient.updatedAt)} />
            </Section>
            <Section title="Assigned Doctor" icon={<User />}>
              {doctor ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-2 py-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
                      {initials(doctor.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        className="break-words text-lg font-semibold text-slate-900 hover:text-blue-600"
                        href={`/dashboard/doctors/${encodeURIComponent(doctor._id)}`}
                      >
                        {text(doctor.name)} <ExternalLink className="text-sm text-blue-500" />
                      </Link>
                      <div>
                        <Badge variant={doctor.isActive ? "green" : "red"}>
                          {doctor.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <Link href={`/dashboard/doctors/${encodeURIComponent(doctor._id)}`}>
                      <Button variant="secondary">
                        <ExternalLink />
                        View Doctor Profile
                      </Button>
                    </Link>
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-x-3 sm:grid-cols-2 [&>div>div]:!col-start-2 [&>div]:!grid-cols-[22px_minmax(0,1fr)]">
                    <Row
                      icon={<ShieldCheck />}
                      label="Medical Registration No"
                      value={text(doctor.medicalRegistrationNo)}
                    />
                    <Row icon={<Mail />} label="Email" value={text(doctor.email)} />
                    <Row
                      icon={<BriefcaseMedical />}
                      label="Specialization"
                      value={
                        doctor.specialization ? specializationLabel(doctor.specialization) : "—"
                      }
                    />
                    <Row icon={<Hospital />} label="Hospital" value={text(doctor.hospital)} />
                  </div>
                </>
              ) : (
                <p className="p-4 text-sm text-slate-500">No assigned doctor available.</p>
              )}
            </Section>
          </div>

          <ModalComponent
            title="Edit Patient"
            destroyOnClose
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (!open) setFormLoading(false);
            }}
            width={640}
            loading={formLoading}
          >
            {editOpen && (
              <PatientForm
                key={id}
                patient={patient}
                doctorId={patient.doctor?._id}
                onLoadingChange={setFormLoading}
              />
            )}
          </ModalComponent>
        </>
      ) : null}
    </div>
  );
}

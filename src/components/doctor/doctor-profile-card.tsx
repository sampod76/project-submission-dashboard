import {
  Hospital,
  CalendarDays,
  Mail,
  BriefcaseMedical,
  Phone,
  Users,
  User,
  IdCard,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import type { ReactNode } from "react";
import type { DoctorDetails } from "@/types/doctor";
import { specializationLabel } from "./doctor-table-columns";

function ProfileInfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 border-b border-slate-100 pb-4 last:border-0">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl text-orange-500">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="mb-0 mt-1 break-words text-sm text-slate-800">{value || "�"}</dd>
      </div>
    </div>
  );
}

export default function DoctorProfileCard({ doctor }: { doctor: DoctorDetails }) {
  const initials = doctor.name
    .replace(/^dr\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  const created = new Date(doctor.createdAt);
  const since = Number.isNaN(created.getTime())
    ? "�"
    : created.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <article className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
      <div className="border-b border-slate-100 bg-orange-50/40 px-6 py-7 text-center lg:border-b-0 lg:border-r">
        <UserAvatar
          size={80}
          style={{ backgroundColor: "#ffedd5", color: "#c2410c", fontWeight: 600 }}
        >
          {initials}
        </UserAvatar>
        <h2 className="mb-1 mt-4 break-words text-xl font-semibold text-slate-900">
          <Hint
            content={
              doctor.medicalRegistrationNo?.trim()
                ? "Med. Reg. No: " + doctor.medicalRegistrationNo.trim()
                : undefined
            }
          >
            <span>{doctor.name || "—"}</span>
          </Hint>
        </h2>
        <p className="mb-2 text-sm font-medium text-orange-600">
          {specializationLabel(doctor.specialization)}
        </p>
        <p className="mb-4 break-words text-sm text-slate-500">
          <Hospital /> {doctor.hospital || "�"}
        </p>
        <Badge variant={doctor.isActive ? "green" : "red"}>
          {doctor.isActive ? "Active" : "Inactive"}
        </Badge>
        {typeof doctor.patientsCount === "number" && (
          <div className="mt-5 flex items-center justify-center gap-3 border-t border-slate-200 pt-4">
            <Users className="text-xl text-orange-500" />
            <div className="text-left">
              <div className="text-lg font-semibold text-slate-900">{doctor.patientsCount}</div>
              <div className="text-xs text-slate-500">Total Patients</div>
            </div>
          </div>
        )}
      </div>
      <div className="p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
          <User className="text-3xl text-orange-500" />
          <div>
            <h3 className="m-0 text-xl font-semibold text-slate-900">Doctor Information</h3>
            <p className="mb-0 mt-1 text-sm text-slate-500">
              Basic details and contact information of the doctor.
            </p>
          </div>
        </div>
        <dl className="m-0 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          <ProfileInfoItem
            icon={<IdCard />}
            label="Medical Registration No."
            value={doctor.medicalRegistrationNo?.trim() || "—"}
          />
          <ProfileInfoItem icon={<Mail />} label="Email" value={doctor.email?.trim() || "N/A"} />
          <ProfileInfoItem
            icon={<BriefcaseMedical />}
            label="Specialization"
            value={specializationLabel(doctor.specialization)}
          />
          <ProfileInfoItem icon={<Phone />} label="Phone" value={doctor.phone} />
          <ProfileInfoItem icon={<CalendarDays />} label="Joined Date" value={since} />
          <ProfileInfoItem icon={<Hospital />} label="Hospital" value={doctor.hospital} />
        </dl>
      </div>
    </article>
  );
}

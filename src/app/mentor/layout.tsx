"use client";
import RoleGuard from "@/components/shared/role-guard";
import DashLayout from "@/components/shared/dashboard-layout";
export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard roles={["MENTOR"]}><DashLayout mentor>
    <div className="min-h-[calc(100svh-126px)] bg-slate-50/80"><div className="mx-auto max-w-7xl p-4 sm:p-8">{children}</div></div>
  </DashLayout></RoleGuard>;
}

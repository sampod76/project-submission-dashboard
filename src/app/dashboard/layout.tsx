"use client";

import DashLayout from "@/components/shared/dashboard-layout";
import RoleGuard from "@/components/shared/role-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <DashLayout>
        <div className="min-h-[calc(100vh-80px)] bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat">
          <div className="flow-root min-h-[inherit] bg-white/60">{children}</div>
        </div>
      </DashLayout>
    </RoleGuard>
  );
}

"use client";

import DashLayout from "@/components/shared/dashboard-layout";
import Loader from "@/components/shared/loader";
import { useAppSelector } from "@/redux/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((state) => state.auth.accessToken);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace("/signin");
    }
  }, [token, router]);

  if (!token) {
    return <Loader />;
  }

  return (
    <DashLayout>
      <div className="min-h-[calc(100vh-80px)] bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat">
        <div className="flow-root min-h-[inherit] bg-white/60">{children}</div>
      </div>
    </DashLayout>
  );
}

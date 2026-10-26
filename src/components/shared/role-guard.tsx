"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/hooks";
import { dashboardForRole } from "@/lib/auth-routing";
import type { Role } from "@/types/common.types";
import Loader from "./loader";

export default function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!accessToken || !user) router.replace("/login");
    else if (!roles.includes(user.role)) router.replace(dashboardForRole(user.role));
  }, [accessToken, user, roles, router]);

  if (!accessToken || !user || !roles.includes(user.role)) return <Loader />;

  return children;
}

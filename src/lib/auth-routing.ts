import type { Role } from "@/types/common.types";
export const dashboardForRole = (role?: Role) =>
  role === "STUDENT"
    ? "/student/dashboard"
    : role === "MENTOR"
      ? "/mentor/dashboard"
      : "/dashboard";

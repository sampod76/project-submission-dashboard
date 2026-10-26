import {
  Activity,
  FolderOpen,
  GraduationCap,
  History,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UserCheck,
} from "lucide-react";
import type { SidebarData } from "@/types";

export const adminNavigation: SidebarData[] = [
  {
    title: "Admin workspace",
    key: "admin",
    items: [
      { title: "Dashboard", key: "dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Admin Management", key: "admins", url: "/admin/admins", icon: ShieldCheck },
      { title: "Mentor Management", key: "mentors", url: "/admin/mentors", icon: UserCheck },
      { title: "Student Management", key: "students", url: "/admin/students", icon: GraduationCap },
      { title: "User Management", key: "users", url: "/admin/users", icon: Users },
      {
        title: "Project Submissions",
        key: "submissions",
        url: "/admin/submissions",
        icon: FolderOpen,
      },
      { title: "Review History", key: "reviews", url: "/admin/reviews", icon: History },
      { title: "Audit Logs", key: "audit-logs", url: "/admin/audit-logs", icon: Activity },
      { title: "Profile", key: "profile", url: "/admin/profile", icon: UserRound },
      { title: "Settings", key: "settings", url: "/admin/settings", icon: Settings },
    ].map((item) => ({ ...item, allowedRoles: ["ADMIN"] })),
  },
];

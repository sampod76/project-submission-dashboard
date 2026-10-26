import { LayoutDashboard, FolderOpen, History, Users, Activity, UserRound, Settings } from "lucide-react";
import type { SidebarData } from "@/types";

export const mentorNavigation: SidebarData[] = [{
  title: "Mentor workspace",
  key: "mentor",
  items: [
    { title: "Dashboard", key: "dashboard", url: "/mentor/dashboard", icon: LayoutDashboard },
    { title: "Project Submissions", key: "submissions", url: "/mentor/submissions", icon: FolderOpen },
    { title: "Review History", key: "reviews", url: "/mentor/reviews", icon: History },
    { title: "Student Directory", key: "students", url: "/mentor/students", icon: Users },
    { title: "My Review Activity", key: "audit", url: "/mentor/audit-logs", icon: Activity },
    { title: "Profile", key: "profile", url: "/mentor/profile", icon: UserRound },
    { title: "Settings", key: "settings", url: "/mentor/settings", icon: Settings },
  ].map((item) => ({ ...item, allowedRoles: ["MENTOR"] })),
}];

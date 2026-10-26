import { LayoutDashboard, PlusCircle, FolderOpen, UserRound } from "lucide-react";
import type { SidebarData } from "@/types";
export const studentNavigation: SidebarData[] = [
  {
    title: "Student workspace",
    key: "student",
    items: [
      {
        title: "Dashboard",
        key: "/student/dashboard",
        url: "/student/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Submit Project",
        key: "/student/submissions/new",
        url: "/student/submissions/new",
        icon: PlusCircle,
      },
      {
        title: "My Submissions",
        key: "/student/submissions",
        url: "/student/submissions",
        icon: FolderOpen,
      },
      {
        title: "Settings",
        key: "/student/profile",
        url: "/student/profile",
        icon: UserRound,
      },
    ],
  },
];

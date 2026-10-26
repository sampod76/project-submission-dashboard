import { SidebarData } from "@/types";
import { BriefcaseMedical, LayoutDashboard, IdCard, ClipboardList, Settings } from "lucide-react";

export const sidebarData: SidebarData[] = [
  {
    title: "General",
    key: "General",
    items: [
      {
        title: "Dashboard",
        key: "/dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Doctors",
        key: "/dashboard/doctors",
        url: "/dashboard/doctors",
        icon: BriefcaseMedical,
      },
      {
        title: "Patients",
        key: "/dashboard/patients",
        url: "/dashboard/patients",
        icon: ClipboardList,
      },
      {
        title: "Profile",
        key: "/dashboard/profile",
        url: "/dashboard/profile",
        icon: IdCard,
      },
      {
        title: "Settings",
        key: "/dashboard/settings",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

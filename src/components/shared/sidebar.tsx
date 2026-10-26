"use client";

import { sidebarData } from "@/constants";
import { useAppSelector } from "@/redux/hooks";
import type { SidebarItem as ISidebarItem } from "@/types";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const SIDEBAR_WIDTH = 220;
export const COLLAPSED_SIDEBAR_WIDTH = 80;

interface SidebarProps {
  collapsed: boolean;
  isMobile?: boolean;
  onMenuSelect?: () => void;
}

interface SidebarMenuItem {
  key: string;
  url?: string;
  icon?: ReactNode;
  label: ReactNode;
  children?: SidebarMenuItem[];
}

const buildMenuItems = (items: ISidebarItem[] = [], userRole?: string): SidebarMenuItem[] => {
  return items.flatMap((item) => {
    if (item.allowedRoles?.length && (!userRole || !item.allowedRoles.includes(userRole))) {
      return [];
    }
    const children = item.items?.length ? buildMenuItems(item.items, userRole) : undefined;
    if (item.items?.length && !children?.length) {
      return [];
    }

    return [
      {
        key: item.key,
        url: item.url,
        icon: item.icon ? <item.icon /> : undefined,
        label: item.title,
        ...(children?.length ? { children } : {}),
      },
    ];
  });
};

const normalizeUrl = (url: string) => {
  return url.startsWith("/") ? url : `/${url}`;
};

const flattenMenuItems = (items: SidebarMenuItem[]): SidebarMenuItem[] => {
  return items.flatMap((item) => [item, ...(item.children ? flattenMenuItems(item.children) : [])]);
};

const getSelectedMenuItem = (items: SidebarMenuItem[], pathname: string) => {
  return flattenMenuItems(items)
    .filter((item) => {
      if (!item.url) return false;

      const url = normalizeUrl(item.url);

      if (pathname === url) {
        return true;
      }

      if (url === "/dashboard") {
        return false;
      }

      return pathname.startsWith(`${url}/`);
    })
    .sort((a, b) => {
      const aLength = a.url?.length ?? 0;
      const bLength = b.url?.length ?? 0;

      return bLength - aLength;
    })[0];
};

function SidebarLinks({
  items,
  selectedKey,
  collapsed,
  onMenuSelect,
}: {
  items: SidebarMenuItem[];
  selectedKey?: string;
  collapsed: boolean;
  onMenuSelect?: () => void;
}) {
  return (
    <ul className="space-y-1 px-2">
      {items.map((item) => (
        <li key={item.key}>
          {item.url ? (
            <Link
              href={normalizeUrl(item.url)}
              title={collapsed ? String(item.key).split("/").pop() : undefined}
              aria-current={item.key === selectedKey ? "page" : undefined}
              aria-label={collapsed ? String(item.key).split("/").pop() : undefined}
              onClick={onMenuSelect}
              className={`flex h-10 items-center gap-3 rounded-lg px-4 text-[15px] transition-colors hover:bg-blue-50 hover:text-primary ${item.key === selectedKey ? "bg-[#eaf3ff] font-medium text-primary" : "text-foreground"} ${collapsed ? "justify-center px-0" : ""}`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          ) : (
            <details open={Boolean(item.children?.some((child) => child.key === selectedKey))}>
              <summary className="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-4">
                {item.icon}
                {!collapsed && item.label}
              </summary>
              {item.children && (
                <SidebarLinks
                  items={item.children}
                  selectedKey={selectedKey}
                  collapsed={collapsed}
                  onMenuSelect={onMenuSelect}
                />
              )}
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar({ collapsed, isMobile = false, onMenuSelect }: SidebarProps) {
  const pathname = usePathname();

  const user = useAppSelector((state) => state.auth.user);

  const sidebarGroups = sidebarData
    .map((group) => ({
      ...group,
      menuItems: buildMenuItems(group.items, user?.role),
    }))
    .filter((group) => group.menuItems.length > 0);

  const allMenuItems = sidebarGroups.flatMap((group) => group.menuItems);

  const selectedItem = getSelectedMenuItem(allMenuItems, pathname);

  return (
    <aside
      className="dashboard-sidebar flex flex-col overflow-hidden border-r border-slate-200 bg-white"
      style={{
        height: "100dvh",
        position: isMobile ? "relative" : "fixed",
        width: isMobile ? "100%" : collapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: isMobile ? undefined : 1000,
        transition: "width 0.3s ease",
      }}
    >
      <Link
        href="/dashboard"
        aria-label="Dashboard home"
        onClick={onMenuSelect}
        className="logo flex h-20 shrink-0 items-center justify-center py-4"
        style={{
          background: "var(--color-bg-container, #ffffff)",
          color: "var(--color-text-base)",
          transition: "all 0.3s ease",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white shadow-sm">
          <Image
            src="/icon.svg"
            alt="Project Submission Dashboard"
            width={34}
            height={34}
            priority
            className="h-[34px] w-[34px] object-contain"
          />
        </div>
      </Link>

      <div
        className="custom-sidebar-scroll"
        style={{
          padding: "5px 0",
          height: "calc(100vh - 80px)",
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0, 0, 0, 0.2) transparent",
        }}
      >
        {sidebarGroups.map((group, index) => (
          <div key={group.key || index} style={{ marginBottom: 12 }}>
            <SidebarLinks
              items={group.menuItems}
              selectedKey={selectedItem?.key}
              collapsed={collapsed}
              onMenuSelect={onMenuSelect}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}

"use client";

import AppHeader from "@/components/shared/header";
import Sidebar, { COLLAPSED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from "@/components/shared/sidebar";
import { useMobile } from "@/hooks/use-mobile";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobile = useMobile();
  const pathname = usePathname();

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setMobileOpen(false);
  }, [isMobile, pathname]);

  return (
    <div className="dashboard-layout" style={{ minHeight: "100vh", overflowX: "clip" }}>
      {isMobile ? (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            aria-describedby={undefined}
            className="w-[min(200px,calc(100vw-24px))] p-0"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar collapsed={false} isMobile onMenuSelect={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar collapsed={collapsed} onMenuSelect={() => setMobileOpen(false)} />
      )}
      <div
        className="dashboard-main"
        style={{
          marginLeft: isMobile ? 0 : collapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
          minWidth: 0,
          transition: "margin-left 0.3s ease",
        }}
      >
        <AppHeader
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          pageTitle={"Project Submission Dashboard"}
        />
        <main
          className="dashboard-content"
          style={{
            padding: 0,
            minHeight: 280,
            overflow: "hidden",
          }}
        >
          <p className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-sm text-slate-600">
            Legacy Doctor/Patient functionality. Project Submission features and backend integration
            are planned for Phase 2.
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}

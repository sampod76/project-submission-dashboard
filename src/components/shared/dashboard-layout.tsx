"use client";

import AppHeader from "@/components/shared/header";
import Sidebar, { COLLAPSED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from "@/components/shared/sidebar";
import { useMobile } from "@/hooks/use-mobile";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashLayout({
  children,
  student = false,
  mentor = false,
}: {
  children: React.ReactNode;
  student?: boolean;
  mentor?: boolean;
}) {
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
            className="w-[min(260px,calc(100vw-24px))] p-0"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar
              student={student}
              mentor={mentor}
              collapsed={false}
              isMobile
              onMenuSelect={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar
          student={student}
          mentor={mentor}
          collapsed={collapsed}
          onMenuSelect={() => setMobileOpen(false)}
        />
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
          pageTitle={student ? "Student workspace" : mentor ? "Mentor workspace" : "Project Submission Dashboard"}
        />
        <main
          className="dashboard-content"
          style={{
            padding: 0,
            minHeight: 280,
            overflow: "hidden",
          }}
        >
          {student || mentor ? (
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-3 text-sm text-muted-foreground sm:px-8"
            >
              <Link className="hover:text-primary" href={mentor ? "/mentor/dashboard" : "/student/dashboard"}>
                {mentor ? "Mentor" : "Student"}
              </Link>
              {pathname
                .split("/")
                .slice(2)
                .map((part, index, parts) => (
                  <span key={index} className="flex items-center gap-2">
                    <span aria-hidden="true">/</span>
                    {index === parts.length - 1 ? (
                      <span aria-current="page">
                        {part === "new"
                          ? "Submit Project"
                          : /^[0-9a-f-]{36}$/i.test(part)
                            ? "Details"
                            : part.charAt(0).toUpperCase() + part.slice(1)}
                      </span>
                    ) : (
                      <Link href={`/${mentor ? "mentor" : "student"}/${parts.slice(0, index + 1).join("/")}`}>
                        {part.charAt(0).toUpperCase() + part.slice(1)}
                      </Link>
                    )}
                  </span>
                ))}
            </nav>
          ) : (
            <p className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-sm text-slate-600">
              Legacy Doctor/Patient functionality. Project Submission features and backend
              integration are planned for Phase 2.
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

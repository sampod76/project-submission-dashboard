"use client";
import { useMobile } from "@/hooks/use-mobile";
import useAuth from "@/hooks/useAuth";
import { ChevronDown, Pencil, LogOut, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
interface HeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  pageTitle?: string;
}
export default function AppHeader({
  collapsed,
  setCollapsed,
  mobileOpen = false,
  setMobileOpen,
  pageTitle = "Dashboard",
}: HeaderProps) {
  const router = useRouter();
  const isMobile = useMobile();
  const { user, logout, isLoggingOut } = useAuth();
  const profileUrl = user?.role === "STUDENT" ? "/student/profile" : user?.role === "MENTOR" ? "/mentor/profile" : "/dashboard/profile";
  const displayName = user?.name || user?.email || "User";
  const displayRole = user?.role || "User";
  async function handleLogout() {
    await logout();
  }
  return (
    <header className="dashboard-header sticky top-0 z-[999] flex h-20 items-center justify-between border-b border-slate-200/70">
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          aria-label={isMobile ? "Open sidebar" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={isMobile ? mobileOpen : !collapsed}
          onClick={() => {
            if (isMobile) setMobileOpen?.(!mobileOpen);
            else setCollapsed(!collapsed);
          }}
          className="h-20 w-16 text-base text-black/65"
        >
          {(isMobile ? !mobileOpen : collapsed) ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
        <h1 className="mt-2 hidden text-xl font-semibold text-gray-800 md:block">{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-3 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open user menu"
              className="flex h-9 min-w-0 cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-[5px]"
            >
              <UserAvatar
                icon={<User />}
                size={32}
                className="bg-gray-200 text-white"
                style={{ marginRight: !isMobile ? 8 : 0, border: "2px solid #322FE3" }}
              />
              {!isMobile && (
                <>
                  <span className="mr-1 flex flex-col text-left leading-tight">
                    <span className="max-w-48 truncate text-sm font-medium text-black/85">
                      {displayName}
                    </span>
                    <span className="text-xs text-black/50">{displayRole}</span>
                  </span>
                  <ChevronDown className="text-[10px] text-black/50" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push(profileUrl)}>
              <User className="mr-2 h-4 w-4" />
              {displayName}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                router.push(
                  user?.role === "STUDENT" ? "/student/profile#password" : user?.role === "MENTOR" ? "/mentor/settings" : "/dashboard/settings",
                )
              }
            >
              <Pencil className="mr-2 h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isLoggingOut} onSelect={() => void handleLogout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

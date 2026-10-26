"use client";

import useAuth from "@/hooks/useAuth";
import RouteState from "@/components/shared/route-state";

import { Button } from "@/components/ui/button";
import { dashboardForRole } from "@/lib/auth-routing";

export default function ForbiddenPage() {
  const { user, logout, isLoggingOut } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <RouteState
      statusCode="403"
      title="Access Denied"
      description="You don't have permission to access this page. Return to your dashboard or sign out to use another account."
      homeHref={dashboardForRole(user?.role)}
      homeLabel="Go to Dashboard"
    >
      <Button onClick={handleLogout} loading={isLoggingOut} variant="outline" size="lg">
        Logout
      </Button>
    </RouteState>
  );
}

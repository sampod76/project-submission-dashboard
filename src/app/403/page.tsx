"use client";
import { toast } from "sonner";

import useAuth from "@/hooks/useAuth";
import RouteState from "@/components/shared/route-state";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    toast.success("Logged out successfully");
  }

  return (
    <RouteState
      statusCode="403"
      title="Access Denied"
      description="You don't have permission to access this page. Return to your dashboard or sign out to use another account."
      homeHref="/dashboard"
      homeLabel="Go to Dashboard"
    >
      <Button onClick={handleLogout} variant="outline" size="lg">
        Logout
      </Button>
    </RouteState>
  );
}

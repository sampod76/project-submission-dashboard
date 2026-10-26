"use client";
import RouteState, { type RouteErrorProps } from "@/components/shared/route-state";
export default function Error({ reset }: RouteErrorProps) {
  return (
    <RouteState
      variant="dashboard"
      title="Unable to load this page"
      description="Something went wrong while loading the dashboard content. Please try again."
      homeHref="/dashboard"
      homeLabel="Dashboard Home"
      reset={reset}
    />
  );
}

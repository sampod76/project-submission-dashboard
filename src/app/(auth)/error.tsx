"use client";
import RouteState, { type RouteErrorProps } from "@/components/shared/route-state";
export default function Error({ reset }: RouteErrorProps) {
  return (
    <RouteState
      variant="auth"
      title="Unable to load the sign-in page"
      description="Something went wrong. Please try again or return to sign in."
      homeHref="/signin"
      homeLabel="Go to Sign In"
      reset={reset}
    />
  );
}

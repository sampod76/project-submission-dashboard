"use client";
import RouteState, { type RouteErrorProps } from "@/components/shared/route-state";
export default function Error({ reset }: RouteErrorProps) {
  return (
    <RouteState
      variant="global"
      title="Something went wrong"
      description="We couldn't load this page. Please try again or return home."
      homeHref="/"
      homeLabel="Home"
      reset={reset}
    />
  );
}

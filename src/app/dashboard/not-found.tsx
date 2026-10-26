import RouteState from "@/components/shared/route-state";
export default function NotFound() {
  return (
    <RouteState
      variant="dashboard"
      statusCode="404"
      title="Page not found"
      description="This dashboard page doesn't exist. Check the address or return to your dashboard."
      homeHref="/dashboard"
      homeLabel="Dashboard Home"
    />
  );
}

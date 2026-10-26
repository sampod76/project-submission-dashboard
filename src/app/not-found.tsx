import RouteState from "@/components/shared/route-state";
export default function NotFound() {
  return (
    <RouteState
      variant="global"
      statusCode="404"
      title="Page not found"
      description="The page you're looking for doesn't exist. Check the address or return home to continue."
      homeHref="/"
      homeLabel="Home"
    />
  );
}

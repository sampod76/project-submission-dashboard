import RouteState from "@/components/shared/route-state";
export default function NotFound() {
  return (
    <RouteState
      variant="auth"
      statusCode="404"
      title="Page not found"
      description="This sign-in page doesn't exist. Return to sign in to access Doctor Tracker."
      homeHref="/signin"
      homeLabel="Go to Sign In"
    />
  );
}

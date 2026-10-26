import Loader from "@/components/shared/loader";
export default function Loading() {
  return (
    <div role="status" aria-label="Loading page">
      <Loader />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}

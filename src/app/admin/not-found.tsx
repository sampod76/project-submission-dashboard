import Link from "next/link";
import { MissingRecord } from "@/components/shared/feedback";
export default function AdminNotFound() {
  return (
    <MissingRecord
      title="Page not found"
      description="This Admin page is unavailable."
      action={<Link href="/admin/dashboard">Return to dashboard</Link>}
    />
  );
}

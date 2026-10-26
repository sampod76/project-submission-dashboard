import Link from "next/link";
import { MissingRecord } from "@/components/shared/feedback";
export default function MentorNotFound() {
  return (
    <MissingRecord
      title="Page not found"
      description="This Mentor page is unavailable."
      action={<Link href="/mentor/dashboard">Return to dashboard</Link>}
    />
  );
}

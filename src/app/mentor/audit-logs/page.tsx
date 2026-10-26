import { Suspense } from "react";
import AuditActivity from "@/components/mentor/audit-activity";
import { ContentSkeleton } from "@/components/shared/feedback";
export default function AuditLogsPage() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <AuditActivity />
    </Suspense>
  );
}
